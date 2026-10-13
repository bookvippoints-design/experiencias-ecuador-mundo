import "server-only";

/**
 * Cajita de Pagos PayPhone (servidor). Las credenciales viven en Vercel:
 *   PAYPHONE_TOKEN (Secret) y PAYPHONE_STORE_ID.
 * Opcional: PAYPHONE_PRICES_INCLUDE_IVA=true y PAYPHONE_IVA_RATE=15 si los
 * precios incluyen IVA; si no se definen, el total se cobra como monto sin IVA.
 */
export const PAYPHONE_CONFIRM_URL = "https://paymentbox.payphonetodoesposible.com/api/confirm";

export function payphoneBoxEnabled(): boolean {
  return !!(process.env.PAYPHONE_TOKEN?.trim() && process.env.PAYPHONE_STORE_ID?.trim());
}

export function toCents(price: number | string): number {
  return Math.round(Number(price) * 100);
}

/** Desglose exigido por PayPhone: amount = amountWithoutTax + amountWithTax + tax. */
export function amountBreakdown(cents: number) {
  const includesIva = process.env.PAYPHONE_PRICES_INCLUDE_IVA === "true";
  if (!includesIva) return { amount: cents, amountWithoutTax: cents, amountWithTax: 0, tax: 0 };
  const rate = Number(process.env.PAYPHONE_IVA_RATE || "15") / 100;
  const base = Math.round(cents / (1 + rate));
  return { amount: cents, amountWithoutTax: 0, amountWithTax: base, tax: cents - base };
}

export function newClientTxId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`.slice(0, 50);
}

export interface PayphoneConfirmation {
  statusCode?: number;
  transactionStatus?: string;
  transactionId?: number;
  clientTransactionId?: string;
  authorizationCode?: string;
  amount?: number;
  cardBrand?: string;
  lastDigits?: string;
  message?: string;
  errorCode?: number;
  [k: string]: unknown;
}

export async function confirmPayphone(id: number, clientTxId: string): Promise<PayphoneConfirmation> {
  const res = await fetch(PAYPHONE_CONFIRM_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PAYPHONE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id, clientTxId }),
    cache: "no-store",
  });
  const text = await res.text();
  let json: PayphoneConfirmation = {};
  try { json = JSON.parse(text); } catch { json = { message: text.slice(0, 300) }; }
  if (!res.ok && json.statusCode === undefined) json.message = json.message ?? `HTTP ${res.status}`;
  return json;
}
