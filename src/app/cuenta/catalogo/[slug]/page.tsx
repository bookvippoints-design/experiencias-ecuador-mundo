import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { NationalGallery, InternationalGallery } from "@/components/DestinationGallery";
import { PRODUCT_FIELDS, inclusions, exclusions, conditionLines, type Product } from "@/lib/products";
import { money } from "@/lib/format";
import { INVITATION_INFO_URL, INVITATION_DESTINATIONS_MAP_URL } from "@/lib/brand";
import { BuyPanel } from "./BuyPanel";

export default async function ProductoDetalle({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ modo?: string }>;
}) {
  const profile = await requireRole("user");
  const { slug } = await params;
  const { modo } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_FIELDS).eq("slug", slug).eq("active", true).maybeSingle();
  if (!data) notFound();
  const p = data as Product;

  return (
    <>
      <TopBar profile={profile} eyebrow={p.category === "escape" ? "PAQUETE" : "TARJETA DE PUNTOS"} title={p.name} />
      <main className="portal-content">
        <p><Link href="/cuenta/catalogo" style={{ color: "var(--naranja-oscuro)" }}>← Volver al catálogo</Link></p>
        <div className="detail-layout">
          <div>
            <div className="detail-photo" style={{ backgroundImage: p.image_url ? `url('${p.image_url}')` : undefined }}>
              <span className="hero__ref">Imagen referencial</span>
            </div>
            <section className="panel">
              <h2>{p.tagline}</h2>
              <p>{p.description}</p>
              <h3>Incluye</h3>
              <ul className="check-list">{inclusions(p).map((l) => <li key={l}>{l}</li>)}</ul>
              <h3>No incluye</h3>
              <ul className="check-list cross-list">{exclusions(p).map((l) => <li key={l}>{l}</li>)}</ul>
              <h3>Condiciones</h3>
              <ul className="conditions-list">{conditionLines(p).map((l) => <li key={l}>{l}</li>)}</ul>
              {p.international_count > 0 && (
                <div className="btn-row" style={{ marginTop: "1rem" }}>
                  <a className="btn-blue btn-small" href={INVITATION_INFO_URL} target="_blank" rel="noreferrer">Cómo funciona la invitación internacional</a>
                  <a className="btn-ghost btn-small" href={INVITATION_DESTINATIONS_MAP_URL} target="_blank" rel="noreferrer">Mapa de destinos e impuestos por noche</a>
                </div>
              )}
            </section>
          </div>
          <BuyPanel
            slug={p.slug}
            priceLabel={money(p.price)}
            purchasable={p.purchasable}
            initialMode={modo === "gift" ? "gift" : "self"}
            hasInternational={p.international_count > 0}
          />
        </div>

        {p.national_count > 0 && (
          <>
            <div className="section-title"><h2>Elige tu destino en Ecuador</h2></div>
            <NationalGallery />
          </>
        )}
        {p.international_count > 0 && (
          <>
            <div className="section-title"><h2>Algunos de los más de 130 destinos internacionales</h2></div>
            <InternationalGallery />
          </>
        )}
      </main>
    </>
  );
}
