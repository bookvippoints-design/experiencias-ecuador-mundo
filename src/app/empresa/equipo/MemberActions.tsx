"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { grantExtraAction, resendTeamInviteAction, setMemberStatusAction } from "./actions";
import type { TeamMember } from "./types";

/** Botones de cada persona del equipo: cupos extra hoy, reenviar, editar y pausar. */
export function MemberActions({ m, isSelf }: { m: TeamMember; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extra, setExtra] = useState(3);
  const limitReached = m.company_role === "member" && m.daily_limit !== null && (m.remaining ?? 0) <= 0;

  async function run(fn: () => Promise<{ error: string | null }>, ok: string) {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    setMsg(r.error ?? ok);
    if (!r.error) router.refresh();
  }

  if (m.company_role === "owner") return null;
  const total = (m.daily_limit ?? 0) + m.extra_today + extra;

  return (
    <div className="team-card__actions">
      <div className="btn-row">
        {m.company_role === "member" && m.daily_limit !== null && m.member_status === "active" && (
          <button type="button" className={limitReached ? "btn-orange btn-small" : "btn-ghost btn-small"} onClick={() => setExtraOpen(true)} disabled={busy}>
            Dar cupos extra hoy
          </button>
        )}
        {!m.activated && (
          <button type="button" className="btn-blue btn-small" disabled={busy} onClick={() => run(() => resendTeamInviteAction(m.user_id), "Invitación reenviada.")}>
            Reenviar invitación
          </button>
        )}
        <Link className="btn-ghost btn-small" href={`/empresa/equipo/${m.user_id}`}>Editar</Link>
        {!isSelf && (
          <button type="button" className="btn-ghost btn-small" disabled={busy}
            onClick={() => {
              if (m.member_status === "active" && !window.confirm(`¿Pausar a ${m.full_name}? Podrá entrar y ver su información, pero no crear accesos.`)) return;
              run(() => setMemberStatusAction(m.user_id, m.member_status === "active" ? "paused" : "active"), m.member_status === "active" ? "Usuario pausado." : "Usuario reactivado.");
            }}>
            {m.member_status === "active" ? "Pausar" : "Reactivar"}
          </button>
        )}
      </div>
      {msg && <p className="field-hint" role="status">{msg}</p>}

      {extraOpen && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setExtraOpen(false)}>
          <section className="sheet" role="dialog" aria-modal="true" aria-labelledby={`extra-${m.user_id}`} onClick={(e) => e.stopPropagation()}>
            <h2 id={`extra-${m.user_id}`}>Cupos extra para hoy</h2>
            <p><strong>{m.full_name}</strong>{m.department ? ` (${m.department})` : ""} ya creó <strong>{m.today} de {(m.daily_limit ?? 0) + m.extra_today}</strong> accesos hoy. ¿Cuántos más puede crear solo por hoy?</p>
            <div className="stepper">
              <button type="button" aria-label="Uno menos" onClick={() => setExtra((x) => Math.max(1, x - 1))}>−</button>
              <output aria-live="polite">{extra}</output>
              <button type="button" aria-label="Uno más" onClick={() => setExtra((x) => Math.min(1000, x + 1))}>+</button>
            </div>
            <p className="info-box">Hoy podrá crear <strong>{total} accesos</strong> en total. Mañana vuelve a su límite normal de {m.daily_limit}. Los cupos salen del saldo de la empresa.</p>
            <button type="button" className="btn-orange" style={{ width: "100%" }} disabled={busy}
              onClick={async () => { await run(() => grantExtraAction(m.user_id, extra), `Listo: ${extra} cupos extra para hoy.`); setExtraOpen(false); }}>
              {busy ? "Guardando..." : `Dar ${extra} ${extra === 1 ? "cupo extra" : "cupos extra"} hoy`}
            </button>
            <button type="button" className="text-link-center sheet__cancel" onClick={() => setExtraOpen(false)}>Cancelar</button>
          </section>
        </div>
      )}
    </div>
  );
}
