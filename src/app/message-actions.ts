"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { flushPendingMessageEmails } from "@/lib/message-emails";

/** Despacha los correos de mensajes pendientes. Se llama después de cada acción que genera avisos. */
export async function flushMessages(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  try {
    await flushPendingMessageEmails();
  } catch {
    // Si el correo falla, el mensaje igual queda en la bandeja del cliente.
  }
}

/** Administración: mensaje a un cliente (correo + bandeja) o a todos (solo bandeja). */
export async function sendAdminMessage(input: { to: "one" | "all"; email: string; title: string; body: string }) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return { error: "Acceso no autorizado" };
  let userId: string | null = null;
  if (input.to === "one") {
    const email = input.email.trim().toLowerCase();
    const { data: person } = await createAdminClient().from("profiles").select("user_id, role").eq("email", email).maybeSingle();
    if (!person || person.role !== "user") return { error: "No encontramos un cliente con ese correo." };
    userId = person.user_id;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_send_message", { p_user_id: userId, p_title: input.title, p_body: input.body });
  if (error) return { error: error.message };
  if (userId) await flushPendingMessageEmails().catch(() => 0);
  revalidatePath("/admin/mensajes");
  return { error: null };
}
