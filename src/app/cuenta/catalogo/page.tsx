import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Crumbs } from "@/components/Crumbs";
import { ProductCard } from "@/components/ProductCard";
import { PurchaseCountdown } from "@/components/PurchaseCountdown";
import { PRODUCT_FIELDS, type Product } from "@/lib/products";
import { PURCHASE_WINDOW_REASON } from "@/lib/brand";
import { loadPurchaseWindow } from "@/lib/purchase-window";

/** Paquetes: lo que incluye cada uno, su precio y "Activar paquete". */
export default async function Catalogo() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_FIELDS).eq("active", true).eq("category", "escape").order("sort");
  const escapes = (data ?? []) as Product[];
  const win = await loadPurchaseWindow(supabase, profile.userId);
  const months = [...new Set(escapes.map((p) => p.validity_months).filter((m): m is number => !!m))].sort((a, b) => a - b).map((m) => `${m} meses`);
  const monthsText = months.length > 1 ? `${months.slice(0, -1).join(", ")} o ${months[months.length - 1]}` : months[0] ?? "";

  return (
    <>
      <TopBar profile={profile} eyebrow="PRECIOS ESPECIALES" title="Paquetes" />
      <main className="portal-content flow">
        <Crumbs trail={[{ href: "/cuenta", label: "Inicio" }, { label: "Paquetes" }]} />
        {win.open && (
          <p className="activate-banner">
            <strong>Actívalo hoy</strong> y disfrútalo mientras dure tu paquete activado{monthsText && ` (${monthsText})`}.
          </p>
        )}
        <PurchaseCountdown endsAt={win.endsAt} variant="bar" />
        {win.open && <p className="lead-justify">{PURCHASE_WINDOW_REASON}</p>}
        <div className="product-grid">{escapes.map((p) => <ProductCard key={p.id} product={p} canBuy={win.open} />)}</div>
        <p className="field-hint lead-justify">
          Precios por paquete, para 2 personas. Invitación internacional: los impuestos y tasas del hotel o resort los paga el viajero y
          varían por destino y temporada.
        </p>
      </main>
    </>
  );
}
