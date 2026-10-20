import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Crumbs } from "@/components/Crumbs";
import { PurchaseCountdown } from "@/components/PurchaseCountdown";
import { effectiveStatus, type EntitlementRow } from "@/lib/format";
import { loadPurchaseWindow } from "@/lib/purchase-window";

/** Inicio: bienvenida corta y la primera elección (Ecuador o el Mundo). */
export default async function CuentaHome() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const { data: ents } = await supabase.from("entitlements").select("*");
  const mine = (ents ?? []) as EntitlementRow[];
  const available = (kind: string) => mine.filter((e) => e.kind === kind && effectiveStatus(e) === "available").length;
  const nationals = available("national");
  const internationals = available("international");
  const received = mine.some((e) => e.gift_id && e.purchaser_id !== profile.userId);
  const firstName = profile.fullName.split(" ")[0];
  const win = await loadPurchaseWindow(supabase, profile.userId);
  const daysLeft = win.endsAt ? Math.max(0, Math.ceil((new Date(win.endsAt).getTime() - Date.now()) / 86400000)) : null;

  return (
    <>
      <TopBar profile={profile} eyebrow="TU CATÁLOGO PRIVADO" title={`Hola, ${firstName}`} />
      <main className="portal-content flow">
        <Crumbs trail={[{ label: "Inicio" }]} />

        <section className="welcome-card">
          <img src="/acceso/img/destino-regalo.webp" alt="Persona emocionada al recibir una experiencia de viaje" className="welcome-card__img" />
          <div className="welcome-card__body">
            <h2>Bienvenid@ a tu catálogo privado de experiencias</h2>
            <p>
              Aquí encuentras escapadas en Ecuador para elegir entre <strong>Quito, Guayaquil, Manta, Cuenca, Loja o Galápagos</strong>,
              y además una <strong>invitación hotelera en más de 130 destinos del mundo</strong>.
            </p>
            <p>Disfrútalas o regálalas a una persona especial.</p>
          </div>
        </section>

        {win.open && daysLeft !== null && (
          <p className="soft-note">Tus precios especiales están disponibles por <strong>{daysLeft} {daysLeft === 1 ? "día" : "días"} más</strong>.</p>
        )}
        {!win.open && <PurchaseCountdown endsAt={win.endsAt} variant="bar" />}

        <h2 className="choice-title">¿Qué quieres conocer primero?</h2>
        <div className="choice-grid">
          <Link href="/cuenta/ecuador" className="choice-card">
            <img src="/acceso/img/destino-quito.webp" alt="" />
            <span className="choice-card__text">
              <strong>Beneficios en Ecuador</strong>
              <span>6 destinos para tu escapada</span>
            </span>
            <span className="choice-card__go" aria-hidden="true">›</span>
          </Link>
          <Link href="/cuenta/mundo" className="choice-card">
            <img src="/acceso/img/destino-mundo.webp" alt="" />
            <span className="choice-card__text">
              <strong>Beneficios en el Mundo</strong>
              <span>Más de 130 destinos</span>
            </span>
            <span className="choice-card__go" aria-hidden="true">›</span>
          </Link>
        </div>

        <Link href="/cuenta/catalogo" className="text-link-center">Ya sé lo que quiero: ver los paquetes</Link>

        {(nationals > 0 || internationals > 0) && (
          <Link href="/cuenta/experiencias" className="owned-card">
            <span className="owned-card__eyebrow">{received ? "TIENES EXPERIENCIAS, ALGUNAS DE REGALO" : "YA TIENES EXPERIENCIAS"}</span>
            <strong>Mis beneficios activados</strong>
            <span>
              {nationals} {nationals === 1 ? "escapada nacional" : "escapadas nacionales"} · {internationals}{" "}
              {internationals === 1 ? "invitación internacional" : "invitaciones internacionales"}
            </span>
            <span className="owned-card__go">Usar o regalar ›</span>
          </Link>
        )}
      </main>
    </>
  );
}
