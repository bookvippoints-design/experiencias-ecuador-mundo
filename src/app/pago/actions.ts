"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/identity";
import { payphoneBoxEnabled, toCents, amountBreakdown, newClientTxId } from "@/lib/payphone-box";
import { loadPurchaseWindow, PAYMENT_GRACE_MS } from "@/lib/purchase-window";
import { accessPriceUsd, APP_NAME } from "@/lib/brand";
import { randomBytes } from "crypto";

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
  // Se respeta un pedido creado dentro del plazo, con un margen para terminar de pagarlo.
  const win = await loadPurchaseWindow(supabase, profile.userId);
  if (win.endsAt && Date.now() > new Date(win.endsAt).getTime() + PAYMENT_GRACE_MS) {
    return { ok: false, error: "Tu periodo de 14 días para comprar paquetes terminó. Puedes reactivar tu acceso desde Inicio." };
  }

  const cents = toCents(o.price);
  const tx = newClientTxId(o.code);
  const { error } = await createAdminClient().from("payphone_payments").insert({
    client_tx_id: tx, kind: "order", order_id: o.id, user_id: profile.userId, amount_cents: cents,
  });
  if (error) return { ok: false, error: "No se pudo preparar el pago. Intenta de nuevo." };
  const product = o.product_snapshot as { name: string };
  return { ok: true, box: params(tx, cents, `Pedido ${o.code} · ${product.name}`, profile.email) };
}

/**
 * "Activar paquete": crea (o reutiliza) el pedido para el propio cliente y prepara el pago.
 * El cliente decide después, desde "Mis beneficios activados", si lo usa o lo regala.
 */
export async function startActivationPayment(slug: string): Promise<StartResult> {
  if (!payphoneBoxEnabled()) return { ok: false, error: "El pago con tarjeta todavía no está activo. Escríbenos por WhatsApp." };
  const profile = await getCurrentProfile();
  if (profile?.role !== "user") return { ok: false, error: "Acceso no autorizado" };
  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("id").eq("slug", slug).eq("active", true).maybeSingle();
  if (!product) return { ok: false, error: "Paquete no encontrado" };
  // Si ya hay un pedido sin pagar de este mismo paquete, se reutiliza (evita pedidos repetidos al recargar).
  const { data: open } = await supabase
    .from("orders")
    .select("id")
    .eq("buyer_id", profile.userId)
    .eq("product_id", product.id)
    .eq("mode", "self")
    .eq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let orderId = open?.id as string | undefined;
  if (!orderId) {
    const { data, error } = await supabase.rpc("create_order", { p_product_slug: slug, p_mode: "self", p_accept_terms: true });
    if (error) return { ok: false, error: error.message };
    orderId = (data as { id: string }).id;
  }
  return startOrderPayment(orderId);
}

/** Prepara el pago de un plan de cupos de la empresa. */
export async function startQuotaPayment(planKey: string): Promise<StartResult> {
  if (!payphoneBoxEnabled()) return { ok: false, error: "El pago con tarjeta todavía no está activo." };
  const profile = await getCurrentProfile();
  if (profile?.role !== "company" || !profile.companyId) return { ok: false, error: "Acceso no autorizado" };
  if (profile.companyRole !== "owner") return { ok: false, error: "Solo el administrador principal puede comprar cupos." };
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

/** Reactivación pagada: el plazo de compra terminó y el cliente abre 14 días nuevos. */
export async function startReactivationPayment(): Promise<StartResult> {
  if (!payphoneBoxEnabled()) return { ok: false, error: "El pago con tarjeta todavía no está activo. Escríbenos por WhatsApp." };
  const profile = await getCurrentProfile();
  if (profile?.role !== "user") return { ok: false, error: "Acceso no autorizado" };
  const supabase = await createClient();
  const win = await loadPurchaseWindow(supabase, profile.userId);
  if (win.open) return { ok: false, error: "Tu plazo para comprar paquetes todavía está abierto." };
  const { data: me } = await supabase.from("profiles").select("full_name, email, phone").eq("user_id", profile.userId).single();
  const cents = Math.round(accessPriceUsd() * 100);
  const tx = ("ACC-" + randomBytes(15).toString("base64url")).slice(0, 50);
  const { error } = await createAdminClient().from("access_purchases").insert({
    client_tx_id: tx, kind: "reactivation", user_id: profile.userId,
    full_name: me?.full_name ?? profile.fullName, email: (me?.email ?? profile.email).toLowerCase(), phone: me?.phone ?? null, amount_cents: cents,
  });
  if (error) return { ok: false, error: "No se pudo preparar el pago. Intenta de nuevo." };
  return { ok: true, box: params(tx, cents, `Reactivación de acceso · ${APP_NAME}`, profile.email) };
}
