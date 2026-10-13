"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/identity";
import { ensureAccountAndLink } from "@/lib/auth/access-links";
import { sendOrderApprovedEmails } from "@/lib/order-fulfillment";

export interface ActionResult {
  error: string | null;
  message: string | null;
}

/**
 * Aprueba un pago confirmado en PayPhone. Si es un regalo, este mismo paso es
 * "Entregar regalo": se crea (si hace falta) la cuenta del destinatario, los
 * beneficios pasan a su nombre y se le envía el correo con la tarjeta.
 */
export async function approveOrderAction(orderId: string, notes: string | null): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return { error: "Acceso no autorizado", message: null };

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, code, mode, status, recipient_name, recipient_email, buyer_id, product_snapshot")
    .eq("id", orderId)
    .single();
  if (orderError || !order) return { error: "Pedido no encontrado", message: null };
  if (!["pending_payment", "payment_reported"].includes(order.status)) {
    return { error: "Este pedido ya fue revisado", message: null };
  }

  let access = null;
  if (order.mode === "gift") {
    try {
      access = await ensureAccountAndLink(order.recipient_email!, order.recipient_name!);
    } catch (e) {
      return { error: `No se pudo preparar la cuenta del destinatario: ${e instanceof Error ? e.message : ""}`, message: null };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_approve_order", { p_order_id: orderId, p_notes: notes });
  if (error) return { error: error.message, message: null };
  const result = data as { gift_id: string | null };

  const warning = await sendOrderApprovedEmails(order, result.gift_id, access);

  revalidatePath("/admin/pedidos");
  return {
    error: null,
    message:
      (order.mode === "gift" ? "Regalo entregado al destinatario." : "Pago aprobado y beneficios acreditados.") +
      (warning ? ` Aviso: el correo no se pudo enviar (${warning}).` : ""),
  };
}
