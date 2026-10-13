import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { loadPeople } from "@/lib/people";
import { TopBar } from "@/components/TopBar";
import { MessageForm } from "./MessageForm";

const EMAIL_LABEL: Record<string, string> = { none: "Solo en la plataforma", pending: "Correo por enviar", sent: "Enviado por correo", failed: "El correo falló" };

export default async function AdminMensajes({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const profile = await requireRole("admin");
  const { ver = "escritos" } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("messages").select("id, user_id, kind, title, body, email_status, created_at").order("created_at", { ascending: false }).limit(200);
  q = ver === "todos" ? q : q.in("kind", ["admin", "broadcast"]);
  const [{ data }, { data: clients }] = await Promise.all([
    q,
    supabase.from("profiles").select("email, full_name").eq("role", "user").order("full_name").limit(2000),
  ]);
  const people = await loadPeople((data ?? []).map((m) => m.user_id).filter(Boolean) as string[]);

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Mensajes a clientes" />
      <main className="portal-content">
        <section className="panel">
          <h2>Escribir un mensaje</h2>
          <p className="field-hint" style={{ marginTop: 0 }}>
            A un cliente: le llega a su bandeja &quot;Mensajes&quot; y por correo. A todos: solo aparece en la bandeja de cada cliente (sin correo).
            Los clientes responden por WhatsApp.
          </p>
          <MessageForm clients={(clients ?? []) as { email: string; full_name: string }[]} />
        </section>

        <nav className="tabs">
          <a href="/admin/mensajes" aria-current={ver !== "todos" ? "page" : undefined}>Escritos por administración</a>
          <a href="/admin/mensajes?ver=todos" aria-current={ver === "todos" ? "page" : undefined}>Todos, con avisos automáticos</a>
        </nav>
        <div className="table-card">
          <table className="simple-table">
            <thead><tr><th>Fecha</th><th>Para</th><th>Mensaje</th><th>Envío</th></tr></thead>
            <tbody>
              {(data ?? []).length === 0 && <tr><td colSpan={4} className="empty-state">Todavía no hay mensajes.</td></tr>}
              {(data ?? []).map((m) => {
                const p = m.user_id ? people.get(m.user_id) : null;
                return (
                  <tr key={m.id}>
                    <td>{new Date(m.created_at).toLocaleString("es-EC", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Guayaquil" })}</td>
                    <td>{m.user_id ? <>{p?.full_name}<div className="exp-card__meta">{p?.email}</div></> : <strong>Todos los clientes</strong>}</td>
                    <td><strong>{m.title}</strong><div className="exp-card__meta" style={{ whiteSpace: "pre-line" }}>{m.body}</div></td>
                    <td>{EMAIL_LABEL[m.email_status]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
