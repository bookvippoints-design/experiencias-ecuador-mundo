"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Countdown } from "@/components/Countdown";
import { StatusPill } from "@/components/StatusPill";
import { Modal } from "@/components/Modal";
import { giftEntitlementsAction } from "./actions";
import { effectiveStatus, entitlementTitle, KIND_LABEL, type EntitlementRow } from "@/lib/format";

const NATIONAL = ["Quito", "Guayaquil", "Manta", "Cuenca", "Loja"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface BoardItem extends EntitlementRow {
  photo: string;
  giftFrom: string | null;
  productName: string;
}

function longDate(v: string | null) {
  return v ? new Date(v).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

function giftable(e: BoardItem) {
  const s = effectiveStatus(e);
  if (s !== "available") return false;
  if (e.kind === "points") return !e.points_credited_at;
  if (e.kind === "international") return !e.invitation_registered_at;
  return true;
}

export function ExperienceBoard({ items, readOnly = false, userEmail = "" }: { items: BoardItem[]; readOnly?: boolean; userEmail?: string }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [giftOpen, setGiftOpen] = useState(false);
  const [booking, setBooking] = useState<BoardItem | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      {flash && <p className="success-box">{flash}</p>}
      {!readOnly && <div className="btn-row" style={{ marginBottom: "1rem" }}>
        {!selecting ? (
          <button className="btn-orange" onClick={() => setSelecting(true)} disabled={!items.some(giftable)}>🎁 Regalar experiencias</button>
        ) : (
          <>
            <span className="info-box" style={{ margin: 0 }}>Toca las experiencias que quieres regalar ({selected.length} elegidas).</span>
            <button className="btn-orange" disabled={selected.length === 0} onClick={() => setGiftOpen(true)}>Continuar</button>
            <button className="btn-ghost" onClick={() => { setSelecting(false); setSelected([]); }}>Cancelar</button>
          </>
        )}
      </div>}

      <div className="exp-grid">
        {items.map((e) => {
          const status = effectiveStatus(e);
          const canGift = giftable(e);
          const isSel = selected.includes(e.id);
          const deadline = e.kind === "international" && e.travel_deadline ? e.travel_deadline : e.valid_until;
          return (
            <article
              key={e.id}
              className={`exp-card${selecting && canGift ? " exp-card--selectable" : ""}${isSel ? " exp-card--selected" : ""}`}
              onClick={selecting && canGift ? () => toggle(e.id) : undefined}
              aria-pressed={selecting && canGift ? isSel : undefined}
            >
              <div className="exp-card__photo" style={{ backgroundImage: `url('${e.photo}')` }}>
                <span className="exp-card__kind">{KIND_LABEL[e.kind]}</span>
              </div>
              <div className="exp-card__body">
                <h3 className="exp-card__title">{entitlementTitle(e)}</h3>
                <div className="exp-card__meta">{e.productName} · {e.code}</div>
                {e.giftFrom && <div className="exp-card__gift">🎁 Regalo de {e.giftFrom}</div>}
                <div><StatusPill status={status} /></div>
                {e.destination && <div className="exp-card__meta">Destino solicitado: <strong>{e.destination}</strong></div>}

                {e.kind === "points" ? (
                  <div className="exp-card__countdown">
                    {e.points_credited_at
                      ? "Ya están acreditados en tu cuenta BookVipPoints. Úsalos al reservar tu hotel."
                      : status === "requested"
                        ? "Recibimos tu solicitud de canje. Te avisaremos cuando estén acreditados en BookVipPoints."
                        : "Los puntos no caducan. Canjéalos para acreditarlos en tu cuenta BookVipPoints."}
                  </div>
                ) : status === "available" || status === "requested" ? (
                  <div className="exp-card__countdown">
                    {e.kind === "international" && e.travel_deadline ? "Tiempo para viajar" : "Tiempo para usarla"}:{" "}
                    <Countdown deadline={deadline!} />
                    <div className="exp-card__meta">Vence el {longDate(deadline)}</div>
                  </div>
                ) : null}

                {e.kind === "international" && e.invitation_delivered_at && !e.invitation_registered_at && (
                  <p className="field-hint">Tu invitación fue emitida: regístrala en 30 días y paga impuestos y tasas dentro de 7 días tras el registro.</p>
                )}

                {!selecting && (
                  <div className="exp-card__actions">
                    {status === "available" && !(e.kind === "points" && e.points_credited_at) && (
                      <button className="btn-blue btn-small" onClick={() => setBooking(e)}>
                        {e.kind === "national" ? "Canjear: reservar escapada" : e.kind === "international" ? "Canjear: pedir invitación" : "Canjear mis puntos"}
                      </button>
                    )}
                    {canGift && (
                      <button className="btn-orange btn-small" onClick={() => { setSelected([e.id]); setGiftOpen(true); }}>Regalar</button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {giftOpen && (
        <GiftDialog
          items={items.filter((i) => selected.includes(i.id))}
          onClose={() => setGiftOpen(false)}
          onDone={(m) => { setGiftOpen(false); setSelecting(false); setSelected([]); setFlash(m); }}
        />
      )}
      {booking && <BookingDialog item={booking} userEmail={userEmail} onClose={() => setBooking(null)} onDone={(m) => { setBooking(null); setFlash(m); }} />}
    </>
  );
}

function GiftDialog({ items, onClose, onDone }: { items: BoardItem[]; onClose: () => void; onDone: (m: string) => void }) {
  const [step, setStep] = useState<"form" | "review">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [dedication, setDedication] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const e1 = email.trim().toLowerCase();
  const valid = EMAIL_RE.test(e1);
  const match = e1 !== "" && e1 === confirm.trim().toLowerCase();
  const ready = name.trim() !== "" && valid && match;

  async function send() {
    setLoading(true);
    setError(null);
    const r = await giftEntitlementsAction({ ids: items.map((i) => i.id), name, email, confirm, dedication });
    setLoading(false);
    if (r.error) return setError(r.error);
    router.refresh();
    onDone(r.message ?? "Regalo enviado");
  }

  return (
    <Modal open onClose={onClose} wide labelledBy="gift-title">
      <h2 id="gift-title">🎁 Regalar {items.length === 1 ? "esta experiencia" : `${items.length} experiencias`}</h2>
      <ul className="check-list">{items.map((i) => <li key={i.id}>{entitlementTitle(i)} · vence {i.kind === "points" ? "nunca" : longDate(i.valid_until)}</li>)}</ul>

      {step === "form" ? (
        <>
          <div className="field"><label htmlFor="gd-name">Nombre de quien recibe</label><input id="gd-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field">
            <label htmlFor="gd-email">Correo</label>
            <input id="gd-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={email !== "" && !valid} autoComplete="off" />
            {email !== "" && !valid && <span className="field-error">Revisa el formato del correo.</span>}
          </div>
          <div className="field">
            <label htmlFor="gd-confirm">Confirma el correo</label>
            <input id="gd-confirm" type="email" value={confirm} onChange={(e) => setConfirm(e.target.value)} onPaste={(e) => e.preventDefault()} aria-invalid={confirm !== "" && !match} autoComplete="off" />
            {confirm !== "" && !match && <span className="field-error">Los dos correos no coinciden.</span>}
            {match && valid && <span className="field-hint">✓ Los correos coinciden.</span>}
          </div>
          <div className="field"><label htmlFor="gd-ded">Dedicatoria (opcional)</label><textarea id="gd-ded" rows={3} maxLength={300} value={dedication} onChange={(e) => setDedication(e.target.value)} /></div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-orange" disabled={!ready} onClick={() => setStep("review")}>Revisar regalo</button>
          </div>
        </>
      ) : (
        <>
          <dl className="kv">
            <dt>Para</dt><dd>{name}</dd>
            <dt>Correo</dt><dd>{e1}</dd>
            {dedication && (<><dt>Dedicatoria</dt><dd>{dedication}</dd></>)}
          </dl>
          <p className="warn-box">
            Este regalo es <strong>definitivo</strong>: al enviarlo, estas experiencias salen de tu cuenta y pasan a la de {name}.
            No podrás cancelarlo ni recuperarlo. La fecha de vencimiento no cambia.
          </p>
          {error && <p className="field-error">{error}</p>}
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setStep("form")} disabled={loading}>Corregir datos</button>
            <button className="btn-orange" onClick={send} disabled={loading}>{loading ? "Enviando..." : "Enviar regalo"}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function BookingDialog({ item, userEmail, onClose, onDone }: { item: BoardItem; userEmail: string; onClose: () => void; onDone: (m: string) => void }) {
  const isPoints = item.kind === "points";
  const [destination, setDestination] = useState(isPoints ? userEmail : "");
  const [dates, setDates] = useState("");
  const [travelers, setTravelers] = useState("");
  const [notes, setNotes] = useState("");
  const [rules, setRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const intl = item.kind === "international";

  async function send() {
    setLoading(true);
    setError(null);
    const { error: e } = await createClient().rpc("request_booking", {
      p_entitlement_id: item.id,
      p_destination: destination,
      p_preferred_dates: dates || null,
      p_travelers: travelers || null,
      p_notes: notes || null,
      p_accept_rules: rules,
    });
    setLoading(false);
    if (e) return setError(e.message);
    router.refresh();
    onDone(
      isPoints
        ? "Recibimos tu solicitud de canje. Acreditaremos tus puntos en BookVipPoints y te avisaremos."
        : "Recibimos tu solicitud. Te escribiremos para coordinar los detalles; puedes seguirla en \"Mis reservas\"."
    );
  }

  if (isPoints) {
    return (
      <Modal open onClose={onClose} wide labelledBy="bk-title">
        <h2 id="bk-title">Canjear {entitlementTitle(item)}</h2>
        <p className="modal__subtitle">Acreditaremos tus puntos en tu cuenta BookVipPoints para que obtengas un ahorro parcial al reservar hoteles.</p>
        <div className="field">
          <label htmlFor="bk-email">Correo de tu cuenta BookVipPoints</label>
          <input id="bk-email" type="email" value={destination} onChange={(e) => setDestination(e.target.value)} />
          <span className="field-hint">Si aún no tienes cuenta en BookVipPoints, la crearemos con este correo.</span>
        </div>
        <div className="field"><label htmlFor="bk-notes">Comentarios (opcional)</label><textarea id="bk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <p className="info-box">Los puntos no son efectivo ni saldo para pagar una reserva completa, y no caducan. Una vez acreditados ya no se pueden regalar.</p>
        {error && <p className="field-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-orange" onClick={send} disabled={loading || !destination.trim()}>{loading ? "Enviando..." : "Solicitar canje"}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} wide labelledBy="bk-title">
      <h2 id="bk-title">{intl ? "Canjear: invitación hotelera internacional" : "Canjear: reservar escapada nacional"}</h2>
      <p className="modal__subtitle">{entitlementTitle(item)} · vence el {longDate(item.valid_until)}</p>
      <div className="field">
        <label htmlFor="bk-dest">Destino</label>
        {intl ? (
          <input id="bk-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ciudad o país de la lista de más de 130 destinos" />
        ) : (
          <select id="bk-dest" value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="">Elige un destino</option>
            {NATIONAL.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}
      </div>
      <div className="field"><label htmlFor="bk-dates">Fechas preferidas</label><input id="bk-dates" value={dates} onChange={(e) => setDates(e.target.value)} placeholder="Ej. segunda quincena de marzo" /></div>
      <div className="field"><label htmlFor="bk-trav">Viajeros</label><input id="bk-trav" value={travelers} onChange={(e) => setTravelers(e.target.value)} placeholder={intl ? "Ej. 2 adultos" : "Nombres de las 2 personas"} /></div>
      <div className="field"><label htmlFor="bk-notes">Comentarios (opcional)</label><textarea id="bk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      {intl && (
        <>
          <p className="info-box">
            Fee de emisión US$0. Pagarás los impuestos gubernamentales y las tasas del hotel o resort. Emitida la invitación
            tendrás 30 días para registrarla y 7 días para pagar esos valores; desde la activación, 18 meses para viajar.
          </p>
          <label className="consent">
            <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} />
            <span>
              Acepto que solo puedo usar una invitación por año, sin repetir destino, y que dos invitaciones no pueden usarse en el
              mismo destino. Entiendo que incumplir estas reglas puede anular todos los certificados.
            </span>
          </label>
        </>
      )}
      {error && <p className="field-error">{error}</p>}
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-orange" onClick={send} disabled={loading || !destination.trim() || (intl && !rules)}>
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>
    </Modal>
  );
}
