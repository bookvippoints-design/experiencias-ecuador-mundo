import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { TopBar } from "@/components/TopBar";
import { NationalGallery, InternationalGallery } from "@/components/DestinationGallery";
import {
  INVITATION_INFO_URL,
  INVITATION_DESTINATIONS_MAP_URL,
  GALAPAGOS_NOTE,
  NATIONAL_RULE,
  NATIONAL_MIN_DAYS,
  NATIONAL_RESPONSE,
  NATIONAL_NO_CANCEL,
} from "@/lib/brand";

function Steps({ items, tone = "blue" }: { items: { title: string; text: string }[]; tone?: "blue" | "orange" }) {
  return (
    <ol className="how-steps">
      {items.map((s, i) => (
        <li key={s.title} className="how-step">
          <span className={`how-step__num how-step__num--${tone}`}>{i + 1}</span>
          <strong>{s.title}</strong>
          <span>{s.text}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function ComoFunciona() {
  const profile = await requireRole("user");

  return (
    <>
      <TopBar profile={profile} eyebrow="AYUDA" title="Cómo funcionan tus beneficios" />
      <main className="portal-content">
        <a href="/cuenta/manual" className="manual-cta">Ver el manual de usuario completo, paso a paso</a>
        <p className="content-lead" style={{ marginTop: 0 }}>
          Todo lo que necesitas saber para disfrutar o regalar tus escapadas e invitaciones.
        </p>
        <nav className="how-tabs" aria-label="Secciones">
          <a href="#nacional">Escapadas nacionales</a>
          <a href="#internacional">Invitación internacional</a>
          <a href="#regalos">Regalos</a>
        </nav>

        {/* NACIONAL */}
        <section id="nacional" className="how-block">
          <span className="how-block__eyebrow">Ecuador</span>
          <h2>Escapadas nacionales</h2>
          <p className="content-lead">Hospedaje para 2 personas con desayuno en Quito, Guayaquil, Manta, Cuenca, Loja o Galápagos (Puerto Ayora).</p>
          <NationalGallery />
          <Steps
            items={[
              { title: "Elige ciudad y fechas", text: `En "Mis beneficios activados" toca "Canjear: reservar escapada". Pide con al menos ${NATIONAL_MIN_DAYS} días de anticipación.` },
              { title: "Te confirmamos", text: `Revisamos la disponibilidad del hotel. ${NATIONAL_RESPONSE}` },
              { title: "Viaja y disfruta", text: "Presenta tu confirmación en el hotel. El desayuno está incluido." },
            ]}
          />
          <ul className="check-list">
            <li>Escape Esencial: 2 días y 1 noche. Escape Plus y Premium: 3 días y 2 noches por escapada.</li>
            <li>Mientras tu solicitud está pendiente puedes cambiar las fechas. Si no hay disponibilidad, no la pierdes: te ofrecemos otras fechas.</li>
            <li><strong>{NATIONAL_NO_CANCEL}</strong></li>
            <li>{NATIONAL_RULE}</li>
            <li>{GALAPAGOS_NOTE}</li>
            <li>Se solicitan y usan dentro de la vigencia del paquete: 12, 18 o 24 meses desde el pago aprobado.</li>
          </ul>
          <div className="btn-row">
            <a className="btn-blue btn-small" href="/catalogo-hoteles-nacional.pdf" target="_blank" rel="noreferrer">Ver hoteles participantes (PDF)</a>
          </div>
        </section>

        {/* INTERNACIONAL */}
        <section id="internacional" className="how-block">
          <div className="how-block__head">
            <div>
              <span className="how-block__eyebrow">Más de 130 destinos</span>
              <h2>Invitación hotelera internacional</h2>
              <p className="content-lead">Hospedaje en hoteles y resorts del mundo, desde 4 días y 3 noches hasta 8 días y 7 noches según el destino.</p>
            </div>
            <div className="fee-seal">
              <span>En tu paquete</span>
              <strong>Fee US$0</strong>
              <span>de emisión</span>
            </div>
          </div>
          <p className="warn-box">
            <strong>Importante:</strong> los impuestos gubernamentales y las tasas del hotel o resort los paga el viajero; varían por
            destino y temporada. En algunos resorts del Caribe (por ejemplo Cancún o Punta Cana) el plan todo incluido es obligatorio y se paga al hotel.
          </p>
          <Steps
            items={[
              { title: "Pide tu invitación", text: 'En "Mis beneficios activados" toca "Canjear: pedir invitación" y elige el destino.' },
              { title: "Regístrala en 30 días", text: "Recibes la invitación por correo; regístrala a tu nombre con su código QR." },
              { title: "Paga impuestos y tasas", text: "Dentro de los 7 días siguientes al registro." },
              { title: "Elige fecha y viaja", text: "Recibes tus credenciales y tienes 18 meses para viajar." },
            ]}
          />
          <ul className="check-list">
            <li>Una invitación por año, sin repetir destino.</li>
            <li>
              Dos invitaciones no pueden usarse en el mismo destino (no pueden viajar 4 personas al mismo lugar).{" "}
              <strong>Incumplir estas reglas puede anular todos los certificados.</strong>
            </li>
            <li>La mayoría de habitaciones admite máximo 2 adultos. No incluye alimentación ni transporte.</li>
          </ul>
          <div className="btn-row">
            <Link className="btn-orange btn-small" href="/cuenta/destinos">Ver destinos, estadías e impuestos</Link>
            <a className="btn-blue btn-small" href={INVITATION_INFO_URL} target="_blank" rel="noreferrer">Ver la guía completa de la invitación</a>
            <a className="btn-ghost btn-small" href={INVITATION_DESTINATIONS_MAP_URL} target="_blank" rel="noreferrer">Mapa de destinos</a>
          </div>
          <InternationalGallery />
        </section>

        {/* REGALOS */}
        <section id="regalos" className="how-block">
          <span className="how-block__eyebrow how-block__eyebrow--orange">Para regalar</span>
          <h2>Cómo regalar una experiencia</h2>
          <Steps
            tone="orange"
            items={[
              { title: "Elige qué regalar", text: 'Regala algo que ya tienes desde "Mis beneficios activados".' },
              { title: "Escribe su correo dos veces", text: "Así evitamos errores: si no coinciden, no se envía." },
              { title: "Revisa y envía", text: "El regalo es definitivo: pasa a la cuenta de la otra persona y no se puede recuperar." },
              { title: "Le llega al instante", text: "Recibe un correo con su tarjeta de regalo y crea su contraseña para usarlo." },
            ]}
          />
          <ul className="check-list">
            <li>Regalar no cambia la fecha de vencimiento.</li>
            <li>Los regalos comprados se entregan cuando se confirma el pago.</li>
          </ul>
          <div className="btn-row">
            <Link className="btn-orange btn-small" href="/cuenta/regalos">Ir a regalos</Link>
          </div>
        </section>
      </main>
    </>
  );
}
