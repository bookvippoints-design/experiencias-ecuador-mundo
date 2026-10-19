import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { payphoneBoxEnabled, amountBreakdown, confirmPayphone } from "@/lib/payphone-box";
import { ensureAccountAndLink, findAuthUserByEmail, passwordLink, hasPassword } from "@/lib/auth/access-links";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { activationStepsHtml, purchaseWindowHtml, accessFooterHtml } from "@/lib/email-blocks";
import { APP_NAME, BRAND, accessPriceUsd, appUrl } from "@/lib/brand";
import { flushPendingMessageEmails } from "@/lib/message-emails";

export const ACCESS_TX_PREFIX = "ACC-";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Tiempo durante el cual la pantalla de "pago aprobado" permite crear la contraseña. */
const ACTIVATION_WINDOW_MS = 2 * 60 * 60 * 1000;

export type StartAccessResult =
  | { ok: true; box: Record<string, unknown> }
  | { ok: false; error: string; code?: "exists" };

/** Identificadores de clic de Google Ads: solo letras, números, guion y guion bajo. */
function clickId(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return /^[A-Za-z0-9_-]{6,200}$/.test(s) ? s : null;
}

export async function startAccessPurchase(input: {
  name?: string; email?: string; email2?: string; phone?: string; terms?: boolean;
  gclid?: string; gbraid?: string; wbraid?: string; landing?: string;
}): Promise<StartAccessResult> {
  if (!payphoneBoxEnabled()) return { ok: false, error: "La venta en línea todavía no está activa. Escríbenos por WhatsApp." };
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const email = String(input.email ?? "").trim().toLowerCase();
  const email2 = String(input.email2 ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? "").trim().slice(0, 30);
  if (name.length < 3) return { ok: false, error: "Escribe tu nombre y apellido." };
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Revisa tu correo: falta la @ o el dominio." };
  if (email !== email2) return { ok: false, error: "Los dos correos no coinciden. Revísalos antes de continuar." };
  if (phone.replace(/\D/g, "").length < 7) return { ok: false, error: "Escribe tu número de celular." };
  if (!input.terms) return { ok: false, error: "Acepta los términos y condiciones para continuar." };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("email", email).maybeSingle();
  const { data: company } = await admin.from("companies").select("id").eq("contact_email", email).maybeSingle();
  if (profile || company || (await findAuthUserByEmail(email))) {
    return { ok: false, code: "exists", error: "Ese correo ya tiene una cuenta en Experiencias Ecuador y el Mundo. No necesitas comprar el acceso: entra con tu correo y tu contraseña." };
  }

  const cents = Math.round(accessPriceUsd() * 100);
  const tx = (ACCESS_TX_PREFIX + randomBytes(15).toString("base64url")).slice(0, 50);
  const landing = String(input.landing ?? "").slice(0, 500);
  const { error } = await admin.from("access_purchases").insert({
    client_tx_id: tx, full_name: name, email, phone, amount_cents: cents,
    gclid: clickId(input.gclid), gbraid: clickId(input.gbraid), wbraid: clickId(input.wbraid),
    landing_url: landing.startsWith("https://experiencias.bookvippoints.com/") || landing.startsWith("http://localhost") ? landing : null,
  });
  if (error) return { ok: false, error: "No se pudo preparar el pago. Intenta de nuevo." };
  return {
    ok: true,
    box: {
      token: process.env.PAYPHONE_TOKEN!.trim(),
      storeId: process.env.PAYPHONE_STORE_ID!.trim(),
      clientTransactionId: tx,
      ...amountBreakdown(cents),
      service: 0,
      tip: 0,
      currency: "USD",
      reference: `Acceso ${APP_NAME}`.slice(0, 100),
      email,
      lang: "es",
      defaultMethod: "card",
      timeZone: -5,
    },
  };
}

async function alertAdmin(subject: string, title: string, lines: [string, string | null | undefined][]) {
  const to = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
  if (!to) return;
  const rows = lines.filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5b6570">${k}</td><td style="padding:4px 0"><strong>${escapeHtml(v!)}</strong></td></tr>`).join("");
  await sendMail({
    to, subject,
    html: emailLayout(`<h2 style="margin:0 0 8px;color:${BRAND.orangeDark}">${escapeHtml(title)}</h2><table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>`,
      { label: "Ver en administración", url: `${appUrl()}/admin` }),
  }).catch(() => undefined);
}

export type AccessOutcome = "approved" | "canceled" | "pending_credit" | "error";

/** Confirma con PayPhone un pago de acceso y, si fue aprobado, crea la cuenta. Idempotente. */
export async function settleAccessPayment(payphoneId: number, tx: string): Promise<AccessOutcome> {
  const admin = createAdminClient();
  const { data: p } = await admin.from("access_purchases").select("*").eq("client_tx_id", tx).maybeSingle();
  if (!p) return "error";
  if (p.status === "canceled") return "canceled";
  if (p.status === "failed") return "error";

  if (p.status === "started") {
    let conf;
    try { conf = await confirmPayphone(payphoneId, tx); } catch { return "error"; }
    const approved = conf.statusCode === 3 && conf.clientTransactionId === tx && Number(conf.amount) === p.amount_cents;
    const status = approved ? "approved" : conf.statusCode === 2 ? "canceled" : "failed";
    const { data: claimed } = await admin.from("access_purchases").update({
      status,
      payphone_id: conf.transactionId ?? payphoneId,
      authorization_code: conf.authorizationCode ?? null,
      card_brand: conf.cardBrand ?? null,
      last_digits: conf.lastDigits ?? null,
      message: conf.message ?? null,
      response: conf,
      confirmed_at: new Date().toISOString(),
    }).eq("id", p.id).eq("status", "started").select("id");
    if (!claimed?.length) {
      const { data: again } = await admin.from("access_purchases").select("status").eq("id", p.id).single();
      if (again?.status !== "approved") return again?.status === "canceled" ? "canceled" : "error";
    } else if (status !== "approved") {
      if (conf.statusCode === 3) {
        await alertAdmin("⚠️ Pago de acceso con datos que no coinciden", "Revisa este pago en PayPhone", [
          ["Cliente", `${p.full_name} · ${p.email}`], ["Transacción", String(conf.transactionId ?? payphoneId)],
          ["Monto PayPhone", conf.amount != null ? `US$${(Number(conf.amount) / 100).toFixed(2)}` : null],
        ]);
      }
      return status === "canceled" ? "canceled" : "error";
    }
  }
  return creditAccess(p.id);
}

async function creditAccess(purchaseId: string): Promise<AccessOutcome> {
  const admin = createAdminClient();
  const { data: p } = await admin.from("access_purchases").select("*").eq("id", purchaseId).single();
  if (!p || p.status !== "approved") return "error";
  if (p.credited_at) return "approved";
  const card = [p.card_brand, p.last_digits ? `**** ${p.last_digits}` : null].filter(Boolean).join(" ");
  if (p.kind === "reactivation") return creditReactivation(p, card);
  try {
    const link = await ensureAccountAndLink(p.email, p.full_name);
    const { error } = await admin.rpc("access_finalize", { p_purchase_id: p.id, p_user_id: link.userId });
    if (error) throw new Error(error.message);
    let warning: string | null = null;
    try {
      await sendMail({
        to: p.email,
        subject: `Tu acceso a ${APP_NAME} está listo`,
        html: emailLayout(
          `<h2 style="margin:0 0 8px;color:${BRAND.orangeDark}">¡Bienvenido, ${escapeHtml(p.full_name)}!</h2>
           <p>Confirmamos tu pago. Tu acceso al catálogo privado de ${APP_NAME} ya está activo.</p>
           ${purchaseWindowHtml()}
           ${link.mustSetPassword ? activationStepsHtml("Crear mi contraseña") : "<p>Entra con tu correo y tu contraseña.</p>"}`,
          { label: link.mustSetPassword ? "Crear mi contraseña" : "Entrar a mi portal", url: link.url },
          accessFooterHtml(p.email, link.mustSetPassword)
        ),
      });
    } catch (e) {
      warning = e instanceof Error ? e.message : "no se pudo enviar";
    }
    await flushPendingMessageEmails().catch(() => 0);
    await alertAdmin(`Venta de acceso · ${p.full_name} · US$${(p.amount_cents / 100).toFixed(2)}`, "Nuevo acceso vendido (cuenta creada)", [
      ["Cliente", `${p.full_name} · ${p.email}`], ["Celular", p.phone], ["Valor", `US$${(p.amount_cents / 100).toFixed(2)}`],
      ["Transacción PayPhone", String(p.payphone_id)], ["Autorización", p.authorization_code], ["Tarjeta", card],
      ["Aviso", warning ? `El correo de bienvenida no salió: ${warning}` : null],
    ]);
    return "approved";
  } catch (e) {
    await alertAdmin(`⚠️ Acceso pagado sin cuenta · ${p.email}`, "PayPhone aprobó el pago pero no se pudo crear la cuenta", [
      ["Cliente", `${p.full_name} · ${p.email}`], ["Celular", p.phone], ["Transacción PayPhone", String(p.payphone_id)],
      ["Error", e instanceof Error ? e.message : "desconocido"],
    ]);
    return "pending_credit";
  }
}

/**
 * Botón "Crear mi contraseña" de la pantalla de pago aprobado. Solo funciona poco
 * después del pago y mientras la persona no haya entrado nunca a su cuenta.
 */
export async function accessActivationUrl(tx: string): Promise<string> {
  const admin = createAdminClient();
  const { data: p } = await admin.from("access_purchases").select("email, status, credited_at, confirmed_at, user_id").eq("client_tx_id", tx).maybeSingle();
  if (!p || p.status !== "approved" || !p.credited_at || !p.user_id) return `${appUrl()}/login`;
  if (Date.now() - new Date(p.confirmed_at ?? p.credited_at).getTime() > ACTIVATION_WINDOW_MS) return `${appUrl()}/login`;
  if (await hasPassword(p.user_id)) return `${appUrl()}/login`;
  try {
    return (await passwordLink(p.email)).url;
  } catch {
    return `${appUrl()}/login`;
  }
}

/** Ventana durante la cual una compra recién aprobada puede enviarse como conversión. */
const ADS_CONVERSION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface AccessConversion {
  transactionId: string;
  value: number;
  currency: "USD";
}

/**
 * Decide en el servidor si esta compra debe medirse en Google Ads. Nunca usa el
 * parámetro "estado" de la dirección: revisa la compra guardada y la respuesta
 * de confirmación de PayPhone (estado aprobado, misma referencia y mismo monto).
 */
export async function accessConversionFor(tx: string, expectedValueUsd: number): Promise<AccessConversion | null> {
  if (!tx.startsWith(ACCESS_TX_PREFIX) || tx.length > 50) return null;
  const { data: p } = await createAdminClient()
    .from("access_purchases")
    .select("client_tx_id, kind, status, amount_cents, response, confirmed_at, ads_conversion_sent_at")
    .eq("client_tx_id", tx)
    .maybeSingle();
  // La reactivación de un cliente existente no se mide como venta de Google Ads.
  if (!p || p.kind !== "new" || p.status !== "approved" || p.ads_conversion_sent_at) return null;
  const expectedCents = Math.round(expectedValueUsd * 100);
  const r = (p.response ?? {}) as { statusCode?: number; amount?: number; clientTransactionId?: string; transactionId?: number };
  const verified =
    p.amount_cents === expectedCents &&
    r.statusCode === 3 &&
    Number(r.amount) === p.amount_cents &&
    r.clientTransactionId === p.client_tx_id;
  if (!verified) return null;
  if (!p.confirmed_at || Date.now() - new Date(p.confirmed_at).getTime() > ADS_CONVERSION_WINDOW_MS) return null;
  return { transactionId: p.client_tx_id, value: p.amount_cents / 100, currency: "USD" };
}

/** Reactivación pagada: abre 14 días nuevos para comprar paquetes. */
async function creditReactivation(p: { id: string; full_name: string; email: string; phone: string | null; amount_cents: number; payphone_id: number | null; authorization_code: string | null }, card: string): Promise<AccessOutcome> {
  const admin = createAdminClient();
  const { data: ends, error } = await admin.rpc("access_reactivate", { p_purchase_id: p.id });
  if (error) {
    await alertAdmin(`⚠️ Reactivación pagada sin aplicar · ${p.email}`, "PayPhone aprobó la reactivación pero no se abrió el plazo", [
      ["Cliente", `${p.full_name} · ${p.email}`], ["Transacción PayPhone", String(p.payphone_id)], ["Error", error.message],
    ]);
    return "pending_credit";
  }
  const until = ends ? new Date(ends as string).toLocaleString("es-EC", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Guayaquil" }) : "";
  let warning: string | null = null;
  try {
    await sendMail({
      to: p.email,
      subject: `Tu acceso a ${APP_NAME} está reactivado`,
      html: emailLayout(
        `<h2 style="margin:0 0 8px;color:${BRAND.orangeDark}">¡Listo, ${escapeHtml(p.full_name)}!</h2>
         <p>Confirmamos tu pago. Tienes <strong>14 días${until ? `, hasta el ${escapeHtml(until)}` : ""}</strong> para comprar tus paquetes con precios especiales y recibir además puntos de regalo: 250 con el Escape Esencial, 500 con el Escape Plus y 1.000 con el Escape Premium.</p>`,
        { label: "Ver paquetes", url: `${appUrl()}/cuenta/catalogo` }
      ),
    });
  } catch (e) {
    warning = e instanceof Error ? e.message : "no se pudo enviar";
  }
  await alertAdmin(`Reactivación de acceso · ${p.full_name} · US$${(p.amount_cents / 100).toFixed(2)}`, "Un cliente reactivó su acceso (14 días nuevos)", [
    ["Cliente", `${p.full_name} · ${p.email}`], ["Celular", p.phone], ["Valor", `US$${(p.amount_cents / 100).toFixed(2)}`],
    ["Transacción PayPhone", String(p.payphone_id)], ["Autorización", p.authorization_code], ["Tarjeta", card],
    ["Aviso", warning ? `El correo no salió: ${warning}` : null],
  ]);
  return "approved";
}
