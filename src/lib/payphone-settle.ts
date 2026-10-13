import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPayphone } from "@/lib/payphone-box";
import { ensureAccountAndLink, type AccessLink } from "@/lib/auth/access-links";
import { sendOrderApprovedEmails } from "@/lib/order-fulfillment";
import { flushPendingMessageEmails } from "@/lib/message-emails";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { appUrl, BRAND } from "@/lib/brand";
import { ACCESS_TX_PREFIX, settleAccessPayment } from "@/lib/access-sale";

export type SettleOutcome = "approved" | "canceled" | "pending_credit" | "error";

async function alertAdmin(subject: string, title: string, lines: [string, string | null | undefined][], path: string) {
  const to = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
  if (!to) return;
  const rows = lines
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5b6570">${k}</td><td style="padding:4px 0"><strong>${escapeHtml(v!)}</strong></td></tr>`)
    .join("");
  await sendMail({
    to,
    subject,
    html: emailLayout(
      `<h2 style="margin:0 0 8px;color:${BRAND.orangeDark}">${escapeHtml(title)}</h2><table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>`,
      { label: "Ver en administración", url: `${appUrl()}${path}` }
    ),
  }).catch(() => undefined);
}

/**
 * Confirma con PayPhone el pago que regresa a /pago/respuesta y, si fue aprobado,
 * acredita el pedido o los cupos. Es idempotente: si llega dos veces, no acredita dos veces.
 * PayPhone revierte el cobro si no se confirma dentro de 5 minutos.
 */
export async function settlePayphonePayment(payphoneId: number, clientTxId: string): Promise<SettleOutcome> {
  if (clientTxId.startsWith(ACCESS_TX_PREFIX)) return settleAccessPayment(payphoneId, clientTxId);
  const admin = createAdminClient();
  const { data: pay } = await admin.from("payphone_payments").select("*").eq("client_tx_id", clientTxId).maybeSingle();
  if (!pay) return "error";
  if (pay.status === "canceled" || pay.status === "failed") return pay.status === "canceled" ? "canceled" : "error";

  if (pay.status === "started") {
    let conf;
    try {
      conf = await confirmPayphone(payphoneId, clientTxId);
    } catch {
      return "error";
    }
    const approved = conf.statusCode === 3 && conf.clientTransactionId === clientTxId && Number(conf.amount) === pay.amount_cents;
    const status = approved ? "approved" : conf.statusCode === 2 ? "canceled" : "failed";
    const { data: claimed } = await admin
      .from("payphone_payments")
      .update({
        status,
        payphone_id: conf.transactionId ?? payphoneId,
        authorization_code: conf.authorizationCode ?? null,
        card_brand: conf.cardBrand ?? null,
        last_digits: conf.lastDigits ?? null,
        message: conf.message ?? (conf.statusCode === 3 && !approved ? "Los datos del pago no coinciden con el pedido" : null),
        response: conf,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", pay.id)
      .eq("status", "started")
      .select("id");
    if (!claimed?.length) return settleAgain(pay.id);
    if (status !== "approved") {
      if (conf.statusCode === 3) {
        await alertAdmin("⚠️ Pago PayPhone con datos que no coinciden", "Revisa este pago en PayPhone", [
          ["Transacción", String(conf.transactionId ?? payphoneId)], ["Referencia interna", clientTxId],
          ["Monto PayPhone", conf.amount != null ? `US$${(Number(conf.amount) / 100).toFixed(2)}` : null],
          ["Monto esperado", `US$${(pay.amount_cents / 100).toFixed(2)}`],
        ], pay.kind === "order" ? "/admin/pedidos" : "/admin/compras");
      }
      return status === "canceled" ? "canceled" : "error";
    }
  }
  return credit(pay.id);
}

async function settleAgain(paymentId: string): Promise<SettleOutcome> {
  const { data } = await createAdminClient().from("payphone_payments").select("status").eq("id", paymentId).single();
  if (data?.status === "approved") return credit(paymentId);
  return data?.status === "canceled" ? "canceled" : "error";
}

/** Acredita un pago ya aprobado por PayPhone. */
async function credit(paymentId: string): Promise<SettleOutcome> {
  const admin = createAdminClient();
  const { data: pay } = await admin.from("payphone_payments").select("*").eq("id", paymentId).single();
  if (!pay || pay.status !== "approved") return "error";
  const card = [pay.card_brand, pay.last_digits ? `**** ${pay.last_digits}` : null].filter(Boolean).join(" ");

  if (pay.kind === "quota") {
    if (pay.quota_purchase_id) return "approved";
    const { error } = await admin.rpc("payphone_approve_quota", { p_payment_id: pay.id });
    const { data: who } = await admin.from("companies").select("name").eq("id", pay.company_id).single();
    if (error) {
      await alertAdmin("⚠️ Cupos pagados sin acreditar", "PayPhone aprobó el pago pero los cupos no se sumaron", [
        ["Empresa", who?.name], ["Plan", pay.plan_key], ["Transacción PayPhone", String(pay.payphone_id)], ["Error", error.message],
      ], "/admin/compras");
      return "pending_credit";
    }
    await alertAdmin(`Venta de cupos pagada · ${who?.name ?? ""} · US$${(pay.amount_cents / 100).toFixed(2)}`,
      "Una empresa compró cupos con tarjeta (ya acreditados)", [
        ["Empresa", who?.name], ["Plan", pay.plan_key], ["Valor", `US$${(pay.amount_cents / 100).toFixed(2)}`],
        ["Transacción PayPhone", String(pay.payphone_id)], ["Autorización", pay.authorization_code], ["Tarjeta", card],
      ], "/admin/compras");
    return "approved";
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, code, mode, status, price, recipient_name, recipient_email, buyer_id, product_snapshot")
    .eq("id", pay.order_id)
    .single();
  if (!order) return "pending_credit";
  if (order.status === "approved") return "approved";

  let access: AccessLink | null = null;
  let failure: string | null = null;
  if (order.mode === "gift") {
    try {
      access = await ensureAccountAndLink(order.recipient_email!, order.recipient_name!);
    } catch (e) {
      failure = `No se pudo preparar la cuenta del destinatario: ${e instanceof Error ? e.message : ""}`;
    }
  }
  let giftId: string | null = null;
  if (!failure) {
    const { data, error } = await admin.rpc("payphone_approve_order", { p_payment_id: pay.id });
    if (error) failure = error.message;
    else {
      const r = data as { already: boolean; gift_id: string | null };
      if (r.already) return "approved";
      giftId = r.gift_id;
    }
  }
  const product = order.product_snapshot as { name: string };
  const { data: buyer } = await admin.from("profiles").select("full_name, email").eq("user_id", order.buyer_id).single();
  const who = buyer ? `${buyer.full_name} · ${buyer.email}` : null;
  if (failure) {
    await alertAdmin(`⚠️ Pago aprobado sin acreditar · ${order.code}`, "PayPhone aprobó el pago pero el pedido no se acreditó", [
      ["Cliente", who], ["Pedido", `${order.code} · ${product.name}`], ["Transacción PayPhone", String(pay.payphone_id)], ["Error", failure],
    ], "/admin/pedidos?f=revisar");
    return "pending_credit";
  }

  const warning = await sendOrderApprovedEmails(order, giftId, access);
  await flushPendingMessageEmails().catch(() => 0);
  await alertAdmin(`Venta pagada ${order.code} · ${product.name} · US$${order.price}`, "Nueva venta con tarjeta (ya acreditada)", [
    ["Cliente", who], ["Pedido", `${order.code} · ${product.name}`], ["Valor", `US$${order.price}`],
    ["Regalo para", order.mode === "gift" ? `${order.recipient_name} · ${order.recipient_email}` : null],
    ["Transacción PayPhone", String(pay.payphone_id)], ["Autorización", pay.authorization_code], ["Tarjeta", card],
    ["Aviso", warning ? `Un correo no se pudo enviar: ${warning}` : null],
  ], "/admin/pedidos?f=aprobados");
  return "approved";
}
