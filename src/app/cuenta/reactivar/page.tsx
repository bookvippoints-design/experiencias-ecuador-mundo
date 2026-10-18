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
            <h3>Datos de pago</h3>
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
