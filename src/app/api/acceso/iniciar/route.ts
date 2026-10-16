import { NextResponse, type NextRequest } from "next/server";
import { startAccessPurchase } from "@/lib/access-sale";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* cuerpo vacío */ }
  const result = await startAccessPurchase({
    name: body.name as string, email: body.email as string, email2: body.email2 as string,
    phone: body.phone as string, terms: body.terms === true,
    gclid: body.gclid as string, gbraid: body.gbraid as string, wbraid: body.wbraid as string, landing: body.landing as string,
  }).catch(() => ({ ok: false as const, error: "No se pudo preparar el pago. Intenta de nuevo." }));
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
}
