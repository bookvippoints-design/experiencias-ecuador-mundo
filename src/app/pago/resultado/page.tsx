import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_NAME, APP_SLOGAN, whatsappUrl } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function PagoResultado({ searchParams }: { searchParams: Promise<{ estado?: string; tx?: string }> }) {
  const { estado = "error", tx } = await searchParams;
  let kind: "order" | "quota" = "order";
  let label = "";
  let gift: string | null = null;
  let status = estado;
  if (tx && tx.length <= 50) {
    const admin = createAdminClient();
    const { data: pay } = await admin.from("payphone_payments").select("kind, status, order_id, plan_key, quota_purchase_id").eq("client_tx_id", tx).maybeSingle();
    if (pay) {
      kind = pay.kind;
      // El estado se toma de la base, no de la dirección.
      if (pay.status === "approved") {
        status = "approved";
        if (pay.kind === "order") {
          const { data: o } = await admin.from("orders").select("code, status, mode, recipient_name, product_snapshot").eq("id", pay.order_id).single();
          if (o) {
            label = `${(o.product_snapshot as { name: string }).name} · pedido ${o.code}`;
            gift = o.mode === "gift" ? o.recipient_name : null;
            if (o.status !== "approved") status = "pending_credit";
          }
        } else {
          label = `Plan ${pay.plan_key}`;
          if (!pay.quota_purchase_id) status = "pending_credit";
        }
      } else if (pay.status === "canceled") status = "canceled";
      else if (pay.status === "failed") status = "error";
    }
  }

  const home = kind === "quota" ? "/empresa/compras" : gift ? "/cuenta/regalos" : "/cuenta/experiencias";
  const retry = kind === "quota" ? "/empresa/compras" : "/cuenta/pedidos";
  const help = whatsappUrl(`Hola, tengo una consulta sobre mi pago${tx ? ` (referencia ${tx})` : ""} en Experiencias Ecuador y el Mundo`);

  const view = {
    approved: {
      icon: "✓", title: "¡Pago aprobado!",
      text: kind === "quota"
        ? "Los cupos ya se sumaron a tu empresa. Ya puedes crear las cuentas de tus usuarios."
        : gift
          ? `Tu regalo ya está en la cuenta de ${gift}. Le enviamos un correo para que lo active.`
          : "Tus experiencias ya están en tu cuenta. Te enviamos la confirmación por correo.",
      button: { href: home, label: kind === "quota" ? "Ver mis cupos" : gift ? "Ver mis regalos" : "Ver mis experiencias" },
    },
    pending_credit: {
      icon: "⏳", title: "Recibimos tu pago",
      text: "PayPhone aprobó tu pago y lo estamos acreditando. Te avisaremos por correo y en tu bandeja de mensajes; no necesitas pagar de nuevo.",
      button: { href: home, label: "Ir a mi cuenta" },
    },
    canceled: {
      icon: "↺", title: "El pago no se completó",
      text: "No se realizó ningún cobro. Puedes intentarlo de nuevo cuando quieras.",
      button: { href: retry, label: "Intentar de nuevo" },
    },
    error: {
      icon: "!", title: "No pudimos confirmar el pago",
      text: "Si se debitó el valor de tu tarjeta, PayPhone lo devuelve automáticamente cuando el pago no se confirma. Si tienes dudas, escríbenos.",
      button: { href: retry, label: "Volver a intentar" },
    },
  }[status as "approved" | "pending_credit" | "canceled" | "error"] ?? null;
  const v = view ?? {
    icon: "!", title: "No pudimos confirmar el pago",
    text: "Escríbenos por WhatsApp para revisarlo.", button: { href: retry, label: "Volver" },
  };

  return (
    <main className="login-page">
      <div className="login-card pay-result">
        <h1>{APP_NAME}</h1>
        <p className="tagline">{APP_SLOGAN}</p>
        <div className={`pay-result__icon pay-result__icon--${status === "approved" ? "ok" : status === "pending_credit" ? "wait" : "bad"}`} aria-hidden="true">{v.icon}</div>
        <h2 className="step-title">{v.title}</h2>
        {label && <p className="step-email"><strong>{label}</strong></p>}
        <p className="step-text">{v.text}</p>
        <Link className="btn-orange" href={v.button.href} style={{ display: "block", textAlign: "center" }}>{v.button.label}</Link>
        {tx && <p className="field-hint" style={{ textAlign: "center" }}>Referencia: {tx}</p>}
        <p className="step-help">¿Dudas? <a href={help} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a></p>
      </div>
    </main>
  );
}
