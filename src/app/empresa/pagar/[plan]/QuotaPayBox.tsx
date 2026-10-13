"use client";

import { useCallback } from "react";
import { PayphoneBox } from "@/components/PayphoneBox";
import { startQuotaPayment } from "@/app/pago/actions";

export function QuotaPayBox({ planKey }: { planKey: string }) {
  const start = useCallback(() => startQuotaPayment(planKey), [planKey]);
  return <PayphoneBox start={start} />;
}
