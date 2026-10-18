import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { whatsappUrl } from "@/lib/brand";

interface Msg { id: string; kind: string; title: string; body: string; link: string | null; created_at: string }

function when(iso: string) {
  return new Date(iso).toLocaleString("es-EC", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Guayaquil" });
}

export default async function Mensajes() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const [{ data }, { data: reads }] = await Promise.all([
    supabase.from("messages").select("id, kind, title, body, link, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("message_reads").select("message_id"),
  ]);
  const readIds = new Set((reads ?? []).map((r) => r.message_id));
  const list = (data ?? []) as Msg[];
  // Al abrir la bandeja, todo queda leído (los nuevos se resaltan esta vez).
  await supabase.rpc("mark_my_messages_read");

  return (
    <>
      <TopBar profile={profile} eyebrow="MI CUENTA" title="Mensajes" />
      <main className="portal-content">
        <p className="content-lead" style={{ marginTop: 0 }}>
          Aquí queda todo lo que te escribimos y cada novedad de tus compras, regalos y reservas, del más nuevo al más antiguo.
        </p>
        {list.length === 0 ? (
          <div className="empty-card">Todavía no tienes mensajes.</div>
        ) : (
          <ol className="inbox">
            {list.map((m) => {
              const isNew = !readIds.has(m.id);
              return (
                <li key={m.id} className={`inbox__item${isNew ? " is-new" : ""}`}>
                  <div className="inbox__top">
                    <span className={`inbox__tag inbox__tag--${m.kind}`}>{m.kind === "broadcast" ? "Novedad" : m.kind === "admin" ? "Mensaje del equipo" : "Aviso"}</span>
                    {isNew && <span className="inbox__new">Nuevo</span>}
                    <time className="inbox__date">{when(m.created_at)}</time>
                  </div>
                  <h2 className="inbox__title">{m.title}</h2>
                  <p className="inbox__body">
                    {String(m.body ?? "").split(/(https:\/\/[^\s]+)/g).map((part, i) =>
                      /^https:\/\//.test(part)
                        ? <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>{part.includes("manual_usuario") ? "Ver los videos" : part}</a>
                        : part
                    )}
                  </p>
                  <div className="inbox__actions">
                    {m.link && <Link className="btn-ghost btn-small" href={m.link}>Ver</Link>}
                    <a className="btn-small inbox__wa" href={whatsappUrl(`Hola, sobre su mensaje "${m.title}": `)} target="_blank" rel="noreferrer">Responder por WhatsApp</a>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </>
  );
}
