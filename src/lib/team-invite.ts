import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { APP_NAME, appUrl, whatsappUrl, whatsappDisplay } from "@/lib/brand";

export const TEAM_INVITE_DAYS = 7;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newToken() {
  return Array.from(randomBytes(16), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Crea un enlace nuevo de invitación al equipo (vence en 7 días). */
export async function createTeamInvite(userId: string, actorId: string): Promise<string> {
  const admin = createAdminClient();
  const token = newToken();
  const expires = new Date(Date.now() + TEAM_INVITE_DAYS * 86400000).toISOString();
  const { error } = await admin.from("team_invites").insert({ token, user_id: userId, created_by: actorId, expires_at: expires });
  if (error) throw new Error(error.message);
  return `${appUrl()}/e/${token}`;
}

const ROLE_TEXT = { admin: "como administrador", member: "" } as const;

/** Envía el correo de invitación al equipo. */
export async function sendTeamInvite(opts: {
  userId: string; actorId: string; email: string; name: string; inviterName: string;
  companyName: string; logoUrl: string | null; role: "admin" | "member"; department: string | null; dailyLimit: number | null; reminder?: boolean;
}) {
  const url = await createTeamInvite(opts.userId, opts.actorId);
  const first = opts.name.split(" ")[0];
  const where = opts.role === "admin"
    ? ROLE_TEXT.admin
    : opts.department ? `en el departamento de <strong>${escapeHtml(opts.department)}</strong>` : "";
  const what = opts.role === "admin"
    ? `Como administrador podrás crear accesos al catálogo de experiencias para los clientes de la empresa y manejar al equipo: agregar usuarios, poner sus límites y darles cupos extra.`
    : `Desde tu cuenta podrás crear accesos al catálogo de experiencias para los clientes de la empresa. ${opts.dailyLimit === null ? "Puedes crear los que necesites mientras la empresa tenga cupos." : `Puedes crear hasta <strong>${opts.dailyLimit} ${opts.dailyLimit === 1 ? "acceso" : "accesos"} por día</strong>.`}`;
  const body = `${opts.logoUrl ? `<p><img src="${opts.logoUrl}" alt="${escapeHtml(opts.companyName)}" style="max-width:160px;max-height:60px"></p>` : ""}
    <h2 style="margin:0 0 8px;color:#c4520a">Hola, ${escapeHtml(first)}</h2>
    <p><strong>${escapeHtml(opts.inviterName)}</strong> te agregó al equipo de <strong>${escapeHtml(opts.companyName)}</strong> ${where} en ${APP_NAME}.</p>
    <p>${what}</p>`;
  const after = `<p style="font-size:13px;color:#5b6570;margin-top:18px">Tu usuario es este correo: <strong>${escapeHtml(opts.email)}</strong>. La contraseña la creas tú al activar tu cuenta.<br>
    El enlace vence en ${TEAM_INVITE_DAYS} días. Si vence, pídele a tu administrador que te reenvíe la invitación.<br>
    ¿Dudas? Escríbenos por WhatsApp al <a href="${whatsappUrl()}" style="color:#c4520a">${whatsappDisplay()}</a>.</p>`;
  await sendMail({
    to: opts.email,
    subject: `${opts.reminder ? "Recordatorio: " : ""}${opts.companyName} te invitó a su equipo`,
    html: emailLayout(body, { label: "Activar mi cuenta y crear contraseña", url }, after),
  });
}
