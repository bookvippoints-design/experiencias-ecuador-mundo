import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { ProductCard } from "@/components/ProductCard";
import { NationalGallery, InternationalGallery } from "@/components/DestinationGallery";
import { PRODUCT_FIELDS, type Product } from "@/lib/products";
import { effectiveStatus, type EntitlementRow } from "@/lib/format";
import { unsplashUrl, INTERNATIONAL_INSPIRATION } from "@/lib/destinations";
import { APP_SLOGAN } from "@/lib/brand";

export default async function CuentaHome() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const [{ data: products }, { data: ents }, { data: pending }] = await Promise.all([
    supabase.from("products").select(PRODUCT_FIELDS).eq("category", "escape").eq("active", true).order("sort"),
    supabase.from("entitlements").select("*"),
    supabase.from("orders").select("id").eq("buyer_id", profile.userId).in("status", ["pending_payment", "payment_reported"]),
  ]);
  const mine = (ents ?? []) as EntitlementRow[];
  const available = mine.filter((e) => effectiveStatus(e) === "available" && e.kind !== "points").length;
  const received = mine.filter((e) => e.gift_id && e.purchaser_id !== profile.userId).length;
  const firstName = profile.fullName.split(" ")[0];

  return (
    <>
      <TopBar profile={profile} eyebrow="MI CUENTA" title={`Hola, ${firstName}`} />
      <main className="portal-content">
        <section className="hero" style={{ backgroundImage: `url('${unsplashUrl(INTERNATIONAL_INSPIRATION[2].imageId, 1600, 600)}')` }}>
          <div className="hero__content">
            <span className="hero__eyebrow">{APP_SLOGAN}</span>
            <h2 className="hero__title">Escápate por Ecuador y el mundo, o regala un viaje inolvidable</h2>
            <p className="hero__text">Escapadas para dos con desayuno, invitaciones hoteleras en más de 130 destinos y puntos para ahorrar en hoteles.</p>
            <div className="btn-row">
              <Link href="/cuenta/catalogo" className="btn-orange">Ver el catálogo</Link>
              <Link href="/cuenta/comparar" className="btn-ghost">Comparar paquetes</Link>
            </div>
          </div>
          <span className="hero__ref">Imagen referencial</span>
        </section>

        {received > 0 && (
          <p className="warn-box">
            🎁 Tienes {received} {received === 1 ? "experiencia regalada" : "experiencias regaladas"} en tu cuenta.{" "}
            <Link href="/cuenta/experiencias" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>Verlas</Link>
          </p>
        )}

        <div className="stat-grid">
          <Link href="/cuenta/experiencias" className="stat-card" style={{ textDecoration: "none" }}>
            <span className="stat-card__value">{available}</span>
            <span className="stat-card__label">Experiencias disponibles</span>
          </Link>
          <Link href="/cuenta/pedidos" className="stat-card" style={{ textDecoration: "none" }}>
            <span className="stat-card__value">{pending?.length ?? 0}</span>
            <span className="stat-card__label">Pedidos en proceso</span>
          </Link>
          <Link href="/cuenta/regalos" className="stat-card" style={{ textDecoration: "none" }}>
            <span className="stat-card__value">🎁</span>
            <span className="stat-card__label">Regalar una experiencia</span>
          </Link>
        </div>

        <div className="section-title">
          <h2>Paquetes de experiencias</h2>
          <Link href="/cuenta/comparar">Comparar los tres →</Link>
        </div>
        <div className="product-grid">
          {((products ?? []) as Product[]).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        <div className="section-title"><h2>Escápate por Ecuador</h2></div>
        <NationalGallery />

        <div className="section-title">
          <h2>Y el mundo: más de 130 destinos</h2>
          <Link href="/cuenta/catalogo#invitacion">Cómo funciona la invitación →</Link>
        </div>
        <InternationalGallery />
      </main>
    </>
  );
}
