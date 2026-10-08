import Link from "next/link";
import { APP_NAME, INVITATION_INFO_URL, INVITATION_TERMS_URL } from "@/lib/brand";

export const metadata = { title: `Términos y condiciones · ${APP_NAME}` };

export default function TerminosPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "2.5rem 1.5rem", lineHeight: 1.65 }}>
      <p><Link href="/login" style={{ color: "var(--naranja-oscuro)" }}>← Volver</Link></p>
      <h1 style={{ color: "var(--naranja-oscuro)" }}>Términos y condiciones · {APP_NAME}</h1>
      <p className="warn-box">
        Borrador para revisión de BookVipPoints antes de su publicación definitiva.
      </p>

      <h2>1. El programa</h2>
      <p>
        {APP_NAME} es un catálogo privado de experiencias de viaje al que acceden los clientes y colaboradores
        de las empresas afiliadas. La empresa paga el acceso de cada cuenta; las experiencias se compran por separado.
      </p>

      <h2>2. Paquetes y vigencia</h2>
      <p>
        Cada paquete indica en su ficha qué incluye, su precio y su vigencia (12, 18 o 24 meses contados desde la
        aprobación del pago). La vigencia es el plazo para solicitar y usar las escapadas nacionales y para solicitar
        las invitaciones hoteleras internacionales. Las escapadas nacionales son para 2 personas, con desayuno, en
        Quito, Guayaquil, Manta, Cuenca o Loja, en los hoteles del catálogo vigente y sujetas a disponibilidad.
      </p>

      <h2>3. Invitación hotelera internacional</h2>
      <ul>
        <li>Acceso a más de 130 destinos, desde 4 días y 3 noches hasta 8 días y 7 noches según destino.</li>
        <li>En estos paquetes el fee de emisión es US$0.</li>
        <li>
          El viajero paga los impuestos gubernamentales y las tasas del hotel o resort, que varían por destino y
          temporada. En algunos resorts del Caribe el plan todo incluido es obligatorio y se paga al hotel.
        </li>
        <li>
          Emitida la invitación, debe registrarse en 30 días; los impuestos y tasas se pagan dentro de 7 días tras el
          registro. Desde la activación hay 18 meses para viajar.
        </li>
        <li>
          Solo se puede usar una invitación por año, sin repetir destino. Dos invitaciones no pueden usarse en el mismo
          destino (no pueden viajar 4 personas al mismo destino). <strong>El incumplimiento de estas reglas puede anular
          todos los certificados.</strong>
        </li>
        <li>
          La invitación se rige además por sus propias condiciones: <a href={INVITATION_TERMS_URL} target="_blank" rel="noreferrer">condiciones de la invitación</a> ·{" "}
          <a href={INVITATION_INFO_URL} target="_blank" rel="noreferrer">cómo funciona</a>.
        </li>
      </ul>

      <h2>4. Puntos</h2>
      <p>
        Los puntos permiten un ahorro parcial en hospedajes. No son efectivo ni saldo para pagar íntegramente una
        reserva. Los puntos no caducan. Su acreditación en BookVipPoints se realiza manualmente tras confirmar el pago.
      </p>

      <h2>5. Regalos</h2>
      <ul>
        <li>Cualquier experiencia se puede comprar para regalar o regalar después de comprarla, mientras esté disponible y vigente.</li>
        <li>El correo del destinatario se escribe dos veces y debe coincidir.</li>
        <li>
          El regalo es definitivo: al enviarse pasa a la cuenta del destinatario y quien lo regala no puede cancelarlo
          ni recuperarlo. Regalar no cambia la fecha de vencimiento.
        </li>
        <li>Los puntos se regalan completos. Una invitación internacional ya registrada no puede regalarse.</li>
        <li>Los regalos comprados se entregan cuando se confirma el pago en PayPhone.</li>
      </ul>

      <h2>6. Pagos</h2>
      <p>
        Los pagos se realizan por PayPhone y se reportan desde la plataforma. Las experiencias se acreditan cuando el
        equipo confirma el pago.
      </p>

      <h2>7. Datos personales</h2>
      <p>
        Usamos tus datos solo para gestionar tu cuenta, tus compras, regalos y reservas. La empresa que te dio acceso
        ve tu nombre, correo y si activaste tu cuenta, pero no tus compras ni tus reservas.
      </p>
    </main>
  );
}
