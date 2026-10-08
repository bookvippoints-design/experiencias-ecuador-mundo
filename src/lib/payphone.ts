/**
 * Enlaces de pago de PayPhone. Se configuran como variables de entorno cuando
 * BookVipPoints los cree; mientras falten, el botón aparece como "Enlace de
 * pago pendiente" y el cliente puede comunicarse por WhatsApp.
 */
const PRODUCT_LINKS: Record<string, string | undefined> = {
  "escape-esencial": process.env.NEXT_PUBLIC_PAYPHONE_ESCAPE_ESENCIAL_URL,
  "escape-plus": process.env.NEXT_PUBLIC_PAYPHONE_ESCAPE_PLUS_URL,
  "escape-premium": process.env.NEXT_PUBLIC_PAYPHONE_ESCAPE_PREMIUM_URL,
  "puntos-250": process.env.NEXT_PUBLIC_PAYPHONE_PUNTOS_250_URL,
  "puntos-500": process.env.NEXT_PUBLIC_PAYPHONE_PUNTOS_500_URL,
  "puntos-1000": process.env.NEXT_PUBLIC_PAYPHONE_PUNTOS_1000_URL,
};

const PLAN_LINKS: Record<string, string | undefined> = {
  inicial: process.env.NEXT_PUBLIC_PAYPHONE_PLAN_INICIAL_URL,
  comercial: process.env.NEXT_PUBLIC_PAYPHONE_PLAN_COMERCIAL_URL,
  crecimiento: process.env.NEXT_PUBLIC_PAYPHONE_PLAN_CRECIMIENTO_URL,
  corporativo: process.env.NEXT_PUBLIC_PAYPHONE_PLAN_CORPORATIVO_URL,
};

export function productPaymentUrl(slug: string): string | null {
  return PRODUCT_LINKS[slug] || null;
}

export function planPaymentUrl(key: string): string | null {
  return PLAN_LINKS[key] || null;
}
