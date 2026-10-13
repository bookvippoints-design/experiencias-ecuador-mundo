import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGiftEmails } from "@/lib/notifications";
import { sendMail, emailLayout, escapeHtml } from "@/lib/email";
import { appUrl } from "@/lib/brand";
import type { AccessLink } from "@/lib/auth/access-links";

export interface OrderForFulfillment {
  code: string;
  mode: string;
  buyer_id: string;
  product_snapshot: unknown;
}

/**
 * Correos que salen cuando un pedido queda aprobado (por administración o por
 * PayPhone): el regalo al destinatario, o el aviso "ya está activo" al comprador.
 * Devuelve un aviso si algún correo no se pudo enviar.
 */
export async function sendOrderApprovedEmails(order: OrderForFulfillment, giftId: string | null, access: AccessLink | null): Promise<string | null> {
  if (order.mode === "gift") {
    if (giftId && access) return sendGiftEmails(giftId, access);
    return null;
  }
  try {
    const admin = createAdminClient();
    const { data: buyer } = await admin.from("profiles").select("full_name, email").eq("user_id", order.buyer_id).single();
    const product = order.product_snapshot as { name: string };
    if (buyer) {
      await sendMail({
        to: buyer.email,
        subject: `Tu ${product.name} ya está activo`,
        html: emailLayout(
          `<h2 style="margin:0 0 8px;color:#c4520a">¡Listo, ${escapeHtml(buyer.full_name)}!</h2>
           <p>Confirmamos tu pago del pedido <strong>${order.code}</strong>. Tus experiencias de <strong>${escapeHtml(product.name)}</strong> ya están en tu cuenta, con su vigencia y el acceso para solicitar tu reserva.</p>`,
          { label: "Ver mis experiencias", url: `${appUrl()}/cuenta/experiencias` }
        ),
      });
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "No se pudo enviar el correo";
  }
}
