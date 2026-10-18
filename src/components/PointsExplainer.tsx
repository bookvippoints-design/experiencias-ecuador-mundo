import { POINTS_MANUAL_URL } from "@/lib/brand";

/** Explica en una línea qué son los puntos de regalo. */
export function PointsExplainer() {
  return (
    <p className="points-explainer">
      <strong>¿Qué son los puntos?</strong> Cada punto equivale a hasta US$1 de descuento como pago parcial cuando reservas
      hoteles en Ecuador y el mundo con BookVipPoints. No son efectivo y no caducan.{" "}
      <a href={POINTS_MANUAL_URL} target="_blank" rel="noreferrer">▶ Mira cómo usarlos</a>
    </p>
  );
}
