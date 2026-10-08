import nodemailer from "nodemailer";
import { APP_NAME, APP_SLOGAN, BRAND, appUrl } from "@/lib/brand";

/**
 * Todos los correos de la plataforma (invitaciones, regalos, recuperación de
 * contraseña y avisos) salen por este SMTP propio. No dependen del SMTP de
 * Supabase Auth.
 */
export function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("Falta configurar SMTP_HOST, SMTP_USER y SMTP_PASSWORD en el servidor.");
  }

  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const transporter = createMailer();
  await transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
}

export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plantilla común de correo con la identidad naranja y azul. */
export function emailLayout(body: string, button?: { label: string; url: string }): string {
  const cta = button
    ? `<p style="margin:28px 0;text-align:center"><a href="${button.url}" style="background:${BRAND.orange};color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:8px;display:inline-block">${escapeHtml(button.label)}</a></p>
       <p style="font-size:12px;color:#6b7280">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${button.url}" style="color:${BRAND.orangeDark};word-break:break-all">${button.url}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:${BRAND.skyLight};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.skyLight};padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="background:${BRAND.blue};padding:22px 28px;color:#ffffff">
      <div style="font-size:20px;font-weight:bold">${APP_NAME}</div>
      <div style="font-size:13px;font-style:italic;opacity:.95">${APP_SLOGAN}</div>
    </td></tr>
    <tr><td style="padding:28px;font-size:15px;line-height:1.6">${body}${cta}</td></tr>
    <tr><td style="padding:16px 28px;background:#f7f9fb;font-size:12px;color:#6b7280">
      ${APP_NAME} · <a href="${appUrl()}" style="color:${BRAND.orangeDark}">${appUrl().replace(/^https?:\/\//, "")}</a>
    </td></tr>
  </table></td></tr></table></body></html>`;
}
