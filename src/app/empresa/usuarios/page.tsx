import { requireRole } from "@/lib/auth/identity";
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
}

export default async function EmpresaUsuarios() {
  const profile = await requireRole("company");
  const supabase = await createClient();
  const [{ data: dash }, { data: users }] = await Promise.all([supabase.rpc("company_dashboard"), supabase.rpc("company_users")]);
  const d = (Array.isArray(dash) ? dash[0] : dash) as { available: number; access_status: string } | null;
  const list = (users ?? []) as CompanyUser[];

  return (
    <>
      <TopBar profile={profile} eyebrow="PANEL EMPRESARIAL" title="Usuarios" />
      <main className="portal-content">
        <section className="panel">
          <h2>Crear usuario</h2>
          <p className="content-lead">
            Tu cliente o colaborador recibe un correo para activar su cuenta y crear su contraseña. Su acceso ya está
            pagado con tu cupo; las experiencias las compra por separado.
          </p>
          <CreateUserForm available={d?.available ?? 0} enabled={d?.access_status === "active"} />
        </section>

        <section className="panel">
          <h2>Tus usuarios ({list.length})</h2>
          <p className="field-hint">Por privacidad, aquí no se muestran las compras ni las reservas de tus usuarios.</p>
          <div className="table-card">
            <table className="simple-table">
              <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Creado</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={6} className="empty-state">Todavía no has creado usuarios.</td></tr>}
                {list.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone ?? "—"}</td>
                    <td>{shortDate(u.created_at)}</td>
                    <td>{u.activated ? <span className="pill pill--available">Cuenta activa</span> : <span className="pill pill--orange">Invitación enviada</span>}</td>
                    <td>{!u.activated && <ResendButton userId={u.user_id} />}</td>
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
