"use client";

import { useEffect, useState } from "react";

function getParts(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export function Countdown({ deadline, onExpire }: { deadline: string; onExpire?: () => void }) {
  const [parts, setParts] = useState(() => getParts(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getParts(deadline);
      setParts(next);
      if (!next) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (!parts) {
    return <span className="countdown countdown--expired">Vencido</span>;
  }

  return (
    <span className="countdown">
      {parts.days > 0 && <><strong>{parts.days}</strong>d </>}
      <strong>{String(parts.hours).padStart(2, "0")}</strong>h{" "}
      <strong>{String(parts.minutes).padStart(2, "0")}</strong>m{" "}
      <strong>{String(parts.seconds).padStart(2, "0")}</strong>s
    </span>
  );
}
