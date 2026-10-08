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
