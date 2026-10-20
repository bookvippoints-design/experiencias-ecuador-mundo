import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { TopBar } from "@/components/TopBar";
import { Crumbs } from "@/components/Crumbs";
import { InternationalGallery } from "@/components/DestinationGallery";
import { ExtraTravelersNote } from "@/components/ExtraTravelersNote";
import { INVITATION_INFO_URL } from "@/lib/brand";

/** Beneficios en el Mundo: la invitación hotelera internacional, sin precios. */
export default async function BeneficiosMundo() {
  const profile = await requireRole("user");
  return (
    <>
      <TopBar profile={profile} eyebrow="BENEFICIOS" title="En el Mundo" />
      <main className="portal-content flow">
        <Crumbs trail={[{ href: "/cuenta", label: "Inicio" }, { label: "Beneficios en el Mundo" }]} />
        <Link href="/cuenta" className="back-link">‹ Regresar</Link>

        <section className="benefit-hero">
          <img src="/acceso/img/destino-mundo.webp" alt="Pareja en una terraza frente al mar" />
          <div className="benefit-hero__text">
            <span>BENEFICIOS EN EL MUNDO</span>
            <h2>Invitación hotelera internacional</h2>
          </div>
        </section>

        <p className="lead-justify">
          Hospedaje en hoteles y resorts de <strong>más de 130 destinos</strong>, con estadías desde 4 días y 3 noches hasta 8 días y 7
          noches, según el destino.
        </p>
        <p className="soft-note">Incluida en el <strong>Escape Plus</strong> y el <strong>Escape Premium</strong>.</p>

        <a href={INVITATION_INFO_URL} target="_blank" rel="noreferrer" className="big-action">Ver la explicación completa de la invitación ↗</a>

        <h3 className="sub-title">Algunos destinos</h3>
        <InternationalGallery />
        <Link href="/cuenta/destinos" className="text-link">Ver todos los destinos e impuestos por noche ›</Link>

        <ExtraTravelersNote />

        <details className="how-use">
          <summary>¿Cómo se usa?</summary>
          <ol>
            <li>En &quot;Mis beneficios activados&quot; pides tu invitación y eliges el destino.</li>
            <li>La registras a tu nombre en los 30 días siguientes.</li>
            <li>Pagas los impuestos y tasas del hotel o resort en los 7 días siguientes al registro; varían por destino y temporada.</li>
            <li>Tienes 18 meses para elegir la fecha y viajar.</li>
            <li>Una invitación por año, sin repetir destino. <strong>Dos invitaciones no pueden usarse en el mismo destino</strong>; incumplir esta regla puede anular todos los certificados.</li>
          </ol>
        </details>

        <Link href="/cuenta" className="back-big">‹ Regresar para conocer los beneficios en Ecuador</Link>
      </main>
    </>
  );
}
