import { WHATSAPP_NUMBER } from "@/lib/brand";

export function WhatsAppButton({ message, phone, label }: { message: string; phone?: string; label?: string }) {
  const number = (phone || WHATSAPP_NUMBER).replace(/\D/g, "");
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="whatsapp-button">
      <span aria-hidden="true">💬</span> {label ?? (phone ? "Contactar por WhatsApp" : "Escríbenos por WhatsApp")}
    </a>
  );
}
