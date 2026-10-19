import "server-only";
import { promises as dns } from "node:dns";

/**
 * Revisa que el dominio del correo exista y pueda recibir correos (registro MX,
 * o al menos A/AAAA). Si el DNS no responde, no bloquea: solo descarta dominios
 * que claramente no existen.
 */
export async function emailDomainAccepts(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  const timeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 4000))]);
  try {
    const mx = await timeout(dns.resolveMx(domain));
    if (mx.some((r) => r.exchange && r.exchange !== ".")) return true;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code !== "ENOTFOUND" && code !== "ENODATA") return true; // DNS lento o sin respuesta: no bloquear
  }
  try {
    const a = await timeout(dns.resolve4(domain).catch(() => dns.resolve6(domain)));
    return a.length > 0;
  } catch (e) {
    const code = (e as { code?: string }).code;
    return code !== "ENOTFOUND" && code !== "ENODATA";
  }
}
