import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { appUrl, BRAND, whatsappDisplay, whatsappUrl } from "@/lib/brand";

/**
 * Envía por correo los mensajes individuales pendientes (los masivos nunca se
 * envían por correo: solo se ven dentro de la plataforma).
 */
export async function flushPendingMessageEmails(limit = 25): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("messages")
    .select("id, user_id, title, body, link")
    .eq("email_status", "pending")
    .not("user_id", "is", null)
    .order("created_at")
    .limit(limit);
  let sent = 0;
  for (const m of data ?? []) {
    // Marca primero para que dos procesos no envíen el mismo correo.
    const { data: claimed } = await admin.from("messages").update({ email_status: "sent" }).eq("id", m.id).eq("email_status", "pending").select("id");
    if (!claimed?.length) continue;
    try {
      const { data: person } = await admin.from("profiles").select("full_name, email").eq("user_id", m.user_id).single();
      if (!person) throw new Error("sin perfil");
      await sendMail({
        to: person.email,
        subject: m.title,
        html: emailLayout(
          `<h2 style="margin:0 0 8px;color:${BRAND.orangeDark}">${escapeHtml(m.title)}</h2>
           <p>Hola, ${escapeHtml(person.full_name.split(" ")[0] ?? "")}:</p>
           <p style="white-space:pre-line">${escapeHtml(m.body).replace(/(https:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#c4520a;font-weight:bold">${u.includes("manual_usuario") ? "Ver los videos" : u}</a>`)}</p>`,
          { label: "Ver mis mensajes", url: `${appUrl()}/cuenta/mensajes` },
          `<p style="font-size:13px;color:#5b6570;margin-top:16px">¿Quieres responder? Escríbenos por WhatsApp al <a href="${whatsappUrl()}" style="color:${BRAND.orangeDark}">${whatsappDisplay()}</a>.</p>`
        ),
      });
      sent++;
    } catch {
      await admin.from("messages").update({ email_status: "failed" }).eq("id", m.id);
    }
  }
  return sent;
}
