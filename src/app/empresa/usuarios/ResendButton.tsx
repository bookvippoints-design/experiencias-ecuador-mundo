"use client";

import { useState } from "react";
import { resendInvitationAction } from "./actions";

export function ResendButton({ userId }: { userId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState("sending");
    setError(null);
    const r = await resendInvitationAction(userId);
    if (r.error) {
      setError(r.error);
      setState("idle");
    } else setState("sent");
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: ".25rem" }}>
      <button className="btn-ghost btn-small" onClick={run} disabled={state !== "idle"}>
        {state === "sending" ? "Enviando..." : state === "sent" ? "Invitación reenviada" : "Reenviar invitación"}
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
