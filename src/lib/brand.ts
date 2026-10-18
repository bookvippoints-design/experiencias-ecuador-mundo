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

/** Ingreso a la plataforma de puntos BookVipPoints. */
export const POINTS_LOGIN_URL = "https://bvpoints.netlify.app/login";

/** Precio del acceso que se vende al público en /acceso (US$). Configurable con ACCESS_PRICE_USD. */
export function accessPriceUsd(): number {
  const n = Number(process.env.ACCESS_PRICE_USD || "25");
  return Number.isFinite(n) && n > 0 ? n : 25;
}

/** Google Ads: conversión "Compra acceso Experiencias US$25". No son datos secretos. */
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-614254713";
export const GOOGLE_ADS_ACCESS_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_ACCESS_LABEL || "FTT_CPim3p4dEPmQ86QC";
/** Valor esperado de la conversión del acceso (US$). Solo se mide si el pago verificado coincide. */
export const GOOGLE_ADS_ACCESS_VALUE = 25;

/** Plazo para comprar paquetes desde que el cliente entra por primera vez a su portal. */
export const PURCHASE_WINDOW_DAYS = 14;
/** Puntos de regalo por comprar dentro del plazo (también guardados en products.bonus_points). */
export const BONUS_POINTS_BY_SLUG: Record<string, number> = { "escape-esencial": 250, "escape-plus": 500, "escape-premium": 1000 };
/** Justificación del plazo, igual en todos lados. */
export const PURCHASE_WINDOW_REASON =
  "Son precios especiales de hospedaje que conseguimos por tiempo limitado y que cambian a lo largo del año. Una vez comprado, cada paquete tiene de 12 a 24 meses para usarlo.";
/** Aclaración de Galápagos. */
export const GALAPAGOS_NOTE =
  "Galápagos (Puerto Ayora): incluye solo hospedaje y desayuno para 2 personas. No incluye vuelos, la tarjeta de control de tránsito ni la tasa de ingreso al Parque Nacional Galápagos.";
