import { requireRole, isCompanyManager } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { CreateUserForm } from "./CreateUserForm";
import { ResendButton } from "./ResendButton";
import { shortDate } from "@/lib/format";

interface CompanyUser {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  activated: boolean;
  created_by_name: string | null;
  created_by_department: string | null;
}

export default async function EmpresaUsuarios() {
  const profile = await requireRole("company");
  const manager = isCompanyManager(profile);
  const supabase = await createClient();
  const [{ data: dash }, { data: users }, { data: meData }] = await Promise.all([
    supabase.rpc("company_dashboard"),
    supabase.rpc("company_users_detail"),
    supabase.rpc("company_me"),
  ]);
  const d = (Array.isArray(dash) ? dash[0] : dash) as { available: number; access_status: string } | null;
  const me = (Array.isArray(meData) ? meData[0] : meData) as { daily_limit: number | null; extra_today: number; remaining: number | null } | null;
  const list = (users ?? []) as CompanyUser[];
  const paused = profile.memberStatus === "paused";
  const blockReason = paused
    ? "Tu usuario está pausado: puedes ver tus clientes, pero no crear accesos. Habla con el administrador de tu empresa."
    : me?.remaining === 0
      ? `Ya creaste tus ${(me.daily_limit ?? 0) + me.extra_today} accesos de hoy. Mañana podrás crear más. Si necesitas más hoy, pídele cupos extra a tu administrador.`
      : null;

  return (
    <>
      <TopBar profile={profile} eyebrow="PANEL EMPRESARIAL" title={manager ? "Clientes" : "Mis clientes"} />
      <main className="portal-content">
        <section className="panel">
          <h2>Crear acceso para un cliente</h2>
          <p className="content-lead">
            Regala a tus clientes o colaboradores el acceso al catálogo privado de experiencias. Cada persona recibe un correo
            para activar su cuenta y crear su contraseña. Cada acceso usa un cupo de la empresa.
          </p>
          {me?.remaining !== null && me?.remaining !== undefined && !paused && (
            <p className="field-hint">Hoy puedes crear <strong>{me.remaining}</strong> {me.remaining === 1 ? "acceso más" : "accesos más"}.</p>
          )}
          {blockReason && <p className="notice-banner">{blockReason}</p>}
          {!blockReason && <CreateUserForm available={d?.available ?? 0} enabled={d?.access_status === "active"} />}
        </section>

        <section className="panel">
          <h2>{manager ? `Clientes de la empresa (${list.length})` : `Mis clientes (${list.length})`}</h2>
          <p className="field-hint">
            {manager ? "Ves los accesos creados por todo el equipo." : "Solo ves los accesos que tú creaste."} Por privacidad, aquí no se muestran las compras ni las reservas de los clientes.
          </p>
          <div className="table-card">
            <table className="simple-table">
              <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Creado</th>{manager && <th>Creado por</th>}<th>Estado</th><th></th></tr></thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={manager ? 7 : 6} className="empty-state">Todavía no hay accesos creados.</td></tr>}
                {list.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone ?? "—"}</td>
                    <td>{shortDate(u.created_at)}</td>
                    {manager && <td>{u.created_by_name ?? "—"}{u.created_by_department ? <div className="exp-card__meta">{u.created_by_department}</div> : null}</td>}
                    <td>{u.activated ? <span className="pill pill--available">Cuenta activa</span> : <span className="pill pill--orange">Invitación enviada</span>}</td>
                    <td>
                      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                        {!u.activated && !paused && <ResendButton userId={u.user_id} />}
                        {manager && <a className="btn-ghost btn-small" href={`/empresa/usuarios/${u.user_id}/invitacion`} target="_blank" rel="noreferrer">🖨 Imprimir invitación</a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
