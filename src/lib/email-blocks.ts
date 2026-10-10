import { escapeHtml } from "@/lib/email";
import { BRAND, BONUS_REGISTER_URL, WELCOME_BONUS_POINTS, appUrl, whatsappDisplay, whatsappUrl } from "@/lib/brand";

function step(n: number, html: string) {
  return `<tr><td valign="top" style="padding:6px 12px 6px 0;width:30px"><div style="width:28px;height:28px;line-height:28px;border-radius:14px;background:${BRAND.orange};color:#fff;font-weight:bold;text-align:center">${n}</div></td><td style="padding:6px 0">${html}</td></tr>`;
}

/** Los 3 pasos para activar la cuenta (invitación y regalos). */
export function activationStepsHtml(buttonLabel: string) {
  return `<div style="background:#fff1e6;border-radius:12px;padding:16px 18px;margin:18px 0">
    <div style="font-weight:bold;font-size:16px;margin-bottom:6px">Activa tu cuenta en 3 pasos:</div>
    <table role="presentation" cellpadding="0" cellspacing="0">
      ${step(1, `Haz clic en el botón <strong>"${escapeHtml(buttonLabel)}"</strong>.`)}
      ${step(2, `<strong>Crea tu propia contraseña.</strong> No te la enviamos: la eliges tú y te servirá para entrar a tu portal cuando quieras, con este correo.`)}
      ${step(3, `¡Listo! Descubre tus beneficios y disfrútalos o regálalos.`)}
    </table>
  </div>`;
}

/** Recuadro del bono de bienvenida de BookVipPoints. */
export function welcomeBonusHtml() {
  return `<div style="background:${BRAND.skyLight};border-radius:12px;padding:14px 18px;margin:18px 0">
    <strong>Tu regalo de bienvenida:</strong> regístrate gratis en BookVipPoints y recibe <strong>${WELCOME_BONUS_POINTS} puntos</strong> (hasta US$${WELCOME_BONUS_POINTS} de ahorro en hoteles).
    <a href="${BONUS_REGISTER_URL}" style="color:${BRAND.orangeDark};font-weight:bold">Obtener mis puntos</a>
  </div>`;
}

/** Pie con el correo de ingreso, vigencia del enlace y ayuda. */
export function accessFooterHtml(email: string, linkExpires: boolean) {
  const site = appUrl().replace(/^https?:\/\//, "");
  return `<p style="font-size:13px;color:#5b6570;margin-top:18px">Tu correo para entrar: <strong>${escapeHtml(email)}</strong><br>
    ${linkExpires ? `Por seguridad, este enlace vence. Si ya venció, entra a ${site} y toca "¿Olvidaste tu contraseña?".<br>` : ""}
    ¿Dudas? Escríbenos por WhatsApp al <a href="${whatsappUrl()}" style="color:${BRAND.orangeDark}">${whatsappDisplay()}</a>.</p>`;
}
