import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { payphoneBoxEnabled } from "@/lib/payphone-box";
import { loadPurchaseWindow } from "@/lib/purchase-window";
import { accessPriceUsd, whatsappUrl, PURCHASE_WINDOW_REASON, POINTS_MANUAL_URL } from "@/lib/brand";
import { money } from "@/lib/format";
import { ReactivationPayBox } from "./ReactivationPayBox";

export const dynamic = "force-dynamic";

export default async function Reactivar() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const win = await loadPurchaseWindow(supabase, profile.userId);
  if (win.open) redirect("/cuenta/catalogo");
  const price = accessPriceUsd();
  const help = whatsappUrl("Hola, quiero reactivar mi acceso a Experiencias Ecuador y el Mundo");

  return (
    <>
      <TopBar profile={profile} eyebrow="REACTIVAR" title="Reactiva tu acceso a los paquetes" />
      <main className="portal-content">
        <div className="checkout">
          <section className="checkout__summary">
            <span className="how-block__eyebrow">Plazo de compra finalizado</span>
            <h2>Vuelve a tener 14 días para comprar</h2>
            <p>{PURCHASE_WINDOW_REASON} Tu plazo de 14 días terminó, pero puedes reactivarlo cuando quieras.</p>
            <ul className="check-list">
              <li>14 días nuevos para comprar el Escape Esencial, Plus o Premium.</li>
              <li>Puntos de regalo por cada compra en ese plazo: 250, 500 o 1.000 según el paquete.</li>
              <li>Lo que ya compraste sigue en tu cuenta y conserva su vigencia.</li>
              <li>Pago con tarjeta de crédito o débito procesado por PayPhone. No guardamos los datos de tu tarjeta.</li>
            </ul>
            <div className="checkout__total"><span>Reactivación (pago único)</span><strong>{money(price)}</strong></div>
            <p className="field-hint"><a href={POINTS_MANUAL_URL} target="_blank" rel="noreferrer" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>▶ Mira los videos de cómo usar tus puntos</a></p>
            <Link href="/cuenta" className="field-hint">← Volver a Inicio</Link>
          </section>
          <section className="checkout__pay">
            <h3>Condiciones de la reactivación</h3>
            <ul className="check-list" style={{ fontSize: ".9rem" }}>
              <li>La reactivación abre un nuevo plazo de 14 días, contados desde que se aprueba el pago, para comprar paquetes con los precios especiales vigentes.</li>
              <li>No incluye ningún paquete: los paquetes se compran por separado dentro del plazo.</li>
              <li>Los puntos de regalo (250, 500 o 1.000 según el paquete) aplican a las compras pagadas dentro del nuevo plazo. Son para quien compra, no caducan y no se pueden regalar.</li>
              <li>Los precios y la disponibilidad de los paquetes pueden cambiar a lo largo del año.</li>
              <li>Al terminar el nuevo plazo, tu cuenta sigue abierta para ver, usar y regalar lo que compraste, y puedes volver a reactivarla.</li>
              <li>El pago de la reactivación no es reembolsable una vez aprobado.</li>
            </ul>
            <h3 style={{ marginTop: "1.5rem" }}>Datos de pago</h3>
            {payphoneBoxEnabled() ? (
              <ReactivationPayBox />
            ) : (
              <p>El pago con tarjeta todavía no está activo. <a href={help} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a> y te ayudamos a reactivar tu acceso.</p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
