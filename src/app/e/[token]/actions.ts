"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasPassword, recoveryTokenHash } from "@/lib/auth/access-links";

export interface TeamInviteState {
  error: string | null;
}

/** Abre la invitación al equipo: verifica el enlace y lleva a crear la contraseña. */
export async function openTeamInviteAction(token: string, _prev: TeamInviteState): Promise<TeamInviteState> {
  if (!/^[A-Z0-9]{16,32}$/.test(token)) return { error: "Esta invitación no es válida." };
  const admin = createAdminClient();
  const { data: inv } = await admin.from("team_invites").select("token, user_id, expires_at").eq("token", token).maybeSingle();
  if (!inv) return { error: "Esta invitación no es válida." };
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return { error: "Esta invitación ya venció. Pídele a tu administrador que te la reenvíe." };
  }
  if (await hasPassword(inv.user_id)) redirect("/login");
  const { data: person } = await admin.from("profiles").select("email").eq("user_id", inv.user_id).maybeSingle();
  if (!person) return { error: "Esta invitación no es válida." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: await recoveryTokenHash(person.email) });
  if (error) return { error: "No pudimos abrir tu invitación. Inténtalo de nuevo en un momento." };
  await admin.from("team_invites").update({ used_at: new Date().toISOString() }).eq("token", token);
  redirect("/set-password");
}
