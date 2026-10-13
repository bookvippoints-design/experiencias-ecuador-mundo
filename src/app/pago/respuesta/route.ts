import { NextResponse, type NextRequest } from "next/server";
import { settlePayphonePayment } from "@/lib/payphone-settle";

export const dynamic = "force-dynamic";

/** PayPhone regresa aquí después del pago con ?id=...&clientTransactionId=... */
export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  const tx = request.nextUrl.searchParams.get("clientTransactionId") ?? "";
  const url = request.nextUrl.clone();
  url.pathname = "/pago/resultado";
  url.search = "";
  if (!Number.isFinite(id) || id <= 0 || !tx || tx.length > 50) {
    url.searchParams.set("estado", tx ? "canceled" : "error");
    if (tx) url.searchParams.set("tx", tx);
    return NextResponse.redirect(url);
  }
  const outcome = await settlePayphonePayment(id, tx).catch(() => "error" as const);
  url.searchParams.set("estado", outcome);
  url.searchParams.set("tx", tx);
  return NextResponse.redirect(url);
}
