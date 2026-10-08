import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { generateGiftCardPdf, describeGiftItem, type GiftCardItem } from "@/lib/pdf/render";
import { appUrl, INVITATION_INFO_URL } from "@/lib/brand";
import type { AccessLink } from "@/lib/auth/access-links";

/** Lee un regalo con la llave de servidor (para correos y la tarjeta). */
export async function loadGift(giftId: string) {
  const admin = createAdminClient();
  const { data: gift, error } = await admin
    .from("gifts")
    .select("id, code, sender_id, recipient_id, recipient_name, recipient_email, dedication, created_at")
    .eq("id", giftId)
    .single();
  if (error || !gift) throw new Error(error?.message ?? "Regalo no encontrado");

  const [{ data: sender }, { data: items }] = await Promise.all([
    admin.from("profiles").select("full_name, email").eq("user_id", gift.sender_id).single(),
    admin
      .from("entitlements")
      .select("kind, valid_until, points, national_days, national_nights, seq")
      .eq("gift_id", gift.id)
      .order("kind")
      .order("seq"),
  ]);

  return {
    gift,
    senderName: sender?.full_name ?? "Alguien especial",
    senderEmail: sender?.email ?? null,
    items: (items ?? []) as GiftCardItem[],
  };
}

export async function giftCardPdf(giftId: string) {
  const { gift, senderName, items } = await loadGift(giftId);
  const pdf = await generateGiftCardPdf({
    code: gift.code,
    senderName,
    recipientName: gift.recipient_name,
    dedication: gift.dedication,
    items,
  });
  return { pdf, code: gift.code };
}

/**
 * Envía el regalo: al destinatario (con su botón de acceso) y una copia al
 * comprador. Devuelve un aviso si el correo no pudo salir; el regalo ya quedó
 * registrado de todas formas.
 */
export async function sendGiftEmails(giftId: string, access: AccessLink): Promise<string | null> {
  try {
    const { gift, senderName, senderEmail, items } = await loadGift(giftId);
    const pdf = await generateGiftCardPdf({
      code: gift.code,
      senderName,
      recipientName: gift.recipient_name,
      dedication: gift.dedication,
      items,
    });
    const hasInternational = items.some((i) => i.kind === "international");
    const list = items.map((i) => `<li>${escapeHtml(describeGiftItem(i))}</li>`).join("");
    const dedication = gift.dedication
      ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#eaf6fd;border-left:4px solid #f07a1f;font-style:italic">${escapeHtml(gift.dedication)}</blockquote>`
      : "";
    const accessText = access.mustSetPassword
      ? "Tu regalo ya está en tu cuenta. Crea tu contraseña con el botón para entrar y ver tus experiencias."
      : "Tu regalo ya está en tu cuenta. Inicia sesión con tu correo para verlo.";
    const international = hasInternational
      ? `<p style="font-size:13px;color:#6b7280">La invitación hotelera internacional no tiene costo de emisión. El viajero paga los impuestos gubernamentales y las tasas del hotel o resort, que varían por destino y temporada. <a href="${INVITATION_INFO_URL}" style="color:#c4520a">Conoce cómo funciona</a>.</p>`
      : "";

    await sendMail({
      to: gift.recipient_email,
      subject: `${senderName} te regaló una experiencia`,
      html: emailLayout(
        `<h2 style="margin:0 0 8px;color:#c4520a">¡${escapeHtml(gift.recipient_name)}, tienes un regalo!</h2>
         <p><strong>${escapeHtml(senderName)}</strong> te regaló:</p><ul>${list}</ul>${dedication}
         <p>${accessText}</p>${international}
         <p style="font-size:13px">Te adjuntamos tu tarjeta de regalo en PDF.</p>`,
        { label: access.mustSetPassword ? "Entrar a mi cuenta" : "Iniciar sesión", url: access.url }
      ),
      attachments: [{ filename: `regalo-${gift.code}.pdf`, content: pdf }],
    });

    if (senderEmail) {
      await sendMail({
        to: senderEmail,
        subject: `Tu regalo para ${gift.recipient_name} fue enviado`,
        html: emailLayout(
          `<p>Tu regalo <strong>${gift.code}</strong> ya está en la cuenta de <strong>${escapeHtml(gift.recipient_name)}</strong>.</p>
           <ul>${list}</ul>
           <p>Te adjuntamos la tarjeta de regalo para que la envíes o la imprimas.</p>`,
          { label: "Ver mis regalos", url: `${appUrl()}/cuenta/regalos` }
        ),
        attachments: [{ filename: `regalo-${gift.code}.pdf`, content: pdf }],
      });
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "No se pudo enviar el correo del regalo";
  }
}
