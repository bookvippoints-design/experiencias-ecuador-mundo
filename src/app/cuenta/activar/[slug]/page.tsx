import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Crumbs } from "@/components/Crumbs";
import { PRODUCT_FIELDS, inclusions, conditionLines, type Product } from "@/lib/products";
import { money } from "@/lib/format";
import { payphoneBoxEnabled } from "@/lib/payphone-box";
import { whatsappUrl } from "@/lib/brand";
import { loadPurchaseWindow } from "@/lib/purchase-window";
import { ActivatePanel } from "./ActivatePanel";

/** Activar paquete: resumen, términos y pago. Sin preguntar si es para regalar. */
export default async function Activar({ params }: { params: Promise<{ slug: string }> }) {
  const profile = await requireRole("user");
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_FIELDS).eq("slug", slug).eq("active", true).maybeSingle();
  const p = data as Product | null;
  if (!p || !p.purchasable) notFound();
  const win = await loadPurchaseWindow(supabase, profile.userId);
  if (!win.open) redirect("/cuenta/catalogo");

  return (
    <>
      <TopBar profile={profile} eyebrow="ACTIVAR PAQUETE" title={p.name} />
      <main className="portal-content flow narrow">
        <Crumbs trail={[{ href: "/cuenta", label: "Inicio" }, { href: "/cuenta/catalogo", label: "Paquetes" }, { label: `Activar ${p.name}` }]} />

        {p.validity_months && (
          <p className="activate-banner">
            <strong>Actívalo hoy</strong> y disfrútalo en los próximos {p.validity_months} meses.
          </p>
        )}

        <section className="summary-card">
          <div>
            <span className="summary-card__eyebrow">PAQUETE</span>
            <strong>{p.name}</strong>
          </div>
          <span className="summary-card__price">{money(p.price)}</span>
        </section>
        <ul className="check-list">
          {inclusions(p).map((l) => <li key={l}>{l}</li>)}
        </ul>

        <p className="info-box lead-justify">
          Al activarlo, tus experiencias quedan en <strong>Mis beneficios activados</strong>. Desde ahí, cuando quieras y mientras estén
          vigentes, decides si las usas o las regalas.
        </p>

        <details className="how-use">
          <summary>Ver condiciones</summary>
          <ul>{conditionLines(p).map((l) => <li key={l}>{l}</li>)}</ul>
        </details>

        {payphoneBoxEnabled() ? (
          <ActivatePanel slug={p.slug} />
        ) : (
          <p className="warn-box">
            El pago con tarjeta todavía no está activo.{" "}
            <a href={whatsappUrl(`Hola, quiero activar el ${p.name}`)} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a>.
          </p>
        )}

        <Link href="/cuenta/catalogo" className="text-link-center">‹ Volver a los paquetes</Link>
      </main>
    </>
  );
}
