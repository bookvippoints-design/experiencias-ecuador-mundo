"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, isCompanyManager } from "@/lib/auth/identity";
import { ensureAccountAndLink, hasPassword } from "@/lib/auth/access-links";
import { emailDomainAccepts } from "@/lib/email-domain";
import { sendTeamInvite } from "@/lib/team-invite";

export interface TeamFormState {
  error: string | null;
  success: string | null;
}

function readForm(formData: FormData) {
  const role = String(formData.get("role") || "member") === "admin" ? "admin" : "member";
  const newDept = String(formData.get("new_department") || "").trim();
  const department = newDept || String(formData.get("department") || "").trim();
  const unlimited = String(formData.get("limit_mode") || "daily") === "unlimited";
  const n = parseInt(String(formData.get("daily_limit") || ""), 10);
  return {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    role: role as "admin" | "member",
    department: department || null,
    dailyLimit: role === "admin" || unlimited ? null : Number.isFinite(n) ? n : NaN,
  };
}

async function companyOf(companyId: string) {
  const { data } = await createAdminClient().from("companies").select("name, logo_url").eq("id", companyId).single();
  return data;
}

/** Agrega una persona al equipo y le envía la invitación. No usa cupos. */
export async function addMemberAction(_prev: TeamFormState, formData: FormData): Promise<TeamFormState> {
  const profile = await getCurrentProfile();
  if (!profile || !isCompanyManager(profile) || !profile.companyId) return { error: "Acceso no autorizado", success: null };
  const f = readForm(formData);
  if (Number.isNaN(f.dailyLimit)) return { error: "Escribe cuántos accesos por día puede crear.", success: null };

  const supabase = await createClient();
  const { error: checkError } = await supabase.rpc("company_team_check", {
    p_name: f.name, p_email: f.email, p_role: f.role, p_department: f.department, p_daily_limit: f.dailyLimit,
  });
  if (checkError) return { error: checkError.message, success: null };
  if (!(await emailDomainAccepts(f.email))) {
    return { error: `El correo ${f.email} no puede recibir mensajes: su dominio (después de la @) no existe o no tiene correo. Revisa que esté bien escrito.`, success: null };
  }

  const admin = createAdminClient();
  let userId: string | null = null;
  try {
    const link = await ensureAccountAndLink(f.email, f.name);
    if (!link.isNew) throw new Error("Ese correo ya está registrado en la plataforma. Usa otro correo.");
    userId = link.userId;
    const { error } = await admin.rpc("company_team_finalize", {
      p_actor: profile.userId, p_user_id: userId, p_name: f.name, p_email: f.email,
      p_role: f.role, p_department: f.department, p_daily_limit: f.dailyLimit,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    if (userId) await admin.auth.admin.deleteUser(userId);
    return { error: e instanceof Error ? e.message : "No se pudo agregar a la persona", success: null };
  }

  let warning = "";
  try {
    const company = await companyOf(profile.companyId);
    await sendTeamInvite({
      userId, actorId: profile.userId, email: f.email, name: f.name, inviterName: profile.fullName,
      companyName: company?.name ?? "", logoUrl: company?.logo_url ?? null, role: f.role, department: f.department, dailyLimit: f.dailyLimit,
    });
  } catch (e) {
    warning = e instanceof Error ? e.message : "error desconocido";
  }
  revalidatePath("/empresa/equipo");
  if (warning) return { error: null, success: `${f.name} quedó en tu equipo, pero el correo de invitación no se pudo entregar (${warning}). Usa "Reenviar invitación".` };
  return { error: null, success: `${f.name} quedó en tu equipo. Le enviamos la invitación a ${f.email}.` };
}

/** Cambia tipo, departamento o límite de una persona del equipo. */
export async function updateMemberAction(userId: string, _prev: TeamFormState, formData: FormData): Promise<TeamFormState> {
  const profile = await getCurrentProfile();
  if (!profile || !isCompanyManager(profile)) return { error: "Acceso no autorizado", success: null };
  const f = readForm(formData);
  if (Number.isNaN(f.dailyLimit)) return { error: "Escribe cuántos accesos por día puede crear.", success: null };
  const supabase = await createClient();
  const { error } = await supabase.rpc("company_team_update", {
    p_user_id: userId, p_role: f.role, p_department: f.department, p_daily_limit: f.dailyLimit,
  });
  if (error) return { error: error.message, success: null };
  revalidatePath("/empresa/equipo");
  return { error: null, success: "Cambios guardados." };
}

export async function setMemberStatusAction(userId: string, status: "active" | "paused"): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("company_team_set_status", { p_user_id: userId, p_status: status });
  if (error) return { error: error.message };
  revalidatePath("/empresa/equipo");
  return { error: null };
}

export async function grantExtraAction(userId: string, extra: number): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("company_team_grant_extra", { p_user_id: userId, p_extra: extra });
  if (error) return { error: error.message };
  revalidatePath("/empresa/equipo");
  return { error: null };
}

/** Reenvía la invitación (enlace nuevo de 7 días) a quien aún no activa su cuenta. */
export async function resendTeamInviteAction(userId: string): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile || !isCompanyManager(profile) || !profile.companyId) return { error: "Acceso no autorizado" };
  const supabase = await createClient();
  const { data: email, error } = await supabase.rpc("company_team_member_email", { p_user_id: userId });
  if (error || !email) return { error: error?.message ?? "Usuario no encontrado" };
  if (await hasPassword(userId)) return { error: "Esta persona ya activó su cuenta." };
  try {
    const admin = createAdminClient();
    const { data: p } = await admin.from("profiles").select("full_name, company_role, department, daily_limit").eq("user_id", userId).single();
    const company = await companyOf(profile.companyId);
    await sendTeamInvite({
      userId, actorId: profile.userId, email: email as string, name: p?.full_name ?? "", inviterName: profile.fullName,
      companyName: company?.name ?? "", logoUrl: company?.logo_url ?? null,
      role: p?.company_role === "admin" ? "admin" : "member", department: p?.department ?? null, dailyLimit: p?.daily_limit ?? null, reminder: true,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo reenviar" };
  }
  return { error: null };
}
