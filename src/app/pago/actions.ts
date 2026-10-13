"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/identity";
import { payphoneBoxEnabled, toCents, amountBreakdown, newClientTxId } from "@/lib/payphone-box";

export interface BoxParams {
  token: string;
  storeId: string;
  clientTransactionId: string;
  amount: number;
  amountWithoutTax: number;
  amountWithTax: number;
  tax: number;
  reference: string;
  email: string;
}

export type StartResult = { ok: true; box: BoxParams } | { ok: false; error: string };

function params(clientTransactionId: string, cents: number, reference: string, email: string): BoxParams {
  return {
    token: process.env.PAYPHONE_TOKEN!.trim(),
    storeId: process.env.PAYPHONE_STORE_ID!.trim(),
    clientTransactionId,
    ...amountBreakdown(cents),
    reference: reference.slice(0, 100),
    email,
  };
}

/** Prepara el pago de un pedido del cliente. Cada carga de la cajita es un intento nuevo. */
export async function startOrderPayment(orderId: string): Promise<StartResult> {
  if (!payphoneBoxEnabled()) return { ok: false, error: "El pago con tarjeta todavía no está activo." };
  const profile = await getCurrentProfile();
  if (profile?.role !== "user") return { ok: false, error: "Acceso no autorizado" };
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("id, code, price, status, product_snapshot")
    .eq("id", orderId)
    .eq("buyer_id", profile.userId)
    .maybeSingle();
  if (!o) return { ok: false, error: "Pedido no encontrado" };
  if (!["pending_payment", "payment_reported"].includes(o.status)) return { ok: false, error: "Este pedido ya no está pendiente de pago." };

  const cents = toCents(o.price);
  const tx = newClientTxId(o.code);
  const { error } = await createAdminClient().from("payphone_payments").insert({
    client_tx_id: tx, kind: "order", order_id: o.id, user_id: profile.userId, amount_cents: cents,
  });
  if (error) return { ok: false, error: "No se pudo preparar el pago. Intenta de nuevo." };
  const product = o.product_snapshot as { name: string };
  return { ok: true, box: params(tx, cents, `Pedido ${o.code} · ${product.name}`, profile.email) };
}

/** Prepara el pago de un plan de cupos de la empresa. */
export async function startQuotaPayment(planKey: string): Promise<StartResult> {
  if (!payphoneBoxEnabled()) return { ok: false, error: "El pago con tarjeta todavía no está activo." };
  const profile = await getCurrentProfile();
  if (profile?.role !== "company" || !profile.companyId) return { ok: false, error: "Acceso no autorizado" };
  const supabase = await createClient();
  const [{ data: company }, { data: plan }] = await Promise.all([
    supabase.from("companies").select("id, name, status").eq("id", profile.companyId).single(),
    supabase.from("company_plans").select("key, name, quantity, total_price").eq("key", planKey).maybeSingle(),
  ]);
  if (!company || company.status !== "active") return { ok: false, error: "Tu cuenta no está habilitada para comprar." };
  if (!plan) return { ok: false, error: "Plan no encontrado" };

  const cents = toCents(plan.total_price);
  const tx = newClientTxId("CUPOS");
  const { error } = await createAdminClient().from("payphone_payments").insert({
    client_tx_id: tx, kind: "quota", company_id: company.id, plan_key: plan.key, user_id: profile.userId, amount_cents: cents,
  });
  if (error) return { ok: false, error: "No se pudo preparar el pago. Intenta de nuevo." };
  return { ok: true, box: params(tx, cents, `${plan.name} · ${plan.quantity} cupos · ${company.name}`, profile.email) };
}
