import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { RpcButton } from "@/components/RpcButton";
import { RegisterCompanyForm } from "./RegisterCompanyForm";
import { AdjustQuotaButton } from "./AdjustQuotaButton";
import { shortDate } from "@/lib/format";

const STATUS: Record<string, string> = { active: "Activa", read_only: "Solo consulta", blocked: "Bloqueada" };

export default async function AdminEmpresas() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const [{ data: companies }, { data: ledger }] = await Promise.all([
    supabase.from("companies").select("id, name, contact_email, status, created_at, logo_url").order("created_at", { ascending: false }),
    supabase.from("quota_ledger").select("company_id, delta, reason"),
  ]);

  const totals = new Map<string, { purchased: number; used: number; balance: number }>();
  for (const l of ledger ?? []) {
    const t = totals.get(l.company_id) ?? { purchased: 0, used: 0, balance: 0 };
    if (l.delta > 0) t.purchased += l.delta;
    if (l.reason === "user_created") t.used += -l.delta;
    t.balance += l.delta;
    totals.set(l.company_id, t);
  }

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Empresas y cupos" />
      <main className="portal-content">
        <section className="panel">
          <h2>Registrar empresa</h2>
          <p className="content-lead">
            El correo de acceso debe ser único en la plataforma. La empresa recibe un enlace para crear su contraseña.
          </p>
          <RegisterCompanyForm />
        </section>

        <section className="panel">
          <h2>Empresas ({companies?.length ?? 0})</h2>
          <div className="table-card">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Comprados</th>
                  <th>Utilizados</th>
                  <th>Disponibles</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(companies ?? []).map((c) => {
                  const t = totals.get(c.id) ?? { purchased: 0, used: 0, balance: 0 };
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <div className="exp-card__meta">{c.contact_email} · desde {shortDate(c.created_at)}</div>
                      </td>
                      <td>{STATUS[c.status]}</td>
                      <td>{t.purchased}</td>
                      <td>{t.used}</td>
                      <td><strong>{t.balance}</strong></td>
                      <td>
                        <div className="btn-row">
                          <AdjustQuotaButton companyId={c.id} companyName={c.name} />
                          {c.status !== "active" && (
                            <RpcButton fn="set_company_status" args={{ p_company_id: c.id, p_status: "active" }} label="Activar" variant="btn-blue" />
                          )}
                          {c.status !== "read_only" && (
                            <RpcButton fn="set_company_status" args={{ p_company_id: c.id, p_status: "read_only" }} label="Solo consulta" variant="btn-ghost" />
                          )}
                          {c.status !== "blocked" && (
                            <RpcButton
                              fn="set_company_status"
                              args={{ p_company_id: c.id, p_status: "blocked" }}
                              label="Bloquear"
                              variant="btn-ghost"
                              confirm={`¿Bloquear a ${c.name}? No podrá iniciar sesión.`}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="field-hint" style={{ marginTop: ".5rem" }}>
            Los cupos se suman al aprobar una compra en &quot;Compras de cupos&quot;. &quot;Ajustar cupos&quot; es solo para correcciones y queda registrado.
          </p>
        </section>
      </main>
    </>
  );
}
