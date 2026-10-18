import Link from "next/link";
import { APP_NAME, INVITATION_INFO_URL, INVITATION_TERMS_URL, GALAPAGOS_NOTE, PURCHASE_WINDOW_REASON } from "@/lib/brand";

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
        de las empresas afiliadas. El acceso a la plataforma lo habilita la empresa; las experiencias se compran por separado.
      </p>

      <h2>2. Paquetes y vigencia</h2>
      <p>
        Cada paquete indica en su ficha qué incluye, su precio y su vigencia (12, 18 o 24 meses contados desde la
        aprobación del pago). La vigencia es el plazo para solicitar y usar las escapadas nacionales y para solicitar
        las invitaciones hoteleras internacionales.
      </p>

      <h2>2.1. Plazo de 14 días para comprar</h2>
      <ul>
        <li>{PURCHASE_WINDOW_REASON}</li>
        <li>Desde que el titular crea su contraseña y entra por primera vez a su portal, tiene 14 días para comprar paquetes.</li>
        <li>Terminado el plazo, la cuenta sigue abierta: puede ver, usar y regalar lo que ya compró, pero no comprar paquetes nuevos.</li>
        <li>El titular puede reactivar el plazo desde su portal, con el pago que allí se indica. Cada reactivación abre 14 días nuevos.</li>
        <li>Una vez comprado un paquete, rige su propia vigencia de 12, 18 o 24 meses.</li>
      </ul>

      <h2>3. Escapadas nacionales</h2>
      <ul>
        <li><strong>Las escapadas nacionales NO se pueden usar en temporada alta, vacaciones ni feriados.</strong></li>
        <li>Son para 2 personas, con desayuno, en Quito, Guayaquil, Manta, Cuenca, Loja o Galápagos (Puerto Ayora), en los hoteles del catálogo vigente.</li>
        <li>{GALAPAGOS_NOTE}</li>
        <li>Se solicitan con un mínimo de 30 días de anticipación. Respondemos en 24 a 48 horas hábiles.</li>
        <li>Mientras la solicitud está pendiente se pueden cambiar las fechas. Si no hay disponibilidad, se ofrecen otras fechas.</li>
        <li><strong>Una vez confirmado el hospedaje, no se puede anular ni se reintegra el paquete.</strong> Cancelar o no presentarse significa perder la escapada.</li>
        <li>No incluyen transporte, otras comidas ni consumos adicionales.</li>
      </ul>

      <h2>4. Invitación hotelera internacional</h2>
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

      <h2>5. Puntos de regalo</h2>
      <ul>
        <li>
          Cada punto equivale a hasta US$1 de ahorro como pago parcial en reservas de hotel nacionales o internacionales,
          sujeto a disponibilidad. Los puntos no son efectivo ni saldo para pagar íntegramente una reserva. Los puntos no caducan.
        </li>
        <li>
          Por cada paquete comprado dentro del plazo de 14 días, el comprador recibe puntos de regalo: 250 con el Escape
          Esencial, 500 con el Escape Plus y 1.000 con el Escape Premium. También aplica si el paquete se compra para regalar,
          pero los puntos quedan siempre para quien compra y no se pueden regalar.
        </li>
        <li>Los puntos se acreditan en la cuenta BookVipPoints del titular cuando este los canjea desde su portal.</li>
      </ul>

      <h2>6. Regalos</h2>
      <ul>
        <li>Cualquier experiencia se puede comprar para regalar o regalar después de comprarla, mientras esté disponible y vigente.</li>
        <li>El correo del destinatario se escribe dos veces y debe coincidir.</li>
        <li>
          El regalo es definitivo: al enviarse pasa a la cuenta del destinatario y quien lo regala no puede cancelarlo
          ni recuperarlo. Regalar no cambia la fecha de vencimiento.
        </li>
        <li>Los puntos de regalo por compra no se pueden regalar. Una invitación internacional ya registrada no puede regalarse.</li>
        <li>Los regalos comprados se entregan apenas se confirma el pago.</li>
      </ul>

      <h2>7. Pagos</h2>
      <p>
        Los pagos se realizan con tarjeta de crédito o débito dentro de la plataforma, procesados por PayPhone. Las experiencias,
        los regalos y los cupos se acreditan automáticamente cuando PayPhone aprueba el pago; la plataforma no guarda los datos
        de la tarjeta. Si un pago no se completa, no se realiza ningún cobro. Los pagos por otros medios, como depósito o
        transferencia, se acreditan cuando el equipo los verifica. Los reportes de pago falsos pueden bloquear la cuenta.
      </p>

      <h2>8. Datos personales</h2>
      <p>
        Usamos tus datos solo para gestionar tu cuenta, tus compras, regalos y reservas. La empresa que te dio acceso
        ve tu nombre, correo y si activaste tu cuenta, pero no tus compras ni tus reservas.
      </p>
    </main>
  );
}
