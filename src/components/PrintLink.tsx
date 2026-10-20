"use client";

import { useEffect } from "react";

/** Hace que el enlace "Imprimir o guardar en PDF" abra el diálogo de impresión. */
export function PrintLink() {
  useEffect(() => {
    const el = document.querySelector<HTMLAnchorElement>("[data-print]");
    if (!el) return;
    const fn = (e: Event) => { e.preventDefault(); window.print(); };
    el.addEventListener("click", fn);
    return () => el.removeEventListener("click", fn);
  }, []);
  return null;
}
