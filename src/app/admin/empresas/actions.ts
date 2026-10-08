"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/identity";
import { ensureAccountAndLink } from "@/lib/auth/access-links";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { APP_NAME } from "@/lib/brand";

export interface FormState {
  error: string | null;
  success: string | null;
}

export async function registerCompanyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return { error: "Acceso no autorizado", success: null };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const supabase = await createClient();

  // 1. Crear la empresa (valida nombre, formato y correo único en toda la plataforma)
  const { data: companyId, error } = await supabase.rpc("register_company", {
    p_name: name,
    p_contact_email: email,
    p_logo_url: null,
  });
  if (error || !companyId) return { error: error?.message ?? "No se pudo crear la empresa", success: null };

  // 2. Crear la cuenta de acceso de la empresa y vincular su perfil
  const admin = createAdminClient();
  let link;
  try {
    link = await ensureAccountAndLink(email, name);
    const { error: profileError } = await admin.from("profiles").insert({
      user_id: link.userId,
      role: "company",
      full_name: name,
      email,
      company_id: companyId,
      created_via: "admin",
    });
    if (profileError) throw new Error(profileError.message);
  } catch (e) {
    await admin.from("companies").delete().eq("id", companyId);
    if (link?.isNew) await admin.auth.admin.deleteUser(link.userId);
    return { error: `No se creó la empresa: ${e instanceof Error ? e.message : "error desconocido"}`, success: null };
  }

  // 3. Invitación por correo
  let warning = "";
  try {
    await sendMail({
      to: email,
      subject: `Tu acceso empresarial a ${APP_NAME}`,
      html: emailLayout(
        `<h2 style="margin:0 0 8px;color:#c4520a">Bienvenidos, ${escapeHtml(name)}</h2>
         <p>Ya tienen su panel empresarial en ${APP_NAME}. Desde ahí pueden comprar cupos, crear las cuentas de sus clientes o colaboradores y enviarles su invitación.</p>
         <p>Crea tu contraseña para entrar:</p>`,
        { label: "Crear mi contraseña", url: link.url }
      ),
    });
  } catch (e) {
    warning = ` La empresa se creó, pero no se pudo enviar el correo: ${e instanceof Error ? e.message : ""}`;
  }

  revalidatePath("/admin/empresas");
  return { error: null, success: `Empresa creada e invitación enviada a ${email}.${warning}` };
}
