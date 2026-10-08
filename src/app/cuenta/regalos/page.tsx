import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Countdown } from "@/components/Countdown";
import { KIND_LABEL, longDate, shortDate, points, type EntitlementKind } from "@/lib/format";
import { unsplashUrl, HOTEL_PHOTOS } from "@/lib/destinations";

interface CardItem {
  code: string;
  kind: EntitlementKind;
  valid_until: string | null;
  points: number | null;
}
interface CardData {
  code: string;
  sender_name: string;
  recipient_name: string;
  recipient_email: string;
  dedication: string | null;
  created_at: string;
  items: CardItem[];
}

function itemLabel(i: CardItem) {
  return i.kind === "points" ? points(i.points) : KIND_LABEL[i.kind];
}

export default async function MisRegalos() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const { data: gifts } = await supabase
    .from("gifts")
    .select("id, sender_id, recipient_id, order_id, created_at")
    .order("created_at", { ascending: false });

  const cards = await Promise.all(
    (gifts ?? []).map(async (g) => {
      const { data } = await supabase.rpc("gift_card_data", { p_gift_id: g.id });
      return { ...g, card: data as CardData };
    })
  );
  const { data: pendingGifts } = await supabase
    .from("orders")
    .select("id, code, product_snapshot, recipient_name, status")
    .eq("buyer_id", profile.userId)
    .eq("mode", "gift")
    .in("status", ["pending_payment", "payment_reported"]);

  const sent = cards.filter((g) => g.sender_id === profile.userId);
  const received = cards.filter((g) => g.recipient_id === profile.userId);

  const GiftCard = ({ g, side }: { g: (typeof cards)[number]; side: "sent" | "received" }) => (
    <article className="exp-card">
      <div className="exp-card__photo" style={{ backgroundImage: `url('${unsplashUrl(HOTEL_PHOTOS[g.card.code.length % HOTEL_PHOTOS.length], 700, 300)}')` }}>
        <span className="exp-card__kind">🎁 {g.card.code}</span>
      </div>
      <div className="exp-card__body">
        <h3 className="exp-card__title">{side === "sent" ? `Para ${g.card.recipient_name}` : `De ${g.card.sender_name}`}</h3>
        <div className="exp-card__meta">
          {side === "sent" ? g.card.recipient_email : "Recibido"} · {shortDate(g.card.created_at)}
        </div>
        {g.card.dedication && <p className="info-box" style={{ fontStyle: "italic" }}>“{g.card.dedication}”</p>}
        <ul className="check-list">
          {g.card.items.map((i) => (
            <li key={i.code}>
              {itemLabel(i)}
              {i.kind !== "points" && i.valid_until && (
                <div className="exp-card__meta">
                  Le queda: <Countdown deadline={i.valid_until} /> · vence {longDate(i.valid_until)}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="exp-card__actions">
          <a className="btn-orange btn-small" href={`/cuenta/regalos/${g.id}/tarjeta`} target="_blank" rel="noreferrer">
            Tarjeta de regalo (PDF)
          </a>
          {side === "received" && <Link className="btn-blue btn-small" href="/cuenta/experiencias">Usar mis experiencias</Link>}
        </div>
      </div>
    </article>
  );

  return (
    <>
      <TopBar profile={profile} eyebrow="MI CUENTA" title="Regalos" />
      <main className="portal-content">
        <section className="hero" style={{ backgroundImage: `url('${unsplashUrl(HOTEL_PHOTOS[0], 1600, 500)}')`, minHeight: 180 }}>
          <div className="hero__content">
            <span className="hero__eyebrow">Para regalar</span>
            <h2 className="hero__title">Regala un viaje</h2>
            <p className="hero__text">Compra un paquete para regalar o regala experiencias que ya tienes.</p>
            <div className="btn-row">
              <Link href="/cuenta/catalogo" className="btn-orange">Comprar para regalar</Link>
              <Link href="/cuenta/experiencias" className="btn-ghost">Regalar lo que ya tengo</Link>
            </div>
          </div>
          <span className="hero__ref">Imagen referencial</span>
        </section>

        {(pendingGifts ?? []).length > 0 && (
          <div className="warn-box">
            {(pendingGifts ?? []).map((o) => (
              <div key={o.id}>
                Tu regalo <strong>{(o.product_snapshot as { name: string }).name}</strong> para {o.recipient_name} se enviará al confirmar tu pago
                ({o.code}). <Link href="/cuenta/pedidos" style={{ color: "var(--naranja-oscuro)" }}>Ver pedido</Link>
              </div>
            ))}
          </div>
        )}

        <div className="section-title"><h2>Regalos recibidos ({received.length})</h2></div>
        {received.length === 0 ? <div className="empty-card">Aún no has recibido regalos.</div> : (
          <div className="exp-grid">{received.map((g) => <GiftCard key={g.id} g={g} side="received" />)}</div>
        )}

        <div className="section-title"><h2>Regalos enviados ({sent.length})</h2></div>
        {sent.length === 0 ? <div className="empty-card">Aún no has enviado regalos.</div> : (
          <div className="exp-grid">{sent.map((g) => <GiftCard key={g.id} g={g} side="sent" />)}</div>
        )}
        <p className="field-hint" style={{ marginTop: "1rem" }}>
          Los regalos son definitivos: lo que regalas pasa a la cuenta de la otra persona y no se puede recuperar.
        </p>
      </main>
    </>
  );
}
