import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { PRODUCT_FIELDS, inclusions, type Product } from "@/lib/products";
import { money } from "@/lib/format";
import { ProductEditor } from "./ProductEditor";

export default async function AdminCatalogo() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_FIELDS).order("sort");
  const products = (data ?? []) as Product[];

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Catálogo" />
      <main className="portal-content">
        <p className="content-lead">
          Edita nombre, precio, cantidades, duración, vigencia y condiciones. Un producto sin precio no se puede comprar.
          Los cambios aplican a compras nuevas; los pedidos existentes conservan lo que se compró.
        </p>
        {products.map((p) => (
          <section className="panel" key={p.id}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              {p.image_url && (
                <div style={{ width: 140, height: 90, borderRadius: 10, backgroundImage: `url('${p.image_url}')`, backgroundSize: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 220 }}>
                <h2 style={{ margin: 0 }}>{p.name} <span className="pill">{p.category === "escape" ? "Paquete" : "Tarjeta de puntos"}</span></h2>
                <p style={{ margin: ".25rem 0" }}>
                  <strong>{money(p.price)}</strong> · {p.purchasable ? "Compra habilitada" : "Compra deshabilitada"} · {p.active ? "Visible" : "Oculto"}
                </p>
                <ul className="check-list">{inclusions(p).map((l) => <li key={l}>{l}</li>)}</ul>
                <ProductEditor product={p} />
              </div>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
