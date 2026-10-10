export interface Product {
  id: string;
  slug: string;
  category: "escape" | "points";
  name: string;
  tagline: string | null;
  description: string | null;
  price: number | null;
  purchasable: boolean;
  validity_months: number | null;
  national_count: number;
  national_days: number | null;
  national_nights: number | null;
  national_people: number | null;
  breakfast_included: boolean;
  international_count: number;
  points: number;
  conditions: string | null;
  image_url: string | null;
  highlight: string | null;
  sort: number;
  active: boolean;
}

export const PRODUCT_FIELDS =
  "id, slug, category, name, tagline, description, price, purchasable, validity_months, national_count, national_days, national_nights, national_people, breakfast_included, international_count, points, conditions, image_url, highlight, sort, active";

export function inclusions(p: Product): string[] {
  const list: string[] = [];
  if (p.national_count > 0) {
    list.push(
      `${p.national_count} ${p.national_count === 1 ? "escapada nacional" : "escapadas nacionales"} de ${p.national_days} días y ${p.national_nights} ${p.national_nights === 1 ? "noche" : "noches"} para ${p.national_people ?? 2} personas${p.breakfast_included ? ", con desayuno" : ""}`
    );
  }
  if (p.international_count > 0) {
    list.push(
      `${p.international_count} ${p.international_count === 1 ? "invitación hotelera internacional" : "invitaciones hoteleras internacionales"}: más de 130 destinos, de 4 días y 3 noches hasta 8 días y 7 noches según destino`
    );
  }
  if (p.points > 0) list.push(`${p.points.toLocaleString("es-EC")} puntos = hasta US$${p.points.toLocaleString("es-EC")} de ahorro en hoteles`);
  if (p.validity_months) list.push(`Vigencia de ${p.validity_months} meses desde el pago aprobado`);
  return list;
}

export function exclusions(p: Product): string[] {
  if (p.category === "points") return ["Los puntos no son efectivo ni saldo para pagar una reserva completa"];
  const list = ["Transporte y comidas distintas al desayuno"];
  if (p.international_count > 0) {
    list.push("Impuestos gubernamentales y tasas del hotel o resort de la invitación internacional (los paga el viajero)");
  }
  return list;
}

export function conditionLines(p: Product): string[] {
  return (p.conditions ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
}
