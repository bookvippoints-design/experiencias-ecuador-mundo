import { POINTS_MANUAL_URL } from "@/lib/brand";

/** Explica en una línea qué son los puntos de regalo. */
export function PointsExplainer() {
  return (
    <p className="points-explainer">
      <strong>¿Qué son los puntos?</strong> Los puntos se usan en la plataforma BookVipPoints: cada punto equivale a hasta US$1 de descuento como pago parcial de tus reservas de hotel en Ecuador y el mundo. No es dinero adicional ni efectivo, y no caducan.{" "}
      <a href={POINTS_MANUAL_URL} target="_blank" rel="noreferrer">▶ Mira cómo usarlos</a>
    </p>
  );
}
