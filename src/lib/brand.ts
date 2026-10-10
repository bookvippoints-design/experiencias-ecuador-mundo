export const APP_NAME = "Experiencias Ecuador y el Mundo";
export const APP_SLOGAN = "Para disfrutar y regalar";

export const BRAND = {
  blue: "#4aa8e0",
  blueDark: "#1f7fb8",
  orange: "#f07a1f",
  orangeDark: "#c4520a",
  skyLight: "#eaf6fd",
  text: "#2b2f33",
};

/** Página pública con la explicación completa de la invitación hotelera internacional. */
export const INVITATION_INFO_URL = "https://certificados.bookvippoints.com/invitacion-hotelera";
export const INVITATION_TERMS_URL = "https://www.redeemvacations.com/es/terms-of-use";
export const INVITATION_DESTINATIONS_MAP_URL =
  "https://bookvippoints-design.github.io/destinos_certificados/mapadestinos.html";

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Registro de BookVipPoints: el sistema externo da 100 puntos de bienvenida a cuentas nuevas. */
export const BONUS_REGISTER_URL = "https://bvpoints.netlify.app/registro";
export const WELCOME_BONUS_POINTS = 100;
/** Manual de usuario de BookVipPoints en 8 videos. */
export const POINTS_MANUAL_URL = "https://go.bookvippoints.com/manual_usuario_bvpoints";

/** WhatsApp de atención (solo dígitos, con código de país). */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "593981350463").replace(/\D/g, "");
export function whatsappUrl(message?: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
export function whatsappDisplay(): string {
  const n = WHATSAPP_NUMBER;
  return n.startsWith("593") && n.length === 12 ? `+593 ${n.slice(3, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : `+${n}`;
}

/** Reglas de la escapada nacional: deben aparecer igual en todos los textos. */
export const NATIONAL_RULE = "Las escapadas nacionales NO se pueden usar en temporada alta, vacaciones ni feriados.";
export const NATIONAL_MIN_DAYS = 30;
export const NATIONAL_RESPONSE = "Respondemos en 24 a 48 horas hábiles.";
export const NATIONAL_NO_CANCEL = "Una vez confirmado el hospedaje, no se puede anular ni se reintegra el paquete.";

/** Equivalencia de los puntos, siempre con su letra pequeña. */
export const POINTS_VALUE_NOTE =
  "Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales, sujeto a disponibilidad. No es efectivo ni paga el total de la reserva. Los puntos no caducan.";
