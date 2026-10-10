"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Countdown } from "@/components/Countdown";
import { StatusPill } from "@/components/StatusPill";
import { Modal } from "@/components/Modal";
import { giftEntitlementsAction } from "./actions";
import { notifyAdmin } from "@/app/alert-actions";
import Link from "next/link";
import { effectiveStatus, entitlementTitle, KIND_LABEL, type EntitlementRow } from "@/lib/format";
import { destinationLabel, estimatedTaxes, usd, TAX_NOTE, type IntlDestination } from "@/lib/intl-destinations";
import { NATIONAL_RULE, NATIONAL_MIN_DAYS, NATIONAL_RESPONSE, BONUS_REGISTER_URL } from "@/lib/brand";

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

export function ExperienceBoard({ items, readOnly = false, userEmail = "", destinations = [], requestInvitation }: {
  items: BoardItem[]; readOnly?: boolean; userEmail?: string; destinations?: IntlDestination[]; requestInvitation?: string;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [giftOpen, setGiftOpen] = useState(false);
  const [booking, setBooking] = useState<BoardItem | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Llegó desde "Pedir esta invitación": abrir el canje con el destino elegido.
  const openedFromLink = useRef(false);
  useEffect(() => {
    if (readOnly || !requestInvitation || openedFromLink.current) return;
    openedFromLink.current = true;
    const first = items.find((e) => e.kind === "international" && effectiveStatus(e) === "available");
    if (first) setBooking(first);
    else setFlash("No tienes invitaciones internacionales disponibles para canjear.");
  }, [readOnly, requestInvitation, items]);

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
      {booking && <BookingDialog item={booking} userEmail={userEmail} destinations={destinations} initialDestination={requestInvitation} onClose={() => setBooking(null)} onDone={(m) => { setBooking(null); setFlash(m); }} />}
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

function isoDate(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function BookingDialog({ item, userEmail, destinations, initialDestination, onClose, onDone }: {
  item: BoardItem; userEmail: string; destinations: IntlDestination[]; initialDestination?: string;
  onClose: () => void; onDone: (m: string) => void;
}) {
  const isPoints = item.kind === "points";
  const intl = item.kind === "international";
  const [destination, setDestination] = useState(isPoints ? userEmail : intl ? initialDestination ?? "" : "");
  const [destQuery, setDestQuery] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [altCheckIn, setAltCheckIn] = useState("");
  const [travelers, setTravelers] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [rules, setRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const minDate = isoDate(new Date(Date.now() + NATIONAL_MIN_DAYS * 86400000));
  const maxDate = item.valid_until ? isoDate(new Date(item.valid_until)) : undefined;
  const chosen = intl ? destinations.find((d) => destinationLabel(d).toLowerCase() === destination.toLowerCase()) : undefined;
  const filtered = intl
    ? destinations.filter((d) => !destQuery.trim() || destinationLabel(d).toLowerCase().includes(destQuery.trim().toLowerCase()))
    : [];

  async function send() {
    setLoading(true);
    setError(null);
    const { data: bookingId, error: e } = await createClient().rpc("request_booking", {
      p_entitlement_id: item.id,
      p_destination: destination,
      p_preferred_dates: null,
      p_travelers: travelers || null,
      p_notes: notes || null,
      p_accept_rules: rules,
      p_check_in: item.kind === "national" ? checkIn || null : null,
      p_alt_check_in: item.kind === "national" ? altCheckIn || null : null,
      p_phone: phone || null,
    });
    setLoading(false);
    if (e) return setError(e.message);
    if (bookingId) await notifyAdmin("booking", bookingId as string);
    router.refresh();
    onDone(
      isPoints
        ? "Recibimos tu solicitud de canje. Acreditaremos tus puntos en BookVipPoints y te avisaremos."
        : `Recibimos tu solicitud. ${NATIONAL_RESPONSE} Puedes seguirla en "Canjes y reservas".`
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
          <span className="field-hint">
            ¿Aún no tienes cuenta? <a href={BONUS_REGISTER_URL} target="_blank" rel="noreferrer" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>Regístrate gratis aquí</a> y recibe además 100 puntos de bienvenida.
          </span>
        </div>
        <div className="field"><label htmlFor="bk-notes">Comentarios (opcional)</label><textarea id="bk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <p className="info-box">Cada punto equivale a hasta US$1 de ahorro como pago parcial. No son efectivo ni pagan una reserva completa, y no caducan. Una vez acreditados ya no se pueden regalar.</p>
        {error && <p className="field-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-orange" onClick={send} disabled={loading || !destination.trim()}>{loading ? "Enviando..." : "Solicitar canje"}</button>
        </div>
      </Modal>
    );
  }

  if (!intl) {
    const ready = destination && checkIn && travelers.trim() && phone.replace(/\D/g, "").length >= 7 && rules;
    return (
      <Modal open onClose={onClose} wide labelledBy="bk-title">
        <h2 id="bk-title">Canjear: reservar escapada nacional</h2>
        <p className="modal__subtitle">{entitlementTitle(item)} · vence el {longDate(item.valid_until)}</p>
        <p className="rule-box">{NATIONAL_RULE}</p>
        <div className="field">
          <label htmlFor="bk-dest">Ciudad</label>
          <select id="bk-dest" value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="">Elige una ciudad</option>
            {NATIONAL.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="bk-in">Fecha de entrada</label>
            <input id="bk-in" type="date" min={minDate} max={maxDate} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="bk-alt">Fecha alternativa (opcional)</label>
            <input id="bk-alt" type="date" min={minDate} max={maxDate} value={altCheckIn} onChange={(e) => setAltCheckIn(e.target.value)} />
          </div>
        </div>
        <span className="field-hint">Mínimo {NATIONAL_MIN_DAYS} días de anticipación: desde el {longDate(minDate + "T12:00:00")}.</span>
        <div className="field"><label htmlFor="bk-trav">Nombre de tu acompañante</label><input id="bk-trav" value={travelers} onChange={(e) => setTravelers(e.target.value)} /></div>
        <div className="field"><label htmlFor="bk-phone">Teléfono de contacto (WhatsApp)</label><input id="bk-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09..." /></div>
        <div className="field"><label htmlFor="bk-notes">Comentarios (opcional)</label><textarea id="bk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <p className="info-box">{NATIONAL_RESPONSE} Mientras tu solicitud está pendiente puedes cambiar las fechas; si no hay disponibilidad, te ofrecemos otras.</p>
        <label className="consent">
          <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} />
          <span>
            Entiendo que las escapadas nacionales <strong>no se pueden usar en temporada alta, vacaciones ni feriados</strong>, y que
            <strong> una vez confirmado el hospedaje no se puede anular ni se reintegra el paquete</strong>.
          </span>
        </label>
        {error && <p className="field-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-orange" onClick={send} disabled={loading || !ready}>{loading ? "Enviando..." : "Enviar solicitud"}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} wide labelledBy="bk-title">
      <h2 id="bk-title">Canjear: invitación hotelera internacional</h2>
      <p className="modal__subtitle">{entitlementTitle(item)} · vence el {longDate(item.valid_until)}</p>
      <div className="field">
        <label htmlFor="bk-q">Destino</label>
        <input id="bk-q" value={destQuery} onChange={(e) => setDestQuery(e.target.value)} placeholder="Busca una ciudad o país" />
        <select aria-label="Elige el destino" size={6} value={chosen ? chosen.id : ""} onChange={(e) => {
          const d = destinations.find((x) => x.id === e.target.value);
          if (d) setDestination(destinationLabel(d));
        }} className="dest-select">
          {filtered.map((d) => (
            <option key={d.id} value={d.id}>{destinationLabel(d)} · {d.days}D/{d.nights}N · {usd(Number(d.tax_per_night))} por noche</option>
          ))}
        </select>
        <span className="field-hint"><Link href="/cuenta/destinos" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>Ver todos los destinos con filtros</Link></span>
      </div>
      {chosen && (
        <div className="dest-summary">
          <strong>{destinationLabel(chosen)}</strong>
          <span>{chosen.days} días / {chosen.nights} noches</span>
          <span>Impuesto por noche: {usd(Number(chosen.tax_per_night))}</span>
          <span className="dest-summary__total">Total estimado a pagar: {usd(estimatedTaxes(chosen))}</span>
        </div>
      )}
      <div className="field"><label htmlFor="bk-trav">Viajeros</label><input id="bk-trav" value={travelers} onChange={(e) => setTravelers(e.target.value)} placeholder="Ej. 2 adultos: Ana Pérez y Luis Mora" /></div>
      <div className="field"><label htmlFor="bk-notes">Comentarios (opcional)</label><textarea id="bk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <p className="info-box">
        <strong>Fee de emisión US$0.</strong> {TAX_NOTE} Emitida la invitación tendrás 30 días para registrarla y 7 días para pagar esos
        valores; desde la activación, 18 meses para viajar.
      </p>
      <label className="consent">
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} />
        <span>
          Acepto que solo puedo usar una invitación por año, sin repetir destino, y que dos invitaciones no pueden usarse en el
          mismo destino. Entiendo que incumplir estas reglas puede anular todos los certificados.
        </span>
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-orange" onClick={send} disabled={loading || !chosen || !rules}>
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>
    </Modal>
  );
}
