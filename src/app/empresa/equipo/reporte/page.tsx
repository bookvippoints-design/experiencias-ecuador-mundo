import Link from "next/link";
import { requireCompanyManager } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Crumbs } from "@/components/Crumbs";
import { longDate } from "@/lib/format";
import { reportRange, type ReportRow } from "./range";

export default async function ReporteEquipo({ searchParams }: { searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }> }) {
  const profile = await requireCompanyManager();
  const sp = await searchParams;
  const r = reportRange(sp);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("company_team_report", { p_from: r.from, p_to: r.to });
  const rows = (data ?? []) as ReportRow[];
  const byDept = new Map<string, { created: number; activated: number; people: ReportRow[] }>();
  for (const row of rows) {
    const d = byDept.get(row.department) ?? { created: 0, activated: 0, people: [] };
    d.created += row.created;
    d.activated += row.activated;
    d.people.push(row);
    byDept.set(row.department, d);
  }
  const depts = [...byDept.entries()].sort((a, b) => b[1].created - a[1].created);
  const total = rows.reduce((s, x) => s + x.created, 0);
  const max = Math.max(1, ...depts.map(([, d]) => d.created));
  const qs = new URLSearchParams({ periodo: r.periodo, desde: r.from, hasta: r.to }).toString();
  const label = r.periodo === "hoy" ? "hoy" : r.from === r.to ? longDate(r.from + "T12:00:00") : `del ${longDate(r.from + "T12:00:00")} al ${longDate(r.to + "T12:00:00")}`;

  return (
    <>
      <TopBar profile={profile} eyebrow="MI EQUIPO" title="Reporte por departamento" />
      <main className="portal-content flow narrow">
        <Crumbs trail={[{ href: "/empresa/equipo", label: "Mi equipo" }, { label: "Reporte" }]} />
        <nav className="segmented" aria-label="Periodo">
          <Link href="/empresa/equipo/reporte?periodo=hoy" className={r.periodo === "hoy" ? "is-active" : undefined}>Hoy</Link>
          <Link href="/empresa/equipo/reporte?periodo=mes" className={r.periodo === "mes" ? "is-active" : undefined}>Este mes</Link>
          <Link href={`/empresa/equipo/reporte?periodo=rango&desde=${r.from}&hasta=${r.to}`} className={r.periodo === "rango" ? "is-active" : undefined}>Elegir fechas</Link>
        </nav>
        {r.periodo === "rango" && (
          <form className="date-range" method="get">
            <input type="hidden" name="periodo" value="rango" />
            <div className="field"><label htmlFor="desde">Desde</label><input id="desde" name="desde" type="date" defaultValue={r.from} /></div>
            <div className="field"><label htmlFor="hasta">Hasta</label><input id="hasta" name="hasta" type="date" defaultValue={r.to} /></div>
            <button type="submit" className="btn-blue">Ver</button>
          </form>
        )}
        {error && <p className="error-state">No se pudo cargar el reporte: {error.message}</p>}

        <section className="balance-bar">
          <div><span className="balance-bar__hint">Accesos creados {label}</span></div>
          <strong>{total}</strong>
        </section>

        {depts.length === 0 ? (
          <p className="empty-state">No se crearon accesos en este periodo.</p>
        ) : (
          <section className="report-card">
            {depts.map(([name, d]) => (
              <details key={name} className="report-row">
                <summary>
                  <span className="report-row__top"><strong>{name}</strong><span>{d.created} · {d.activated} activados</span></span>
                  <span className="mini-bar mini-bar--blue" aria-hidden="true"><span style={{ width: `${Math.round((d.created / max) * 100)}%` }} /></span>
                </summary>
                <ul>
                  {d.people.map((p) => <li key={p.member_id}><span>{p.member_name}</span><span>{p.created} · {p.activated} activados</span></li>)}
                </ul>
              </details>
            ))}
          </section>
        )}
        <p className="field-hint">&quot;Activados&quot; = clientes que ya crearon su contraseña y entraron a su catálogo. Toca un departamento para ver cuántos creó cada persona.</p>
        <a href={`/empresa/equipo/reporte/descargar?${qs}`} className="btn-ghost btn-wide">Descargar en Excel</a>
      </main>
    </>
  );
}
