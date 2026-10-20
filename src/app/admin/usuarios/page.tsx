import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { shortDate } from "@/lib/format";
import { RpcButton } from "@/components/RpcButton";

const ROLE: Record<string, string> = { admin: "Administración", company: "Empresa", user: "Usuario" };
const VIA: Record<string, string> = { admin: "Administración", company: "Empresa", gift: "Regalo", purchase: "Compra web" };
const DAY = 86400000;

function windowLabel(ends: string | null): { text: string; closed: boolean } {
  if (!ends) return { text: "Empieza al activar", closed: false };
  const left = new Date(ends).getTime() - Date.now();
  if (left <= 0) return { text: `Cerrado el ${shortDate(ends)}`, closed: true };
  const days = Math.ceil(left / DAY);
  return { text: days === 1 ? "Último día" : `${days} días (hasta ${shortDate(ends)})`, closed: false };
}

export default async function AdminUsuarios({ searchParams }: { searchParams: Promise<{ q?: string; plazo?: string }> }) {
  const profile = await requireRole("admin");
  const { q = "", plazo = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("user_id, role, full_name, email, phone, created_via, created_at, purchase_window_ends_at, companies(name)")
    .order("created_at", { ascending: false })
    .limit(500);
  const term = q.replace(/[,()%*\\]/g, " ").trim();
  if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  const nowIso = new Date().toISOString();
  if (plazo === "por-vencer") query = query.eq("role", "user").gt("purchase_window_ends_at", nowIso).lte("purchase_window_ends_at", new Date(Date.now() + 3 * DAY).toISOString());
  if (plazo === "cerrado") query = query.eq("role", "user").lte("purchase_window_ends_at", nowIso);
  const [{ data: users }, { data: blocked }] = await Promise.all([query, supabase.rpc("admin_payment_blocked_users")]);
  const blockedIds = new Map(((blocked ?? []) as { user_id: string; rejections: number }[]).map((b) => [b.user_id, b.rejections]));

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Usuarios" />
      <main className="portal-content">
        <form className="inline-form" style={{ marginBottom: "1rem" }}>
          <input name="q" defaultValue={q} placeholder="Buscar por nombre o correo" style={{ minWidth: 280 }} />
          <select name="plazo" defaultValue={plazo}>
            <option value="">Todos los plazos</option>
            <option value="por-vencer">Plazo por vencer (3 días)</option>
            <option value="cerrado">Plazo cerrado</option>
          </select>
          <button className="btn-blue btn-small" type="submit">Buscar</button>
        </form>
        <div className="table-card">
          <table className="simple-table">
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Tipo</th><th>Empresa</th><th>Cuenta creada por</th><th>Desde</th><th>Plazo de compra</th><th>Reportes de pago</th></tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.user_id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}{u.phone && <div className="exp-card__meta">{u.phone}</div>}</td>
                  <td>{ROLE[u.role]}{u.role === "user" && <div><a className="btn-ghost btn-small" href={`/admin/usuarios/${u.user_id}/invitacion`} target="_blank" rel="noreferrer" style={{ marginTop: ".3rem", display: "inline-block" }}>🖨 Invitación</a></div>}</td>
                  <td>{(u.companies as unknown as { name: string } | null)?.name ?? "—"}</td>
                  <td>{VIA[u.created_via]}</td>
                  <td>{shortDate(u.created_at)}</td>
                  <td>
                    {u.role === "user" ? (() => {
                      const w = windowLabel(u.purchase_window_ends_at as string | null);
                      return (
                        <>
                          <span className={w.closed ? "pill pill--orange" : undefined}>{w.text}</span>
                          {u.purchase_window_ends_at && (
                            <RpcButton fn="admin_extend_purchase_window" args={{ p_user_id: u.user_id, p_days: 14 }} label="Extender 14 días" variant="btn-ghost"
                              confirm={`¿Dar 14 días nuevos para comprar a ${u.full_name}?`} />
                          )}
                        </>
                      );
                    })() : "—"}
                  </td>
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
