"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Botón que llama una función de la base de datos y refresca la página.
 * Toda la validación vive en el servidor; aquí solo se muestra el error.
 */
export function RpcButton({
  fn,
  args,
  label,
  variant = "btn-blue",
  confirm,
  askNote,
}: {
  fn: string;
  args: Record<string, unknown>;
  label: string;
  variant?: string;
  confirm?: string;
  askNote?: { param: string; question: string; required?: boolean };
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setError(null);
    if (confirm && !window.confirm(confirm)) return;
    const payload = { ...args };
    if (askNote) {
      const note = window.prompt(askNote.question) ?? null;
      if (note === null) return;
      if (askNote.required && !note.trim()) {
        setError("Este dato es obligatorio.");
        return;
      }
      payload[askNote.param] = note;
    }
    setLoading(true);
    const { error: rpcError } = await createClient().rpc(fn, payload);
    setLoading(false);
    if (rpcError) setError(rpcError.message);
    else router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: ".25rem" }}>
      <button type="button" className={`${variant} btn-small`} onClick={run} disabled={loading}>
        {loading ? "..." : label}
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
