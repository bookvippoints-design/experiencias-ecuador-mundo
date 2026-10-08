"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/identity";
import { ensureAccountAndLink, passwordLink } from "@/lib/auth/access-links";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { APP_NAME } from "@/lib/brand";

export interface CreateUserState {
  error: string | null;
  success: string | null;
}

async function companyInfo(companyId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("companies").select("name, logo_url").eq("id", companyId).single();
  return data;
}

function invitationHtml(name: string, companyName: string, logoUrl: string | null) {
  return `${logoUrl ? `<p><img src="${logoUrl}" alt="${escapeHtml(companyName)}" style="max-width:160px;max-height:60px"></p>` : ""}
    <h2 style="margin:0 0 8px;color:#c4520a">¡Hola, ${escapeHtml(name)}!</h2>
    <p><strong>${escapeHtml(companyName)}</strong> te da acceso a ${APP_NAME}, un catálogo privado de experiencias de viaje para disfrutar y regalar: escapadas en Ecuador, invitaciones hoteleras en más de 130 destinos del mundo y puntos para ahorrar en hoteles.</p>
    <p>Tu acceso ya está habilitado. Activa tu cuenta creando tu contraseña:</p>`;
}

export async function createUserAction(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "company" || !profile.companyId) return { error: "Acceso no autorizado", success: null };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const supabase = await createClient();

  // 1. Validar sin efectos: correo único, saldo, empresa activa
  const { error: checkError } = await supabase.rpc("company_check_new_user", { p_name: name, p_email: email });
  if (checkError) {
    if (checkError.message.includes("ya está registrado")) return await notifyExistingAccount(profile.companyId, email);
    return { error: checkError.message, success: null };
  }

  // 2. Crear la cuenta y descontar exactamente un cupo (la función bloquea y revalida)
  const admin = createAdminClient();
  let link;
  try {
    link = await ensureAccountAndLink(email, name);
    if (!link.isNew) throw new Error("Ese correo ya está registrado en la plataforma. Usa otro correo.");
    const { error: finalizeError } = await admin.rpc("company_finalize_user", {
      p_company_id: profile.companyId,
      p_user_id: link.userId,
      p_name: name,
      p_email: email,
      p_phone: phone || null,
      p_actor: profile.userId,
    });
    if (finalizeError) throw new Error(finalizeError.message);
  } catch (e) {
    if (link?.isNew) await admin.auth.admin.deleteUser(link.userId);
    return { error: e instanceof Error ? e.message : "No se pudo crear el usuario", success: null };
  }

  // 3. Invitación
  let warning = "";
  try {
    const company = await companyInfo(profile.companyId);
    await sendMail({
      to: email,
      subject: `${company?.name ?? "Tu empresa"} te invita a ${APP_NAME}`,
      html: emailLayout(invitationHtml(name, company?.name ?? "", company?.logo_url ?? null), { label: "Activar mi cuenta", url: link.url }),
    });
  } catch (e) {
    warning = ` El usuario se creó, pero el correo no se pudo enviar; usa "Reenviar invitación". (${e instanceof Error ? e.message : ""})`;
  }

  revalidatePath("/empresa/usuarios");
  revalidatePath("/empresa");
  return { error: null, success: `Usuario creado e invitación enviada a ${email}. Se usó 1 cupo.${warning}` };
}

/** Reenvía la invitación con un enlace nuevo. No consume cupos. */
export async function resendInvitationAction(userId: string): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "company" || !profile.companyId) return { error: "Acceso no autorizado" };

  const supabase = await createClient();
  const { data: email, error } = await supabase.rpc("company_can_resend", { p_user_id: userId });
  if (error || !email) return { error: error?.message ?? "Usuario no encontrado" };

  try {
    const admin = createAdminClient();
    const { data: person } = await admin.from("profiles").select("full_name").eq("user_id", userId).single();
    const company = await companyInfo(profile.companyId);
    const { url } = await passwordLink(email as string);
    await sendMail({
      to: email as string,
      subject: `Recordatorio: ${company?.name ?? "Tu empresa"} te invita a ${APP_NAME}`,
      html: emailLayout(invitationHtml(person?.full_name ?? "", company?.name ?? "", company?.logo_url ?? null), { label: "Activar mi cuenta", url }),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo reenviar" };
  }
  return { error: null };
}

/**
 * El correo ya tiene cuenta (por ejemplo, se la creó otra empresa o recibió un
 * regalo, y la persona no lo recuerda). No se crea otra cuenta ni se usa cupo:
 * se le avisa a la persona cómo entrar a la cuenta que ya tiene.
 */
async function notifyExistingAccount(companyId: string, email: string): Promise<CreateUserState> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("full_name, role").eq("email", email).maybeSingle();
  if (existing && existing.role !== "user") {
    return { error: "Ese correo pertenece a una cuenta de empresa o administración. Usa otro correo.", success: null };
  }
  try {
    const company = await companyInfo(companyId);
    const link = await ensureAccountAndLink(email, existing?.full_name ?? "");
    const greeting = existing?.full_name ? `¡Hola, ${escapeHtml(existing.full_name)}!` : "¡Hola!";
    await sendMail({
      to: email,
      subject: `${company?.name ?? "Una empresa"} quiere darte acceso a ${APP_NAME}`,
      html: emailLayout(
        `${company?.logo_url ? `<p><img src="${company.logo_url}" alt="${escapeHtml(company?.name ?? "")}" style="max-width:160px;max-height:60px"></p>` : ""}
         <h2 style="margin:0 0 8px;color:#c4520a">${greeting}</h2>
         <p><strong>${escapeHtml(company?.name ?? "")}</strong> quiso darte acceso a ${APP_NAME}, y encontramos que <strong>ya tienes una cuenta</strong> con este correo. No necesitas otra: con tu cuenta tienes acceso al catálogo completo de experiencias para disfrutar y regalar.</p>
         <p>${link.mustSetPassword ? "Crea tu contraseña para entrar:" : "Entra con tu correo y tu contraseña. Si no la recuerdas, usa \"¿Olvidaste tu contraseña?\" en la pantalla de ingreso."}</p>`,
        { label: link.mustSetPassword ? "Crear mi contraseña" : "Entrar a mi cuenta", url: link.url }
      ),
    });
  } catch (e) {
    return {
      error: `Ese correo ya tiene una cuenta, pero no pudimos enviarle el aviso: ${e instanceof Error ? e.message : ""}`,
      success: null,
    };
  }
  return {
    error: null,
    success: `${email} ya tenía una cuenta en la plataforma, así que no se creó otra y no se usó ningún cupo. Le enviamos un correo con las instrucciones para entrar a su cuenta.`,
  };
}
