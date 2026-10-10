export interface IntlDestination {
  id: string;
  city: string;
  country: string;
  region: string;
  days: number;
  nights: number;
  tax_per_night: number;
  active: boolean;
}

export const INTL_DESTINATION_FIELDS = "id, city, country, region, days, nights, tax_per_night, active";

/** Texto con el que se guarda el destino en la solicitud ("Ciudad, País"). */
export function destinationLabel(d: Pick<IntlDestination, "city" | "country">): string {
  return `${d.city}, ${d.country}`;
}

/** Impuestos estimados de toda la estadía (impuesto por noche × noches). */
export function estimatedTaxes(d: Pick<IntlDestination, "nights" | "tax_per_night">): number {
  return Math.round(Number(d.tax_per_night) * d.nights * 100) / 100;
}

export function usd(n: number): string {
  return `US$${Number(n).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const TAX_NOTE =
  "Valores referenciales por habitación para 2 personas; los impuestos y tasas los paga el viajero y pueden variar por temporada. En algunos resorts del Caribe el todo incluido es obligatorio y se paga al hotel.";
