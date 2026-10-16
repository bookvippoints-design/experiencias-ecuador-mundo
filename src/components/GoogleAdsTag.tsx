"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    google_tag_manager?: unknown;
    __eeGtagConfigured?: boolean;
  }
}

/** Tiempo máximo que gtag espera el envío antes de ejecutar igualmente la función de aviso. */
const EVENT_TIMEOUT_MS = 6000;
/** Si la librería de Google no cargó en este tiempo, se considera bloqueada. */
const LOAD_TIMEOUT_MS = 10000;

type Outcome = "sent" | "blocked" | "timeout" | "offline";

/**
 * Etiqueta principal de Google Ads (una sola vez por página) y, si el servidor lo
 * autorizó, la conversión de compra del acceso.
 *
 * La compra solo se marca como enviada ("sent") cuando la librería de Google cargó,
 * hay conexión y gtag avisó que despachó el envío ANTES de agotar su tiempo de espera.
 * Si la etiqueta está bloqueada, no hay conexión o el aviso llega por tiempo agotado,
 * no se marca: la conversión se vuelve a intentar en la próxima visita a la página
 * (Google Ads descarta duplicados por transaction_id, así que un reintento no cuenta doble).
 */
export function GoogleAdsTag({ adsId, conversion }: {
  adsId: string;
  conversion?: { sendTo: string; value: number; currency: string; transactionId: string } | null;
}) {
  const libLoaded = useRef(false);
  const libFailed = useRef(false);

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    }
    if (!window.__eeGtagConfigured) {
      window.__eeGtagConfigured = true;
      window.gtag("js", new Date());
      window.gtag("config", adsId);
    }
    if (window.google_tag_manager) libLoaded.current = true;
    if (!conversion) return;

    const key = `ee_ads_conv_${conversion.transactionId}`;
    try { if (localStorage.getItem(key)) return; } catch { /* almacenamiento no disponible */ }

    let reported = false;
    const report = (outcome: Outcome) => {
      if (reported) return;
      reported = true;
      if (outcome === "sent") {
        try { localStorage.setItem(key, "1"); } catch { /* sin almacenamiento */ }
      }
      fetch("/api/acceso/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx: conversion.transactionId, outcome }),
        keepalive: true,
      }).catch(() => undefined);
    };

    const started = Date.now();
    window.gtag("event", "conversion", {
      send_to: conversion.sendTo,
      value: conversion.value,
      currency: conversion.currency,
      transaction_id: conversion.transactionId,
      transport_type: "beacon",
      event_timeout: EVENT_TIMEOUT_MS,
      event_callback: () => {
        const timedOut = Date.now() - started >= EVENT_TIMEOUT_MS - 100;
        if (!libLoaded.current && !window.google_tag_manager) return report("blocked");
        if (typeof navigator !== "undefined" && navigator.onLine === false) return report("offline");
        report(timedOut ? "timeout" : "sent");
      },
    });

    // Si la librería nunca carga (bloqueador o red), gtag nunca ejecuta la función de aviso.
    const watchdog = setTimeout(() => {
      if (!libLoaded.current && !window.google_tag_manager) report(libFailed.current || navigator.onLine !== false ? "blocked" : "offline");
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(watchdog);
  }, [adsId, conversion]);

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsId)}`}
      strategy="afterInteractive"
      onLoad={() => { libLoaded.current = true; }}
      onError={() => { libFailed.current = true; }}
    />
  );
}
