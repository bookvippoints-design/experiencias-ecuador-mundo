"use client";

import { useCallback } from "react";
import { PayphoneBox } from "@/components/PayphoneBox";
import { startOrderPayment } from "@/app/pago/actions";

export function OrderPayBox({ orderId }: { orderId: string }) {
  const start = useCallback(() => startOrderPayment(orderId), [orderId]);
  return <PayphoneBox start={start} />;
}
