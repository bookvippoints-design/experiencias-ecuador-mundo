"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendAdminMessage } from "@/app/message-actions";

export function MessageForm({ clients }: { clients: { email: string; full_name: string }[] }) {
  const [to, setTo] = useState<"one" | "all">("one");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function send() {
    if (to === "all" && !window.confirm(`¿Publicar este mensaje para todos los clientes (${clients.length})?`)) return;
    setLoading(true);
    setError(null);
    setMsg(null);
    const r = await sendAdminMessage({ to, email, title, body });
    setLoading(false);
    if (r.error) return setError(r.error);
    setMsg(to === "all" ? "Publicado en la bandeja de todos los clientes." : "Mensaje enviado al cliente (bandeja y correo).");
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", maxWidth: 680 }}>
      <div className="btn-row" role="radiogroup" aria-label="Destinatario">
        <label className="consent" style={{ margin: 0 }}><input type="radio" checked={to === "one"} onChange={() => setTo("one")} /> <span>A un cliente</span></label>
        <label className="consent" style={{ margin: 0 }}><input type="radio" checked={to === "all"} onChange={() => setTo("all")} /> <span>A todos los clientes</span></label>
      </div>
      {to === "one" && (
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="mf-email">Correo del cliente</label>
          <input id="mf-email" list="mf-clients" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Escribe para buscar" />
          <datalist id="mf-clients">
            {clients.map((c) => <option key={c.email} value={c.email}>{c.full_name}</option>)}
          </datalist>
        </div>
      )}
      <div className="field" style={{ margin: 0 }}><label htmlFor="mf-title">Asunto</label><input id="mf-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor="mf-body">Mensaje</label><textarea id="mf-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
      {error && <p className="field-error">{error}</p>}
      {msg && <p className="success-box">{msg}</p>}
      <div>
        <button className="btn-orange" onClick={send} disabled={loading || !title.trim() || !body.trim() || (to === "one" && !email.trim())}>
          {loading ? "Enviando..." : to === "all" ? "Publicar para todos" : "Enviar mensaje"}
        </button>
      </div>
    </div>
  );
}
