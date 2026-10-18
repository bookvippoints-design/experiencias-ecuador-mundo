"use client";

import { PayphoneBox } from "@/components/PayphoneBox";
import { startReactivationPayment } from "@/app/pago/actions";

export function ReactivationPayBox() {
  return <PayphoneBox start={startReactivationPayment} />;
}
