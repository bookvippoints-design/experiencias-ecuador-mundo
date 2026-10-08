import { STATUS_LABEL, type EffectiveStatus } from "@/lib/format";

export function StatusPill({ status }: { status: EffectiveStatus }) {
  return <span className={`pill pill--${status}`}>{STATUS_LABEL[status]}</span>;
}
