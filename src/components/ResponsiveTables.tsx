"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * En celular, las tablas se muestran como tarjetas apiladas. Este componente
 * copia el título de cada columna a sus celdas (data-label) para que cada dato
 * conserve su etiqueta, y los botones de acción queden siempre visibles.
 */
export function ResponsiveTables() {
  const pathname = usePathname();

  useEffect(() => {
    function label() {
      document.querySelectorAll<HTMLTableElement>("table.simple-table").forEach((table) => {
        const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
        table.querySelectorAll("tbody tr").forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            if (headers[i] && !td.hasAttribute("data-label")) td.setAttribute("data-label", headers[i]);
          });
        });
      });
    }
    label();
    const observer = new MutationObserver(label);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
