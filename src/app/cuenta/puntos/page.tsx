import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { shortDate, type EntitlementRow } from "@/lib/format";

export default async function MisPuntos() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const { data } = await supabase.from("entitlements").select("*").eq("kind", "points").order("created_at", { ascending: false });
  const rows = (data ?? []) as (EntitlementRow & { product_name: string | null })[];
  const total = rows.reduce((s, r) => s + (r.points ?? 0), 0);
  const credited = rows.filter((r) => r.points_credited_at).reduce((s, r) => s + (r.points ?? 0), 0);

  return (
    <>
      <TopBar profile={profile} eyebrow="MI CUENTA" title="Mis puntos" />
      <main className="portal-content">
        <section className="points-hero">
          <div>
            <div style={{ fontSize: ".85rem", opacity: 0.9 }}>Puntos para ahorro en hoteles</div>
            <div className="points-hero__value">{total.toLocaleString("es-EC")}</div>
            <div style={{ fontSize: ".85rem" }}>{credited.toLocaleString("es-EC")} ya acreditados en BookVipPoints</div>
          </div>
          <Link href="/cuenta/catalogo" className="btn-orange">Comprar tarjetas de puntos</Link>
        </section>

        <section className="panel">
          <h2>Cómo funcionan tus puntos</h2>
          <ul className="check-list">
            <li>Te dan un <strong>ahorro parcial</strong> al reservar hospedaje.</li>
            <li>No son efectivo ni saldo para pagar una reserva completa.</li>
            <li><strong>No caducan</strong>, a diferencia de la vigencia de las experiencias.</li>
            <li>Los acreditamos manualmente en tu cuenta BookVipPoints después de confirmar el pago.</li>
            <li>Puedes regalarlos completos mientras no estén acreditados.</li>
          </ul>
        </section>

        <div className="table-card">
          <table className="simple-table">
            <thead><tr><th>Origen</th><th>Código</th><th>Puntos</th><th>Estado</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="empty-state">Todavía no tienes puntos.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.product_name}{r.gift_id ? " · regalo" : ""}</td>
                  <td>{r.code}</td>
                  <td><strong>{(r.points ?? 0).toLocaleString("es-EC")}</strong></td>
                  <td>{r.points_credited_at ? `Acreditados el ${shortDate(r.points_credited_at)}` : "Por acreditar"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
