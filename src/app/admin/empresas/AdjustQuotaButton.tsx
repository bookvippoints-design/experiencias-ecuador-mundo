"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdjustQuotaButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setError(null);
    const raw = window.prompt(`Cupos a sumar (positivo) o restar (negativo) para ${companyName}`);
    if (raw === null) return;
    const delta = Number(raw);
    if (!Number.isInteger(delta) || delta === 0) return setError("Escribe un número entero distinto de cero.");
    const note = window.prompt("Motivo del ajuste (obligatorio)");
    if (!note?.trim()) return setError("El motivo es obligatorio.");
    const { error: e } = await createClient().rpc("admin_adjust_quota", { p_company_id: companyId, p_delta: delta, p_note: note });
    if (e) setError(e.message);
    else router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: ".25rem" }}>
      <button type="button" className="btn-ghost btn-small" onClick={run}>Ajustar cupos</button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
