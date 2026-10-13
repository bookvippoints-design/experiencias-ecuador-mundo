"use client";

import { useEffect, useRef, useState } from "react";
import type { StartResult } from "@/app/pago/actions";

const CSS = "https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.css";
const JS = "https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js";
const FORM_LIFETIME_MS = 10 * 60 * 1000;

declare global {
  interface Window {
    PPaymentButtonBox?: new (opts: Record<string, unknown>) => { render: (id: string) => void };
  }
}

function loadAssets(): Promise<void> {
  if (!document.querySelector(`link[href="${CSS}"]`)) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = CSS;
    document.head.appendChild(l);
  }
  if (window.PPaymentButtonBox) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let s = document.querySelector<HTMLScriptElement>(`script[src="${JS}"]`);
    if (!s) {
      s = document.createElement("script");
      s.type = "module";
      s.src = JS;
      document.head.appendChild(s);
    }
    const started = Date.now();
    const wait = () => {
      if (window.PPaymentButtonBox) return resolve();
      if (Date.now() - started > 15000) return reject(new Error("timeout"));
      setTimeout(wait, 150);
    };
    s.addEventListener("error", () => reject(new Error("script")));
    wait();
  });
}

/** Muestra la Cajita de Pagos de PayPhone. `start` crea el intento de pago en el servidor. */
export function PayphoneBox({ start }: { start: () => Promise<StartResult> }) {
  const [state, setState] = useState<"loading" | "ready" | "expired" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ran = useRef(-1);
  const boxId = `pp-button-${attempt}`;

  useEffect(() => {
    if (ran.current === attempt) return; // evita crear dos intentos en desarrollo
    ran.current = attempt;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      setState("loading");
      setError(null);
      const res = await start().catch(() => ({ ok: false as const, error: "No se pudo preparar el pago." }));
      if (!res.ok) {
        setError(res.error);
        setState("error");
        return;
      }
      try {
        await loadAssets();
      } catch {
        setError("No se pudo cargar PayPhone. Revisa tu conexión e inténtalo de nuevo.");
        setState("error");
        return;
      }
      const b = res.box;
      new window.PPaymentButtonBox!({
        token: b.token,
        storeId: b.storeId,
        clientTransactionId: b.clientTransactionId,
        amount: b.amount,
        amountWithoutTax: b.amountWithoutTax,
        amountWithTax: b.amountWithTax,
        tax: b.tax,
        service: 0,
        tip: 0,
        currency: "USD",
        reference: b.reference,
        email: b.email,
        lang: "es",
        defaultMethod: "card",
        timeZone: -5,
      }).render(boxId);
      setState("ready");
      expiry = setTimeout(() => setState("expired"), FORM_LIFETIME_MS - 15000);
    })();
    return () => { if (expiry) clearTimeout(expiry); };
  }, [attempt, boxId, start]);

  return (
    <div className="pp-box">
      {state === "loading" && <p className="field-hint">Cargando el pago seguro de PayPhone…</p>}
      {state === "error" && (
        <div>
          <p className="field-error">{error}</p>
          <button className="btn-orange btn-small" onClick={() => setAttempt((a) => a + 1)}>Intentar de nuevo</button>
        </div>
      )}
      {state === "expired" && (
        <div className="warn-box">
          Por seguridad, el formulario de pago vence a los 10 minutos.{" "}
          <button className="btn-orange btn-small" onClick={() => setAttempt((a) => a + 1)}>Cargar de nuevo</button>
        </div>
      )}
      <div id={boxId} key={boxId} style={{ display: state === "expired" ? "none" : undefined }} />
    </div>
  );
}
