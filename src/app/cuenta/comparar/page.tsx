import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { PRODUCT_FIELDS, type Product } from "@/lib/products";
import { money } from "@/lib/format";

export default async function Comparar() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_FIELDS).eq("category", "escape").eq("active", true).order("sort");
  const ps = (data ?? []) as Product[];

  const rows: { label: string; value: (p: Product) => string }[] = [
    { label: "Precio total", value: (p) => money(p.price) },
    { label: "Escapadas nacionales", value: (p) => String(p.national_count) },
    { label: "Duración de cada escapada", value: (p) => (p.national_count ? `${p.national_days} días y ${p.national_nights} ${p.national_nights === 1 ? "noche" : "noches"}` : "—") },
    { label: "Personas por escapada", value: (p) => (p.national_count ? String(p.national_people ?? 2) : "—") },
    { label: "Desayuno nacional", value: (p) => (p.breakfast_included ? "Incluido" : "—") },
    { label: "Invitaciones hoteleras internacionales", value: (p) => String(p.international_count) },
    { label: "Puntos para ahorro en hoteles", value: (p) => p.points.toLocaleString("es-EC") },
    { label: "Vigencia desde el pago aprobado", value: (p) => (p.validity_months ? `${p.validity_months} meses` : "—") },
  ];

  return (
    <>
      <TopBar profile={profile} eyebrow="CATÁLOGO" title="Compara los paquetes" />
      <main className="portal-content">
        <div className="compare-mobile mobile-only">
          <div className="compare-mobile__head" style={{ gridTemplateColumns: `repeat(${ps.length}, 1fr)` }}>
            {ps.map((p) => (
              <div key={p.id} className={`compare-mobile__name${p.highlight ? " is-featured" : ""}`}>{p.name}</div>
            ))}
          </div>
          {rows.map((r) => (
            <div key={r.label} className="compare-mobile__row">
              <div className="compare-mobile__label">{r.label}</div>
              <div className="compare-mobile__values" style={{ gridTemplateColumns: `repeat(${ps.length}, 1fr)` }}>
                {ps.map((p) => <div key={p.id} className={p.highlight ? "is-featured" : undefined}>{r.value(p)}</div>)}
              </div>
            </div>
          ))}
          <div className="compare-mobile__values compare-mobile__actions" style={{ gridTemplateColumns: `repeat(${ps.length}, 1fr)` }}>
            {ps.map((p) => (
              <div key={p.id}>
                <Link href={`/cuenta/catalogo/${p.slug}?modo=self`} className="btn-blue btn-small">Para mí</Link>
                <Link href={`/cuenta/catalogo/${p.slug}?modo=gift`} className="btn-orange btn-small">Regalarlo</Link>
              </div>
            ))}
          </div>
        </div>
        <div className="compare-wrap desktop-only">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Beneficio</th>
                {ps.map((p) => <th key={p.id} className={p.highlight ? "is-featured" : undefined}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  {ps.map((p) => <td key={p.id}>{r.value(p)}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                {ps.map((p) => (
                  <td key={p.id}>
                    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                      <Link href={`/cuenta/catalogo/${p.slug}?modo=self`} className="btn-blue btn-small">Para mí</Link>
                      <Link href={`/cuenta/catalogo/${p.slug}?modo=gift`} className="btn-orange btn-small">Regalarlo</Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="field-hint" style={{ marginTop: ".75rem" }}>
          Invitación internacional: más de 130 destinos, de 4 días y 3 noches hasta 8 días y 7 noches según destino; fee de
          emisión US$0; impuestos y tasas del hotel o resort a cargo del viajero. Los puntos dan un ahorro parcial y no caducan.
        </p>
      </main>
    </>
  );
}
