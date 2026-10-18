"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MANUAL_URL = "https://go.bookvippoints.com/manual_usuario_bvpoints";
const REASON =
  "Son precios especiales de hospedaje que conseguimos por tiempo limitado y que cambian a lo largo del año. Una vez comprado, cada paquete tiene de 12 a 24 meses para usarlo.";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60) };
}

function longDate(iso: string) {
  return new Date(iso).toLocaleString("es-EC", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Guayaquil" });
}

/**
 * Contador del plazo de 14 días para comprar paquetes.
 * - "home": tarjeta grande de Inicio.
 * - "bar": franja compacta para Paquetes.
 * - "product": aviso en la ficha de un paquete, con sus puntos de regalo.
 * Si el plazo terminó, muestra el aviso y el botón "Reactivar mi acceso" (el precio se ve solo al tocarlo).
 */
export function PurchaseCountdown({ endsAt, variant, bonusPoints }: {
  endsAt: string | null;
  variant: "home" | "bar" | "product";
  bonusPoints?: number;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const end = endsAt ? new Date(endsAt).getTime() : null;
  const left = end ? end - now : null;
  const expired = left !== null && left <= 0;

  useEffect(() => {
    if (!end) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= end) { clearInterval(t); router.refresh(); }
    }, 30000);
    return () => clearInterval(t);
  }, [end, router]);

  if (!end) return null;

  if (expired) {
    return (
      <section className={`pw-expired${variant === "bar" ? " pw-expired--compact" : ""}`}>
        <span className="pw-eyebrow">Plazo de compra finalizado</span>
        <h3>Tu periodo de precios especiales terminó el {longDate(endsAt!)}</h3>
        <p>Ya no es posible comprar nuevos paquetes. Tu cuenta sigue activa: puedes ver, usar y regalar lo que ya tienes.</p>
        <div className="btn-row">
          <Link href="/cuenta/reactivar" className="btn-orange btn-small">Reactivar mi acceso</Link>
        </div>
      </section>
    );
  }

  const { d, h, m } = parts(left!);

  if (variant === "bar") {
    return (
      <div className="pw-bar" role="status">
        <span>⏳ <strong>Precios especiales:</strong> te quedan <strong>{d} {d === 1 ? "día" : "días"} y {h} h</strong> para comprar.</span>
        <span>Compra y recibe de regalo <strong>hasta 1.000 puntos</strong> (= hasta US$1.000 de ahorro en hoteles).</span>
      </div>
    );
  }

  if (variant === "product") {
    return (
      <div className="pw-product">
        <strong>🎁 {bonusPoints ? `Regalo: ${bonusPoints.toLocaleString("es-EC")} puntos = hasta US$${bonusPoints.toLocaleString("es-EC")} de ahorro en hoteles` : "Precio especial"}</strong>
        <p>
          Cómpralo antes del <strong>{longDate(endsAt!)}</strong>
          {bonusPoints ? <> y recibe además <strong>{bonusPoints.toLocaleString("es-EC")} puntos</strong>. Los puntos se usan en la plataforma BookVipPoints: cada punto equivale a hasta US$1 de descuento como pago parcial de tus reservas de hotel en Ecuador y el mundo. No es dinero adicional ni efectivo, y no caducan. Son para ti y no se pueden regalar. <a href={MANUAL_URL} target="_blank" rel="noreferrer">▶ Mira cómo usarlos</a></> : "."}
        </p>
        <span className="pw-product__left">Te quedan {d} d · {h} h · {m} min</span>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, 100 - (left! / (14 * 86400000)) * 100));
  return (
    <section className="pw-card">
      <span className="pw-eyebrow">⏳ Tus precios especiales están disponibles 14 días</span>
      <h3>Elige tu experiencia y recibe de regalo hasta 1.000 puntos para ahorrar en hoteles</h3>
      <p>{REASON}</p>
      <div className="pw-clock" aria-label={`Te quedan ${d} días, ${h} horas y ${m} minutos`}>
        <div><b>{d}</b><small>{d === 1 ? "día" : "días"}</small></div>
        <div><b>{String(h).padStart(2, "0")}</b><small>horas</small></div>
        <div><b>{String(m).padStart(2, "0")}</b><small>min</small></div>
      </div>
      <div className="pw-progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      <div className="pw-gifts">
        <div><b>250 Puntos</b><small>= hasta US$250 de ahorro en hoteles</small><em>con Escape Esencial</em></div>
        <div><b>500 Puntos</b><small>= hasta US$500 de ahorro en hoteles</small><em>con Escape Plus</em></div>
        <div><b>1.000 Puntos</b><small>= hasta US$1.000 de ahorro en hoteles</small><em>con Escape Premium</em></div>
      </div>
      <p className="pw-fine"><strong>¿Qué son los puntos?</strong> Los puntos se usan en la plataforma BookVipPoints: cada punto equivale a hasta US$1 de descuento como pago parcial de tus reservas de hotel en Ecuador y el mundo. No es dinero adicional ni efectivo, y no caducan. Son para quien compra y no se pueden regalar.</p>
      <div className="btn-row">
        <Link href="/cuenta/catalogo" className="btn-orange">Ver paquetes</Link>
        <a href={MANUAL_URL} target="_blank" rel="noreferrer" className="btn-blue">▶ Videos: cómo usar tus puntos</a>
      </div>
    </section>
  );
}
