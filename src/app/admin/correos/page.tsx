import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";

export default async function AdminCorreos({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const profile = await requireRole("admin");
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("email_log").select("*").order("created_at", { ascending: false }).limit(200);
  const term = q.replace(/[,()%*\\]/g, " ").trim();
  if (term) query = query.ilike("to_email", `%${term}%`);
  const { data: rows } = await query;

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Correos enviados" />
      <main className="portal-content">
        <p className="content-lead">
          &quot;Enviado&quot; significa que el servidor de correo (GMX) aceptó el mensaje. Si aun así no llega, revisa la carpeta
          de correo no deseado del destinatario: algunos proveedores, como Yahoo u Hotmail, pueden filtrarlo o demorarlo.
        </p>
        <form className="inline-form" style={{ marginBottom: "1rem" }}>
          <input name="q" defaultValue={q} placeholder="Buscar por correo" style={{ minWidth: 260 }} />
          <button className="btn-blue btn-small" type="submit">Buscar</button>
        </form>
        <div className="table-card">
          <table className="simple-table">
            <thead><tr><th>Fecha</th><th>Para</th><th>Asunto</th><th>Estado</th><th>Respuesta del servidor</th></tr></thead>
            <tbody>
              {(rows ?? []).length === 0 && <tr><td colSpan={5} className="empty-state">Sin correos registrados.</td></tr>}
              {(rows ?? []).map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString("es-EC")}</td>
                  <td>{r.to_email}</td>
                  <td>{r.subject}</td>
                  <td>{r.status === "sent" ? <span className="pill pill--available">Enviado</span> : <span className="pill pill--expired">Falló</span>}</td>
                  <td style={{ fontSize: ".78rem", color: "#6b7280" }}>{r.error ?? r.smtp_response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
