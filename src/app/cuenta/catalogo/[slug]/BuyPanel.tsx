"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function BuyPanel({
  slug,
  priceLabel,
  purchasable,
  initialMode,
  hasInternational,
}: {
  slug: string;
  priceLabel: string;
  purchasable: boolean;
  initialMode: "self" | "gift";
  hasInternational: boolean;
}) {
  const [mode, setMode] = useState<"self" | "gift">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [dedication, setDedication] = useState("");
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const e1 = email.trim().toLowerCase();
  const e2 = confirm.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(e1);
  const emailsMatch = e1 !== "" && e1 === e2;
  const giftReady = mode === "self" || (name.trim() !== "" && emailValid && emailsMatch);
  const canSubmit = purchasable && accept && giftReady && !loading;

  async function submit() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await createClient().rpc("create_order", {
      p_product_slug: slug,
      p_mode: mode,
      p_recipient_name: mode === "gift" ? name : null,
      p_recipient_email: mode === "gift" ? email : null,
      p_recipient_email_confirm: mode === "gift" ? confirm : null,
      p_dedication: mode === "gift" ? dedication : null,
      p_accept_terms: accept,
    });
    setLoading(false);
    if (e) return setError(e.message);
    router.push(`/cuenta/pedidos?nuevo=${(data as { code: string }).code}`);
  }

  if (!purchasable) {
    return (
      <div className="buy-box">
        <div className="buy-box__price">Próximamente</div>
        <p className="field-hint">Este producto todavía no tiene un precio aprobado.</p>
      </div>
    );
  }

  return (
    <div className="buy-box">
      <div className="buy-box__price">{priceLabel}</div>
      <div className="mode-toggle" role="group" aria-label="¿Para quién es?">
        <button type="button" aria-pressed={mode === "self"} onClick={() => setMode("self")}>Lo quiero para mí</button>
        <button type="button" aria-pressed={mode === "gift"} onClick={() => setMode("gift")}>🎁 Quiero regalarlo</button>
      </div>

      {mode === "gift" && (
        <>
          <div className="field">
            <label htmlFor="g-name">Nombre de quien recibe</label>
            <input id="g-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="g-email">Correo de quien recibe</label>
            <input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={email !== "" && !emailValid} autoComplete="off" />
            {email !== "" && !emailValid && <span className="field-error">Revisa el formato del correo.</span>}
          </div>
          <div className="field">
            <label htmlFor="g-confirm">Confirma el correo</label>
            <input
              id="g-confirm"
              type="email"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              aria-invalid={confirm !== "" && !emailsMatch}
              autoComplete="off"
            />
            {confirm !== "" && !emailsMatch && <span className="field-error">Los dos correos no coinciden.</span>}
            {emailsMatch && emailValid && <span className="field-hint">✓ Los correos coinciden.</span>}
          </div>
          <div className="field">
            <label htmlFor="g-ded">Dedicatoria (opcional)</label>
            <textarea id="g-ded" rows={3} maxLength={300} value={dedication} onChange={(e) => setDedication(e.target.value)} />
          </div>
          <p className="warn-box">
            El regalo es definitivo: cuando confirmemos tu pago pasará a la cuenta de esa persona y no podrás cancelarlo ni
            recuperarlo. Recibirás una tarjeta digital para enviar o imprimir.
          </p>
        </>
      )}

      {hasInternational && (
        <p className="info-box">
          La invitación internacional no tiene fee de emisión. El viajero paga impuestos gubernamentales y tasas del hotel o
          resort{mode === "gift" ? "; se lo explicaremos a quien recibe el regalo" : ""}.
        </p>
      )}

      <label className="consent">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        <span>
          Revisé lo que incluye, lo que no incluye y las condiciones, y acepto los{" "}
          <Link href="/terminos" target="_blank" style={{ color: "var(--naranja-oscuro)" }}>términos y condiciones</Link>.
        </span>
      </label>

      {error && <p className="field-error">{error}</p>}
      <button className="btn-orange" style={{ width: "100%" }} onClick={submit} disabled={!canSubmit}>
        {loading ? "Creando pedido..." : mode === "gift" ? "Continuar al pago del regalo" : "Continuar al pago"}
      </button>
      <p className="field-hint" style={{ marginTop: ".5rem" }}>
        Pagas con PayPhone y reportas tu pago. Tus experiencias se acreditan al confirmarlo.
      </p>
    </div>
  );
}
