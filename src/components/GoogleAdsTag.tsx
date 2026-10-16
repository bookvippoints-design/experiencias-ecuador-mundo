"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __eeGtagConfigured?: boolean;
  }
}

/**
 * Etiqueta principal de Google Ads (una sola vez por página) y, si el servidor lo
 * autorizó, la conversión de compra del acceso. La conversión lleva el
 * identificador de la transacción para que Google Ads descarte duplicados, y la
 * plataforma recuerda que ya se envió para no repetirla al recargar.
 */
export function GoogleAdsTag({ adsId, conversion }: {
  adsId: string;
  conversion?: { sendTo: string; value: number; currency: string; transactionId: string } | null;
}) {
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
    if (!conversion) return;
    const key = `ee_ads_conv_${conversion.transactionId}`;
    try { if (localStorage.getItem(key)) return; } catch { /* almacenamiento no disponible */ }
    let marked = false;
    const mark = () => {
      if (marked) return;
      marked = true;
      try { localStorage.setItem(key, "1"); } catch { /* sin almacenamiento */ }
      fetch("/api/acceso/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx: conversion.transactionId }),
        keepalive: true,
      }).catch(() => undefined);
    };
    window.gtag("event", "conversion", {
      send_to: conversion.sendTo,
      value: conversion.value,
      currency: conversion.currency,
      transaction_id: conversion.transactionId,
      // Se marca como enviada solo cuando Google confirma la recepción.
      event_callback: mark,
    });
  }, [adsId, conversion]);

  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsId)}`} strategy="afterInteractive" />;
}
