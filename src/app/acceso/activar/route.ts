import { NextResponse, type NextRequest } from "next/server";
import { accessActivationUrl } from "@/lib/access-sale";

export const dynamic = "force-dynamic";

/** Lleva a crear la contraseña justo después de comprar el acceso. */
export async function GET(request: NextRequest) {
  const tx = request.nextUrl.searchParams.get("tx") ?? "";
  const url = tx.startsWith("ACC-") && tx.length <= 50 ? await accessActivationUrl(tx) : "/login";
  return NextResponse.redirect(new URL(url, request.url));
}
