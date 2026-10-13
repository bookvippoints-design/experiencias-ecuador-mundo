"use client";

import { PointsLoginButton } from "@/components/PointsLoginButton";
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
import { destinationLabel, usd, TAX_NOTE, type IntlDestination } from "@/lib/intl-destinations";
import { NATIONAL_MIN_DAYS, NATIONAL_RESPONSE, BONUS_REGISTER_URL } from "@/lib/brand";

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

function describeKind(e: BoardItem): string {
  if (e.kind === "national") return `Hospedaje para 2 personas con desayuno en Quito, Guayaquil, Manta, Cuenca o Loja. Pídela con al menos ${NATIONAL_MIN_DAYS} días de anticipación.`;
  if (e.kind === "international") return "Más de 130 destinos, de 4 días y 3 noches hasta 8 días y 7 noches según destino. Fee de emisión US$0; impuestos y tasas a cargo del viajero.";
  return "Cada punto equivale a hasta US$1 de ahorro como pago parcial en hoteles. Se acreditan en tu cuenta BookVipPoints.";
}

const byExpiry = (a: BoardItem, b: BoardItem) => new Date(a.valid_until ?? "9999-12-31").getTime() - new Date(b.valid_until ?? "9999-12-31").getTime();

function GroupCard({ icon, title, available, inProcess, nextExpiry, actionLabel, onAction, onGift, canGift, children }: {
  icon: string; title: string; available: number; inProcess: number; nextExpiry: string | null;
  actionLabel: string; onAction?: () => void; onGift?: () => void; canGift: boolean; children?: React.ReactNode;
}) {
  return (
    <article className="group-card">
      <div className="group-card__head">
        <span className="group-card__icon" aria-hidden="true">{icon}</span>
        <div>
          <h3 className="group-card__title">{title}</h3>
          <div className="group-card__count"><strong>{available.toLocaleString("es-EC")}</strong> {available === 1 ? "disponible" : "disponibles"}</div>
        </div>
      </div>
      {nextExpiry && available > 0 && <div className="group-card__meta">{available > 1 ? "La primera vence" : "Vence"} el {longDate(nextExpiry)}</div>}
      {inProcess > 0 && <div className="group-card__meta">{inProcess} en trámite · <a href="/cuenta/reservas">ver canjes</a></div>}
      {children}
      {available > 0 && (onAction || onGift) && (
        <div className="group-card__actions">
          {onAction && <button className="btn-blue btn-small" onClick={onAction}>{actionLabel}</button>}
          {onGift && canGift && <button className="btn-orange btn-small" onClick={onGift}>Regalar</button>}
        </div>
      )}
    </article>
  );
}

function GiftQuantityDialog({ label, max, onClose, onChoose }: { label: string; max: number; onClose: () => void; onChoose: (n: number) => void }) {
  const [n, setN] = useState(1);
  return (
    <Modal open onClose={onClose} labelledBy="gq-title">
      <h2 id="gq-title">🎁 ¿Cuántas quieres regalar?</h2>
      <p className="modal__subtitle">Tienes {max} {label} para regalar. Se regalan primero las que vencen antes.</p>
      <div className="field">
        <label htmlFor="gq-n">Cantidad</label>
        <select id="gq-n" value={n} onChange={(e) => setN(Number(e.target.value))}>
          {Array.from({ length: max }, (_, i) => i + 1).map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-orange" onClick={() => onChoose(n)}>Continuar</button>
      </div>
    </Modal>
  );
}

export function ExperienceBoard({ items, readOnly = false, userEmail = "", userName = "", destinations = [], requestInvitation }: {
  items: BoardItem[]; readOnly?: boolean; userEmail?: string; userName?: string; destinations?: IntlDestination[]; requestInvitation?: string;
}) {
  const [showDetail, setShowDetail] = useState(readOnly);
  const [giftQty, setGiftQty] = useState<{ label: string; pool: BoardItem[] } | null>(null);
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

  const avail = (kind: string) => items.filter((e) => e.kind === kind && effectiveStatus(e) === "available").sort(byExpiry);
  const inProc = (kind: string) => items.filter((e) => e.kind === kind && effectiveStatus(e) === "requested").length;
  const nationals = avail("national");
  const intls = avail("international");
  const points = avail("points").filter((e) => !e.points_credited_at);
  const giftNow = (pool: BoardItem[], label: string) => {
    const g = pool.filter(giftable);
    if (g.length === 1) { setSelected([g[0].id]); setGiftOpen(true); }
    else if (g.length > 1) setGiftQty({ label, pool: g });
  };

  return (
    <>
      {flash && <p className="success-box">{flash}</p>}

      {!readOnly && (
        <div className="group-grid">
          <GroupCard icon="🏨" title="Escapadas nacionales" available={nationals.length} inProcess={inProc("national")}
            nextExpiry={nationals[0]?.valid_until ?? null} actionLabel="Reservar una"
            onAction={nationals[0] ? () => setBooking(nationals[0]) : undefined}
            onGift={() => giftNow(nationals, "escapadas nacionales")} canGift={nationals.some(giftable)} />
          <GroupCard icon="✈️" title="Invitaciones internacionales" available={intls.length} inProcess={inProc("international")}
            nextExpiry={intls[0]?.valid_until ?? null} actionLabel="Pedir una"
            onAction={intls[0] ? () => setBooking(intls[0]) : undefined}
            onGift={() => giftNow(intls, "invitaciones internacionales")} canGift={intls.some(giftable)} />
          <GroupCard icon="⭐" title="Puntos por canjear" available={points.reduce((sum, e) => sum + (e.points ?? 0), 0)} inProcess={inProc("points")}
            nextExpiry={null} actionLabel="" canGift={false}>
            {points.length > 0 && (
              <ul className="group-card__list">
                {points.map((e) => (
                  <li key={e.id}>
                    <span><strong>{(e.points ?? 0).toLocaleString("es-EC")}</strong> · {e.productName}</span>
                    <span className="group-card__mini">
                      <button className="btn-blue btn-small" onClick={() => setBooking(e)}>Canjear</button>
                      {giftable(e) && <button className="btn-orange btn-small" onClick={() => { setSelected([e.id]); setGiftOpen(true); }}>Regalar</button>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="group-card__meta">Los puntos no caducan.</div>
            <div><PointsLoginButton /></div>
          </GroupCard>
        </div>
      )}

      {!readOnly && (
        <button className="detail-toggle" onClick={() => setShowDetail((v) => !v)} aria-expanded={showDetail}>
          {showDetail ? "Ocultar detalle ▲" : "Ver detalle de cada una ▼"}
        </button>
      )}

      {showDetail && (
        <div className="detail-groups">
          {Object.entries(
            items.reduce<Record<string, BoardItem[]>>((acc, e) => {
              const key = e.kind === "points" ? "Puntos" : entitlementTitle(e);
              (acc[key] ??= []).push(e);
              return acc;
            }, {})
          ).map(([title, group]) => (
            <section key={title} className="detail-group">
              <h3 className="detail-group__title">{title}</h3>
              <p className="detail-group__desc">{describeKind(group[0])}</p>
              <ul className="detail-rows">
                {group.sort(byExpiry).map((e) => {
                  const status = effectiveStatus(e);
                  const deadline = e.kind === "international" && e.travel_deadline ? e.travel_deadline : e.valid_until;
                  return (
                    <li key={e.id} className="detail-row">
                      <span className="detail-row__main">
                        <strong>{e.kind === "points" ? `${(e.points ?? 0).toLocaleString("es-EC")} puntos` : e.productName}</strong>
                        <span className="detail-row__meta">{e.code}{e.giftFrom ? ` · 🎁 regalo de ${e.giftFrom}` : ""}{e.destination ? ` · ${e.destination}` : ""}</span>
                      </span>
                      <StatusPill status={status} />
                      <span className="detail-row__date">
                        {e.kind === "points"
                          ? e.points_credited_at ? "Acreditados" : "No caducan"
                          : deadline ? `${e.kind === "international" && e.travel_deadline ? "Viajar hasta" : "Vence"} el ${longDate(deadline)}` : ""}
                      </span>
                      {!readOnly && (
                        <span className="detail-row__actions">
                          {status === "available" && !(e.kind === "points" && e.points_credited_at) && (
                            <button className="btn-blue btn-small" onClick={() => setBooking(e)}>
                              {e.kind === "national" ? "Reservar" : e.kind === "international" ? "Pedir" : "Canjear"}
                            </button>
                          )}
                          {giftable(e) && (
                            <button className="btn-orange btn-small" onClick={() => { setSelected([e.id]); setGiftOpen(true); }}>Regalar</button>
                          )}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {giftQty && (
        <GiftQuantityDialog label={giftQty.label} max={giftQty.pool.length} onClose={() => setGiftQty(null)}
          onChoose={(n) => { setSelected(giftQty.pool.slice(0, n).map((e) => e.id)); setGiftQty(null); setGiftOpen(true); }} />
      )}
      {giftOpen && (
        <GiftDialog
          items={items.filter((i) => selected.includes(i.id))}
          onClose={() => setGiftOpen(false)}
          onDone={(m) => { setGiftOpen(false); setSelecting(false); setSelected([]); setFlash(m); }}
        />
      )}
      {booking && <BookingDialog item={booking} userEmail={userEmail} userName={userName} destinations={destinations} initialDestination={requestInvitation} onClose={() => setBooking(null)} onDone={(m) => { setBooking(null); setFlash(m); }} />}
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

function TravelerFields({ holder, setHolder, holderAge, setHolderAge, companion, setCompanion, companionAge, setCompanionAge, companionOptional }: {
  holder: string; setHolder: (v: string) => void; holderAge: string; setHolderAge: (v: string) => void;
  companion: string; setCompanion: (v: string) => void; companionAge: string; setCompanionAge: (v: string) => void;
  companionOptional?: boolean;
}) {
  return (
    <>
      <div className="field-row field-row--person">
        <div className="field"><label htmlFor="bk-holder">Nombre del titular</label><input id="bk-holder" value={holder} onChange={(e) => setHolder(e.target.value)} /></div>
        <div className="field field--age"><label htmlFor="bk-holder-age">Edad</label><input id="bk-holder-age" type="number" inputMode="numeric" min={0} max={120} value={holderAge} onChange={(e) => setHolderAge(e.target.value)} /></div>
      </div>
      <div className="field-row field-row--person">
        <div className="field"><label htmlFor="bk-comp">Nombre del acompañante{companionOptional ? " (opcional)" : ""}</label><input id="bk-comp" value={companion} onChange={(e) => setCompanion(e.target.value)} /></div>
        <div className="field field--age"><label htmlFor="bk-comp-age">Edad</label><input id="bk-comp-age" type="number" inputMode="numeric" min={0} max={120} value={companionAge} onChange={(e) => setCompanionAge(e.target.value)} /></div>
      </div>
      <span className="field-hint">La edad nos ayuda a saber si viaja un adulto o un niño.</span>
    </>
  );
}

const validAge = (v: string) => v.trim() !== "" && Number(v) >= 0 && Number(v) <= 120;

function BookingDialog({ item, userEmail, userName, destinations, initialDestination, onClose, onDone }: {
  item: BoardItem; userEmail: string; userName: string; destinations: IntlDestination[]; initialDestination?: string;
  onClose: () => void; onDone: (m: string) => void;
}) {
  const isPoints = item.kind === "points";
  const intl = item.kind === "international";
  const [destination, setDestination] = useState(isPoints ? userEmail : intl ? initialDestination ?? "" : "");
  const [destQuery, setDestQuery] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [holder, setHolder] = useState(userName);
  const [holderAge, setHolderAge] = useState("");
  const [companion, setCompanion] = useState("");
  const [companionAge, setCompanionAge] = useState("");
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
    const { data: bookingId, error: e } = await createClient().rpc("request_booking_v2", {
      p_entitlement_id: item.id,
      p_destination: destination,
      p_holder_name: isPoints ? null : holder || null,
      p_holder_age: isPoints || holderAge === "" ? null : Number(holderAge),
      p_companion_name: isPoints ? null : companion || null,
      p_companion_age: isPoints || companionAge === "" ? null : Number(companionAge),
      p_notes: notes || null,
      p_accept_rules: rules,
      p_check_in: item.kind === "national" ? checkIn || null : null,
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
        <p><PointsLoginButton label="Ver mi cuenta BookVipPoints" /></p>
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
    const ready = destination && checkIn && holder.trim() && validAge(holderAge) && companion.trim() && validAge(companionAge)
      && phone.replace(/\D/g, "").length >= 7 && rules;
    return (
      <Modal open onClose={onClose} wide labelledBy="bk-title">
        <h2 id="bk-title">Canjear: reservar escapada nacional</h2>
        <p className="modal__subtitle">{entitlementTitle(item)} · vence el {longDate(item.valid_until)}</p>
        <div className="field">
          <label htmlFor="bk-dest">Ciudad</label>
          <select id="bk-dest" value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="">Elige una ciudad</option>
            {NATIONAL.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bk-in">Fecha de entrada</label>
          <input id="bk-in" type="date" min={minDate} max={maxDate} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <span className="field-hint">Mínimo {NATIONAL_MIN_DAYS} días de anticipación: desde el {longDate(minDate + "T12:00:00")}.</span>
        <TravelerFields holder={holder} setHolder={setHolder} holderAge={holderAge} setHolderAge={setHolderAge}
          companion={companion} setCompanion={setCompanion} companionAge={companionAge} setCompanionAge={setCompanionAge} />
        <div className="field"><label htmlFor="bk-phone">Teléfono de contacto (WhatsApp)</label><input id="bk-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09..." /></div>
        <div className="field"><label htmlFor="bk-notes">Comentarios (opcional)</label><textarea id="bk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <p className="info-box">{NATIONAL_RESPONSE} Si no hay disponibilidad en la fecha que elegiste, te contactamos para buscar otra.</p>
        <label className="consent">
          <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} />
          <span>
            Entiendo que las escapadas nacionales no se pueden usar en temporada alta, vacaciones ni feriados, y que una vez
            confirmado el hospedaje no se puede anular ni se reintegra el paquete.
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
          <span className="dest-summary__total">Impuestos y tasas por noche: {usd(Number(chosen.tax_per_night))}</span>
        </div>
      )}
      <TravelerFields holder={holder} setHolder={setHolder} holderAge={holderAge} setHolderAge={setHolderAge}
        companion={companion} setCompanion={setCompanion} companionAge={companionAge} setCompanionAge={setCompanionAge} companionOptional />
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
        <button className="btn-orange" onClick={send} disabled={loading || !chosen || !rules || !holder.trim() || !validAge(holderAge) || (companion.trim() !== "" && !validAge(companionAge))}>
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>
    </Modal>
  );
}
