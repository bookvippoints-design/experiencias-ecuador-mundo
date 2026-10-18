import Link from "next/link";
import { PointsLoginButton } from "@/components/PointsLoginButton";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCT_FIELDS, type Product } from "@/lib/products";
import { effectiveStatus, type EntitlementRow } from "@/lib/format";
import { POINTS_VALUE_NOTE } from "@/lib/brand";
import { PurchaseCountdown } from "@/components/PurchaseCountdown";
import { loadPurchaseWindow } from "@/lib/purchase-window";

export default async function CuentaHome() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const [{ data: products }, { data: ents }, { data: pending }] = await Promise.all([
    supabase.from("products").select(PRODUCT_FIELDS).eq("active", true).order("sort"),
    supabase.from("entitlements").select("*"),
    supabase.from("orders").select("id").eq("buyer_id", profile.userId).in("status", ["pending_payment", "payment_reported"]),
  ]);
  const all = (products ?? []) as Product[];
  const escapes = all.filter((p) => p.category === "escape");
  const cards = all.filter((p) => p.category === "points");

  const mine = (ents ?? []) as EntitlementRow[];
  const available = (kind: string) => mine.filter((e) => e.kind === kind && effectiveStatus(e) === "available").length;
  const nationals = available("national");
  const internationals = available("international");
  const pointsAvailable = mine
    .filter((e) => e.kind === "points" && effectiveStatus(e) === "available")
    .reduce((s, e) => s + (e.points ?? 0), 0);
  const received = mine.filter((e) => e.gift_id && e.purchaser_id !== profile.userId).length;
  const firstName = profile.fullName.split(" ")[0];
  const win = await loadPurchaseWindow(supabase, profile.userId);

  return (
    <>
      <TopBar profile={profile} eyebrow="TU CATÁLOGO PRIVADO" title={`Hola, ${firstName}`} />
      <main className="portal-content">
        <p className="content-lead" style={{ marginTop: 0 }}>Estos son tus beneficios para disfrutar y regalar.</p>

        {received > 0 && (
          <p className="warn-box">
            🎁 Tienes {received} {received === 1 ? "experiencia regalada" : "experiencias regaladas"} en tu cuenta.{" "}
            <Link href="/cuenta/experiencias" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>Verlas</Link>
          </p>
        )}

        <div className="quick-grid">
          <Link href="/cuenta/catalogo" className="quick-card quick-card--orange">
            <span className="quick-card__icon" aria-hidden="true">🛍️</span>
            <span className="quick-card__text"><strong>Ver paquetes</strong><span>Para ti o para regalar</span></span>
            <span className="quick-card__go" aria-hidden="true">→</span>
          </Link>
          <Link href="/cuenta/experiencias" className="quick-card">
            <span className="quick-card__icon" aria-hidden="true">🧳</span>
            <span className="quick-card__text">
              <strong>Usar o regalar lo que ya tengo</strong>
              <span>{nationals} {nationals === 1 ? "escapada" : "escapadas"} · {internationals} {internationals === 1 ? "invitación" : "invitaciones"}{pointsAvailable > 0 ? ` · ${pointsAvailable.toLocaleString("es-EC")} puntos` : ""}</span>
            </span>
            <span className="quick-card__go" aria-hidden="true">→</span>
          </Link>
        </div>

        {/* 1. Plazo de 14 días para comprar */}
        <PurchaseCountdown endsAt={win.endsAt} variant="home" />

        {/* 2. Paquetes */}
        <div className="section-title">
          <h2>✈️ Paquetes para viajar</h2>
          <Link href="/cuenta/comparar">Compararlos lado a lado →</Link>
        </div>
        <p className="content-lead">Escapadas en Ecuador e invitaciones hoteleras en más de 130 destinos del mundo. Para ti o para regalar.</p>
        <div className="product-grid">{escapes.map((p) => <ProductCard key={p.id} product={p} canBuy={win.open} />)}</div>
        <p className="field-hint" style={{ marginTop: ".75rem" }}>
          Invitación internacional: fee de emisión US$0; los impuestos y tasas del hotel o resort
          los paga el viajero y varían por destino y temporada.
        </p>

        {/* 3. Puntos (solo si hay tarjetas activas en el catálogo) */}
        {cards.length > 0 && (
          <>
            <div className="section-title"><h2>⭐ Tarjetas de puntos</h2><PointsLoginButton /></div>
            <p className="content-lead">Ahorra en hoteles de Ecuador y el mundo: cada punto equivale a hasta US$1 de ahorro.</p>
            <div className="product-grid">{cards.map((p) => <ProductCard key={p.id} product={p} canBuy={win.open} />)}</div>
            <p className="field-hint" style={{ marginTop: ".75rem" }}>{POINTS_VALUE_NOTE}</p>
          </>
        )}

        {/* 4. Mis experiencias */}
        <div className="section-title">
          <h2>Mis experiencias</h2>
          <Link href="/cuenta/experiencias">Ver y canjear →</Link>
        </div>
        <div className="stat-grid">
          <Link href="/cuenta/experiencias" className="stat-card" style={{ textDecoration: "none" }}>
            <span className="stat-card__value">{nationals}</span>
            <span className="stat-card__label">{nationals === 1 ? "Escapada nacional disponible" : "Escapadas nacionales disponibles"}</span>
          </Link>
          <Link href="/cuenta/experiencias" className="stat-card" style={{ textDecoration: "none" }}>
            <span className="stat-card__value">{internationals}</span>
            <span className="stat-card__label">{internationals === 1 ? "Invitación internacional por pedir" : "Invitaciones internacionales por pedir"}</span>
          </Link>
          {pointsAvailable > 0 && (
            <Link href="/cuenta/puntos" className="stat-card" style={{ textDecoration: "none" }}>
              <span className="stat-card__value">{pointsAvailable.toLocaleString("es-EC")}</span>
              <span className="stat-card__label">Puntos por canjear</span>
            </Link>
          )}
          <Link href="/cuenta/pedidos" className="stat-card" style={{ textDecoration: "none" }}>
            <span className="stat-card__value">{pending?.length ?? 0}</span>
            <span className="stat-card__label">Pedidos en proceso</span>
          </Link>
        </div>
      </main>
    </>
  );
}
