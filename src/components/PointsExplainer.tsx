import { POINTS_MANUAL_URL } from "@/lib/brand";

/** Explica en una línea qué son los puntos de regalo. */
export function PointsExplainer() {
  return (
    <p className="points-explainer">
      <strong>¿Cómo recibes tu ahorro?</strong> Te lo entregamos en puntos de BookVipPoints, nuestro programa de viajero frecuente hotelero: cada punto vale hasta US$1. Los usas en la plataforma BookVipPoints como pago parcial de tus reservas de hotel en Ecuador y el mundo. No es dinero en efectivo ni un valor adicional a los puntos, y no caducan.{" "}
      <a href={POINTS_MANUAL_URL} target="_blank" rel="noreferrer">▶ Mira cómo usarlos</a>
    </p>
  );
}
