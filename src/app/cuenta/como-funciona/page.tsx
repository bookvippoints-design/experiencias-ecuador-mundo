import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { TopBar } from "@/components/TopBar";
import { NationalGallery, InternationalGallery } from "@/components/DestinationGallery";
import {
  INVITATION_INFO_URL,
  INVITATION_DESTINATIONS_MAP_URL,
  POINTS_MANUAL_URL,
  BONUS_REGISTER_URL,
  WELCOME_BONUS_POINTS,
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
      <TopBar profile={profile} eyebrow="GUÍA PASO A PASO" title="Cómo funcionan tus beneficios" />
      <main className="portal-content">
        <p className="content-lead" style={{ marginTop: 0 }}>
          Todo lo que necesitas saber para disfrutar o regalar tus escapadas, invitaciones y puntos.
        </p>
        <nav className="how-tabs" aria-label="Secciones">
          <a href="#nacional">Escapadas nacionales</a>
          <a href="#internacional">Invitación internacional</a>
          <a href="#puntos">Puntos</a>
          <a href="#regalos">Regalos</a>
        </nav>

        {/* NACIONAL */}
        <section id="nacional" className="how-block">
          <span className="how-block__eyebrow">Ecuador</span>
          <h2>Escapadas nacionales</h2>
          <p className="content-lead">Hospedaje para 2 personas con desayuno en Quito, Guayaquil, Manta, Cuenca o Loja.</p>
          <p className="rule-box">{NATIONAL_RULE}</p>
          <NationalGallery />
          <Steps
            items={[
              { title: "Elige ciudad y fechas", text: `En "Mis experiencias" toca "Canjear: reservar escapada". Pide con al menos ${NATIONAL_MIN_DAYS} días de anticipación.` },
              { title: "Te confirmamos", text: `Revisamos la disponibilidad del hotel. ${NATIONAL_RESPONSE}` },
              { title: "Viaja y disfruta", text: "Presenta tu confirmación en el hotel. El desayuno está incluido." },
            ]}
          />
          <ul className="check-list">
            <li>Escape Esencial: 2 días y 1 noche. Escape Plus y Premium: 3 días y 2 noches por escapada.</li>
            <li>Mientras tu solicitud está pendiente puedes cambiar las fechas. Si no hay disponibilidad, no la pierdes: te ofrecemos otras fechas.</li>
            <li><strong>{NATIONAL_NO_CANCEL}</strong></li>
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
              { title: "Pide tu invitación", text: 'En "Mis experiencias" toca "Canjear: pedir invitación" y elige el destino.' },
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
            <a className="btn-blue btn-small" href={INVITATION_INFO_URL} target="_blank" rel="noreferrer">Ver la guía completa de la invitación</a>
            <a className="btn-ghost btn-small" href={INVITATION_DESTINATIONS_MAP_URL} target="_blank" rel="noreferrer">Mapa de destinos e impuestos</a>
          </div>
          <InternationalGallery />
        </section>

        {/* PUNTOS */}
        <section id="puntos" className="how-block">
          <span className="how-block__eyebrow how-block__eyebrow--orange">Ahorro en hoteles</span>
          <h2>Puntos BookVipPoints</h2>
          <p className="content-lead">
            Cada punto equivale a <strong>hasta US$1 de ahorro</strong> como pago parcial al reservar hoteles en Ecuador y el mundo.
          </p>
          <Steps
            tone="orange"
            items={[
              { title: "Obtén tus puntos", text: `Gratis con el bono de bienvenida (${WELCOME_BONUS_POINTS} puntos) o con una tarjeta de 250, 500 o 1.000 puntos.` },
              { title: "Canjea tu tarjeta", text: 'Si compraste una tarjeta, toca "Canjear mis puntos" y escribe el correo de tu cuenta BookVipPoints; te avisamos al acreditarlos.' },
              { title: "Reserva y ahorra", text: "En BookVipPoints busca tu hotel y aplica tus puntos como parte del pago." },
            ]}
          />
          <div className="video-cta">
            <span className="video-cta__icon" aria-hidden="true">▶</span>
            <div className="video-cta__text">
              <strong>Aprende a usar tus puntos en 8 videos cortos</strong>
              <span>Desde crear tu cuenta hasta tu primera reserva.</span>
            </div>
            <a className="btn-orange btn-small" href={POINTS_MANUAL_URL} target="_blank" rel="noreferrer">Ver el manual en video</a>
          </div>
          <ul className="check-list">
            <li>Los puntos no caducan.</li>
            <li>No son efectivo ni pagan el total de una reserva; el ahorro depende del hotel y la disponibilidad.</li>
            <li>Las tarjetas de puntos se regalan completas. El bono de bienvenida no se puede regalar.</li>
          </ul>
          <div className="btn-row">
            <a className="btn-blue btn-small" href={BONUS_REGISTER_URL} target="_blank" rel="noreferrer">Obtener mis {WELCOME_BONUS_POINTS} puntos gratis</a>
          </div>
        </section>

        {/* REGALOS */}
        <section id="regalos" className="how-block">
          <span className="how-block__eyebrow how-block__eyebrow--orange">Para regalar</span>
          <h2>Cómo regalar una experiencia</h2>
          <Steps
            tone="orange"
            items={[
              { title: "Elige qué regalar", text: 'Compra con "Regalarlo" o regala algo que ya tienes desde "Mis experiencias".' },
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
