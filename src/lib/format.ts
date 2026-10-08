export function money(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Precio por confirmar";
  const n = Number(value);
  return `US$${n.toLocaleString("es-EC", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function points(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("es-EC")} puntos`;
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

export function longDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
}

export type EntitlementKind = "national" | "international" | "points";

export const KIND_LABEL: Record<EntitlementKind, string> = {
  national: "Escapada nacional",
  international: "Invitación hotelera internacional",
  points: "Puntos para ahorro en hoteles",
};

export interface EntitlementRow {
  id: string;
  code: string;
  kind: EntitlementKind;
  status: "available" | "requested" | "used";
  valid_until: string | null;
  national_days: number | null;
  national_nights: number | null;
  points: number | null;
  points_credited_at: string | null;
  invitation_delivered_at: string | null;
  invitation_registered_at: string | null;
  travel_deadline: string | null;
  destination: string | null;
  gift_id: string | null;
  owner_id: string;
  purchaser_id: string;
  order_id: string;
}

export type EffectiveStatus = "available" | "requested" | "used" | "expired";

export function effectiveStatus(e: Pick<EntitlementRow, "kind" | "status" | "valid_until">): EffectiveStatus {
  if (e.status === "available" && e.kind !== "points" && e.valid_until && new Date(e.valid_until) <= new Date()) {
    return "expired";
  }
  return e.status;
}

export const STATUS_LABEL: Record<EffectiveStatus, string> = {
  available: "Disponible",
  requested: "Reserva solicitada",
  used: "Utilizado",
  expired: "Vencido",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  payment_reported: "Pago reportado",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  requested: "Solicitada",
  in_progress: "En gestión",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

export function entitlementTitle(e: Pick<EntitlementRow, "kind" | "national_days" | "national_nights" | "points">): string {
  if (e.kind === "national") return `Escapada nacional · ${e.national_days} días y ${e.national_nights} ${e.national_nights === 1 ? "noche" : "noches"}`;
  if (e.kind === "international") return "Invitación hotelera internacional";
  return points(e.points);
}
