"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasPassword, recoveryTokenHash } from "@/lib/auth/access-links";

export interface InviteState {
  error: string | null;
}

const MAX_ATTEMPTS = 10;

/** El cliente confirma su correo; si coincide, lo llevamos a crear su contraseña. */
export async function confirmInviteAction(token: string, _prev: InviteState, formData: FormData): Promise<InviteState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[A-Z0-9]{8,32}$/.test(token)) return { error: "Esta invitación no es válida." };
  const admin = createAdminClient();
  const { data: inv } = await admin.from("print_invites").select("token, user_id, failed_attempts").eq("token", token).maybeSingle();
  if (!inv) return { error: "Esta invitación no es válida." };
  if (inv.failed_attempts >= MAX_ATTEMPTS) {
    return { error: "Esta invitación se bloqueó por seguridad. Escríbenos por WhatsApp y te ayudamos." };
  }
  const { data: person } = await admin.from("profiles").select("email").eq("user_id", inv.user_id).maybeSingle();
  if (!person || person.email.toLowerCase() !== email) {
    await admin.from("print_invites").update({ failed_attempts: inv.failed_attempts + 1 }).eq("token", token);
    return { error: "Ese correo no coincide con esta invitación. Escribe el correo que aparece en tu invitación impresa." };
  }
  if (await hasPassword(inv.user_id)) redirect("/login");
  // Se verifica aquí mismo para que la sesión quede guardada antes de ir a crear la contraseña.
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: await recoveryTokenHash(person.email) });
  if (error) return { error: "No pudimos abrir tu invitación. Inténtalo de nuevo en un momento o escríbenos por WhatsApp." };
  await admin.from("print_invites").update({ used_at: new Date().toISOString(), failed_attempts: 0 }).eq("token", token);
  redirect("/set-password");
}
