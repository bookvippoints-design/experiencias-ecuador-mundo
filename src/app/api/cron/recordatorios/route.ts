import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { appUrl, BRAND, NATIONAL_RULE, NATIONAL_MIN_DAYS, PURCHASE_WINDOW_REASON } from "@/lib/brand";
import { flushPendingMessageEmails } from "@/lib/message-emails";

export const dynamic = "force-dynamic";

const DAY = 86400000;
/**
 * Avisos antes del vencimiento. La escapada nacional se pide con 30 días de
 * anticipación, así que su último aviso es a los 35 días (después ya no se
 * podría reservar). La invitación internacional solo hay que pedirla.
 */
const RULES = {
  national: { first: 60, last: 35 },
  international: { first: 60, last: 15 },
} as const;

type Row = { id: string; owner_id: string; kind: "national" | "international"; code: string; product_name: string | null;
  valid_until: string; national_days: number | null; national_nights: number | null;
  reminder_first_sent_at: string | null; reminder_last_sent_at: string | null };

function longDate(v: string) {
  return new Date(v).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const { data, error } = await admin
    .from("entitlements")
    .select("id, owner_id, kind, code, product_name, valid_until, national_days, national_nights, reminder_first_sent_at, reminder_last_sent_at")
    .in("kind", ["national", "international"])
    .eq("status", "available")
    .gt("valid_until", new Date(now).toISOString())
    .lte("valid_until", new Date(now + 60 * DAY).toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Qué aviso toca a cada beneficio (uno por día como máximo).
  const due: { row: Row; stage: "first" | "last" }[] = [];
  for (const r of (data ?? []) as Row[]) {
    const days = (new Date(r.valid_until).getTime() - now) / DAY;
    const rule = RULES[r.kind];
    if (days <= rule.last && !r.reminder_last_sent_at) due.push({ row: r, stage: "last" });
    else if (days <= rule.first && days > rule.last && !r.reminder_first_sent_at) due.push({ row: r, stage: "first" });
  }

  const byOwner = new Map<string, typeof due>();
  for (const d of due) byOwner.set(d.row.owner_id, [...(byOwner.get(d.row.owner_id) ?? []), d]);

  let sent = 0;
  const failures: string[] = [];
  for (const [ownerId, items] of byOwner) {
    const { data: person } = await admin.from("profiles").select("full_name, email").eq("user_id", ownerId).maybeSingle();
    if (!person?.email) continue;
    const hasNational = items.some((i) => i.row.kind === "national");
    const urgent = items.some((i) => i.stage === "last");
    const list = items
      .map(({ row }) => {
        const what = row.kind === "national"
          ? `Escapada nacional de ${row.national_days} días y ${row.national_nights} ${row.national_nights === 1 ? "noche" : "noches"}`
          : "Invitación hotelera internacional";
        const hint = row.kind === "national"
          ? `pídela con al menos ${NATIONAL_MIN_DAYS} días de anticipación`
          : "solo tienes que pedirla; después tendrás 18 meses para viajar";
        return `<li style="margin-bottom:8px"><strong>${escapeHtml(what)}</strong> (${escapeHtml(row.product_name ?? "")} · ${row.code})<br>Vence el <strong>${longDate(row.valid_until)}</strong>: ${hint}.</li>`;
      })
      .join("");
    try {
      await sendMail({
        to: person.email,
        subject: urgent ? "Último aviso: tienes experiencias por vencer" : "Recuerda usar tus experiencias antes de que venzan",
        html: emailLayout(
          `<h2 style="margin:0 0 8px;color:${BRAND.orangeDark}">Hola, ${escapeHtml(person.full_name.split(" ")[0] ?? "")}</h2>
           <p>${urgent ? "Te queda poco tiempo para usar" : "Te recordamos que tienes"} estas experiencias en tu cuenta:</p>
           <ul>${list}</ul>
           ${hasNational ? `<p style="font-size:13px;color:#5b6570">${escapeHtml(NATIONAL_RULE)}</p>` : ""}
           <p style="font-size:13px;color:#5b6570">Si no vas a usarlas, también puedes regalarlas a alguien especial antes de que venzan.</p>`,
          { label: "Ver mis experiencias", url: `${appUrl()}/cuenta/experiencias` }
        ),
      });
      sent++;
      // También queda en su bandeja "Mensajes" (el correo ya salió arriba).
      await admin.from("messages").insert({
        user_id: ownerId, kind: "auto", email_status: "none", link: "/cuenta/experiencias",
        title: urgent ? "Último aviso: tienes experiencias por vencer" : "Recuerda usar tus experiencias antes de que venzan",
        body: items.map(({ row }) => `${row.kind === "national" ? "Escapada nacional" : "Invitación internacional"} (${row.code}): vence el ${longDate(row.valid_until)}.`).join("\n"),
      });
      const stamp = new Date().toISOString();
      const first = items.filter((i) => i.stage === "first").map((i) => i.row.id);
      const last = items.filter((i) => i.stage === "last").map((i) => i.row.id);
      if (first.length) await admin.from("entitlements").update({ reminder_first_sent_at: stamp }).in("id", first);
      if (last.length) await admin.from("entitlements").update({ reminder_first_sent_at: stamp, reminder_last_sent_at: stamp }).in("id", last);
    } catch (e) {
      failures.push(`${person.email}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  const windowReminders = await purchaseWindowReminders(admin, now).catch((e) => {
    failures.push(`plazo: ${e instanceof Error ? e.message : "error"}`);
    return 0;
  });

  // Repesca de correos de mensajes que hayan quedado pendientes.
  const messageEmails = await flushPendingMessageEmails(100).catch(() => 0);
  return NextResponse.json({ checked: data?.length ?? 0, emails: sent, windowReminders, messageEmails, failures });
}

/**
 * Recordatorios del plazo de 14 días para comprar: día 7, día 12 y último día.
 * Solo a quienes todavía no compraron un paquete dentro de su plazo.
 */
const WINDOW_STAGES = [
  { stage: 3, maxDays: 1, subject: "Último día para comprar tu paquete con puntos de regalo" },
  { stage: 2, maxDays: 2, subject: "Te quedan 2 días para comprar tu paquete" },
  { stage: 1, maxDays: 7, subject: "Te quedan 7 días para elegir tu experiencia" },
] as const;

async function purchaseWindowReminders(admin: ReturnType<typeof createAdminClient>, now: number): Promise<number> {
  const { data, error } = await admin
    .from("profiles")
    .select("user_id, full_name, email, purchase_window_started_at, purchase_window_ends_at, purchase_window_reminder")
    .eq("role", "user")
    .not("purchase_window_ends_at", "is", null)
    .gt("purchase_window_ends_at", new Date(now).toISOString())
    .lte("purchase_window_ends_at", new Date(now + 7 * DAY).toISOString())
    .lt("purchase_window_reminder", 3);
  if (error) throw new Error(error.message);
  let sent = 0;
  for (const p of data ?? []) {
    const days = (new Date(p.purchase_window_ends_at as string).getTime() - now) / DAY;
    const st = WINDOW_STAGES.find((x) => days <= x.maxDays);
    if (!st || (p.purchase_window_reminder ?? 0) >= st.stage || !p.email) continue;
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", p.user_id)
      .eq("status", "approved")
      .gte("created_at", p.purchase_window_started_at as string);
    // Ya compró en este plazo: no se le insiste, solo se marca.
    if ((count ?? 0) === 0) {
      const until = new Date(p.purchase_window_ends_at as string).toLocaleString("es-EC", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Guayaquil" });
      const body = `Tu plazo para comprar paquetes con precios especiales termina el ${until}. Si compras antes recibes además puntos de regalo: 250 con el Escape Esencial, 500 con el Escape Plus y 1.000 con el Escape Premium.`;
      await sendMail({
        to: p.email,
        subject: st.subject,
        html: emailLayout(
          `<h2 style="margin:0 0 8px;color:${BRAND.orangeDark}">Hola, ${escapeHtml((p.full_name ?? "").split(" ")[0] ?? "")}</h2>
           <p>${escapeHtml(body)}</p>
           <p style="font-size:13px;color:#5b6570">${escapeHtml(PURCHASE_WINDOW_REASON)}</p>`,
          { label: "Ver paquetes", url: `${appUrl()}/cuenta/catalogo` }
        ),
      });
      await admin.from("messages").insert({ user_id: p.user_id, kind: "auto", email_status: "none", link: "/cuenta/catalogo", title: st.subject, body });
      sent++;
    }
    await admin.from("profiles").update({ purchase_window_reminder: st.stage }).eq("user_id", p.user_id);
  }
  return sent;
}
