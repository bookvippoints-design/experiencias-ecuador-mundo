"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/identity";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { appUrl, BRAND } from "@/lib/brand";

/** Correo donde llegan los avisos de administración. */
function adminInbox(): string | null {
  return process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || null;
}

const RECENT_MS = 3 * 60 * 1000;
const isRecent = (iso: string | null | undefined) => !!iso && Date.now() - new Date(iso).getTime() < RECENT_MS;

function row(label: string, value: string | null | undefined) {
  return value ? `<tr><td style="padding:4px 12px 4px 0;color:#5b6570">${label}</td><td style="padding:4px 0"><strong>${escapeHtml(value)}</strong></td></tr>` : "";
}

function day(d: string | null) {
  return d ? new Date(d + "T12:00:00").toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : null;
}

async function alert(subject: string, title: string, rows: string, path: string) {
  const to = adminInbox();
  if (!to) return;
  await sendMail({
    to,
    subject,
    html: emailLayout(
      `<h2 style="margin:0 0 8px;color:${BRAND.orangeDark}">${escapeHtml(title)}</h2><table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>`,
      { label: "Revisar en administración", url: `${appUrl()}${path}` }
    ),
  });
}

/**
 * Avisa a administración de algo que el usuario acaba de hacer. Solo lee el
 * registro con la sesión del propio usuario (RLS) y solo si es reciente, para
 * que no se pueda usar para enviar correos repetidos.
 */
export async function notifyAdmin(kind: "booking" | "booking_dates" | "payment" | "quota", id: string): Promise<void> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return;
    const supabase = await createClient();
    const who = `${profile.fullName} · ${profile.email}`;

    if (kind === "booking" || kind === "booking_dates") {
      const { data: b } = await supabase
        .from("booking_requests")
        .select("id, kind, destination, travelers, notes, check_in, alt_check_in, contact_phone, created_at, updated_at, entitlements(code, points, product_name)")
        .eq("id", id).maybeSingle();
      if (!b || !isRecent(kind === "booking" ? b.created_at : b.updated_at)) return;
      const ent = b.entitlements as unknown as { code: string; points: number | null; product_name: string | null } | null;
      const label = b.kind === "national" ? "Escapada nacional" : b.kind === "international" ? "Invitación internacional" : "Canje de puntos";
      const title = kind === "booking_dates" ? `Cambio de fechas: ${label}` : `Nueva solicitud: ${label}`;
      await alert(
        `${title} · ${b.destination}`,
        title,
        row("Cliente", who) + row("Beneficio", `${ent?.product_name ?? ""} · ${ent?.code ?? ""}`) +
          (b.kind === "points" ? row("Puntos a acreditar", String(ent?.points ?? "")) + row("Cuenta BookVipPoints", b.destination) : row("Destino", b.destination)) +
          row("Entrada", day(b.check_in)) + row("Fecha alternativa", day(b.alt_check_in)) +
          row("Viajeros / acompañante", b.travelers) + row("Teléfono", b.contact_phone) + row("Comentarios", b.notes) +
          (b.kind === "national" ? row("Recuerda", "Responder en 24 a 48 horas hábiles. No válido en temporada alta, vacaciones ni feriados.") : ""),
        "/admin/reservas"
      );
      return;
    }

    if (kind === "payment") {
      const { data: o } = await supabase
        .from("orders")
        .select("id, code, product_snapshot, price, mode, recipient_name, recipient_email, payment_reference, payment_reported_at")
        .eq("id", id).maybeSingle();
      if (!o || !isRecent(o.payment_reported_at)) return;
      const product = o.product_snapshot as { name: string };
      await alert(
        `Pago reportado ${o.code} · ${product.name} · US$${o.price}`,
        "Pago reportado: verifícalo en PayPhone",
        row("Cliente", who) + row("Pedido", `${o.code} · ${product.name}`) + row("Valor", `US$${o.price}`) +
          row("Transacción PayPhone", o.payment_reference) +
          (o.mode === "gift" ? row("Regalo para", `${o.recipient_name} · ${o.recipient_email}`) : ""),
        "/admin/pedidos"
      );
      return;
    }

    if (kind === "quota") {
      const { data: q } = await supabase
        .from("quota_purchases")
        .select("id, plan_key, quantity, total_price, payment_reference, requested_at, companies(name)")
        .eq("id", id).maybeSingle();
      if (!q || !isRecent(q.requested_at)) return;
      const company = (q.companies as unknown as { name: string } | null)?.name ?? "";
      await alert(
        `Compra de cupos: ${company} · ${q.quantity} cupos`,
        "Una empresa reportó el pago de cupos",
        row("Empresa", company) + row("Contacto", who) + row("Plan", `${q.plan_key} · ${q.quantity} cupos · US$${q.total_price}`) +
          row("Transacción PayPhone", q.payment_reference),
        "/admin/compras"
      );
    }
  } catch {
    // Un aviso que no sale no debe romper la acción del usuario; queda en "Correos enviados".
  }
}
