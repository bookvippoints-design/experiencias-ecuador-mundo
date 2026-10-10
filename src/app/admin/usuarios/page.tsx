import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { shortDate } from "@/lib/format";
import { RpcButton } from "@/components/RpcButton";

const ROLE: Record<string, string> = { admin: "Administración", company: "Empresa", user: "Usuario" };
const VIA: Record<string, string> = { admin: "Administración", company: "Empresa", gift: "Regalo" };

export default async function AdminUsuarios({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const profile = await requireRole("admin");
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("user_id, role, full_name, email, phone, created_via, created_at, companies(name)")
    .order("created_at", { ascending: false })
    .limit(500);
  const term = q.replace(/[,()%*\\]/g, " ").trim();
  if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  const [{ data: users }, { data: blocked }] = await Promise.all([query, supabase.rpc("admin_payment_blocked_users")]);
  const blockedIds = new Map(((blocked ?? []) as { user_id: string; rejections: number }[]).map((b) => [b.user_id, b.rejections]));

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Usuarios" />
      <main className="portal-content">
        <form className="inline-form" style={{ marginBottom: "1rem" }}>
          <input name="q" defaultValue={q} placeholder="Buscar por nombre o correo" style={{ minWidth: 280 }} />
          <button className="btn-blue btn-small" type="submit">Buscar</button>
        </form>
        <div className="table-card">
          <table className="simple-table">
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Tipo</th><th>Empresa</th><th>Cuenta creada por</th><th>Desde</th><th>Reportes de pago</th></tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.user_id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}{u.phone && <div className="exp-card__meta">{u.phone}</div>}</td>
                  <td>{ROLE[u.role]}</td>
                  <td>{(u.companies as unknown as { name: string } | null)?.name ?? "—"}</td>
                  <td>{VIA[u.created_via]}</td>
                  <td>{shortDate(u.created_at)}</td>
                  <td>
                    {blockedIds.has(u.user_id) ? (
                      <>
                        <span className="pill pill--orange">Bloqueados ({blockedIds.get(u.user_id)} rechazados)</span>
                        <RpcButton fn="admin_unblock_payment_reports" args={{ p_user_id: u.user_id }} label="Desbloquear" variant="btn-ghost"
                          confirm="¿Permitir que esta persona vuelva a reportar pagos?" />
                      </>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
