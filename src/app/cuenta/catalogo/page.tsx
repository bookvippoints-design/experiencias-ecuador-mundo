import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { ProductCard } from "@/components/ProductCard";
import { NationalGallery, InternationalGallery } from "@/components/DestinationGallery";
import { PRODUCT_FIELDS, type Product } from "@/lib/products";
import { unsplashUrl, NATIONAL_DESTINATIONS } from "@/lib/destinations";
import { INVITATION_INFO_URL, INVITATION_DESTINATIONS_MAP_URL } from "@/lib/brand";

export default async function Catalogo() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_FIELDS).eq("active", true).order("sort");
  const products = (data ?? []) as Product[];
  const escapes = products.filter((p) => p.category === "escape");
  const cards = products.filter((p) => p.category === "points");

  return (
    <>
      <TopBar profile={profile} eyebrow="CATÁLOGO" title="Experiencias para disfrutar y regalar" />
      <main className="portal-content">
        <section className="hero" style={{ backgroundImage: `url('${unsplashUrl(NATIONAL_DESTINATIONS[0].imageId, 1600, 600)}')`, minHeight: 200 }}>
          <div className="hero__content">
            <span className="hero__eyebrow">Catálogo privado</span>
            <h2 className="hero__title">Elige para ti o para regalar</h2>
            <p className="hero__text">Cada paquete se puede comprar para ti o enviar como regalo con una dedicatoria y una tarjeta digital.</p>
          </div>
          <span className="hero__ref">Imagen referencial</span>
        </section>

        <div className="section-title">
          <h2>Paquetes de experiencias</h2>
          <Link href="/cuenta/comparar">Comparar paquetes →</Link>
        </div>
        <div className="product-grid">{escapes.map((p) => <ProductCard key={p.id} product={p} />)}</div>

        <div className="section-title"><h2>Tarjetas de puntos hoteleros</h2></div>
        <p className="info-box">
          Los puntos te dan un <strong>ahorro parcial</strong> al reservar hospedaje. No son efectivo ni saldo para pagar una
          reserva completa, y <strong>no caducan</strong>.
        </p>
        <div className="product-grid">{cards.map((p) => <ProductCard key={p.id} product={p} />)}</div>

        <div className="section-title"><h2>Destinos nacionales</h2></div>
        <p className="content-lead">
          Quito, Guayaquil, Manta, Cuenca y Loja, en hoteles seleccionados con desayuno.{" "}
          <a href="/catalogo-hoteles-nacional.pdf" target="_blank" rel="noreferrer" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>
            Ver hoteles participantes (PDF)
          </a>
        </p>
        <NationalGallery />

        <div className="section-title" id="invitacion"><h2>Invitación hotelera internacional</h2></div>
        <div className="panel">
          <ul className="check-list">
            <li>Más de 130 destinos en el mundo, desde 4 días y 3 noches hasta 8 días y 7 noches según destino.</li>
            <li>En estos paquetes el fee de emisión es US$0.</li>
            <li>Ocupación: 2 adultos y hasta 2 niños de hasta 11 años, según el hotel; muchos hoteles admiten solo 2 adultos.</li>
            <li>El viajero paga los impuestos gubernamentales y las tasas del hotel o resort, que varían por destino y temporada.</li>
            <li>Una vez emitida: 30 días para registrarla, 7 días para pagar impuestos y tasas, y 18 meses para viajar desde la activación.</li>
            <li>Una invitación por año, sin repetir destino. No incluye alimentación ni transporte.</li>
          </ul>
          <p className="warn-box">
            Dos invitaciones no pueden usarse en el mismo destino (no pueden viajar 4 personas al mismo destino). Incumplir esta
            regla puede anular todos los certificados. En algunos resorts del Caribe el todo incluido es obligatorio y se paga al hotel.
          </p>
          <div className="btn-row">
            <a className="btn-blue btn-small" href={INVITATION_INFO_URL} target="_blank" rel="noreferrer">Cómo funciona la invitación</a>
            <a className="btn-ghost btn-small" href={INVITATION_DESTINATIONS_MAP_URL} target="_blank" rel="noreferrer">Mapa de destinos e impuestos</a>
          </div>
        </div>
        <InternationalGallery />
      </main>
    </>
  );
}
