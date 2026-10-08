import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { GiftCardDocument } from "./GiftCardDocument";
import { appUrl } from "@/lib/brand";
import { KIND_LABEL, longDate, points, type EntitlementKind } from "@/lib/format";

export interface GiftCardItem {
  kind: EntitlementKind;
  valid_until: string | null;
  points: number | null;
  national_days: number | null;
  national_nights: number | null;
}

export function describeGiftItem(item: GiftCardItem): string {
  if (item.kind === "points") return `${points(item.points)} para ahorro en hoteles (no caducan)`;
  const base =
    item.kind === "national"
      ? `${KIND_LABEL.national} de ${item.national_days} días y ${item.national_nights} ${item.national_nights === 1 ? "noche" : "noches"} para 2 personas, con desayuno`
      : `${KIND_LABEL.international} (más de 130 destinos)`;
  return `${base} · vence el ${longDate(item.valid_until)}`;
}

export async function generateGiftCardPdf(params: {
  code: string;
  senderName: string;
  recipientName: string;
  dedication: string | null;
  items: GiftCardItem[];
}): Promise<Buffer> {
  const loginUrl = `${appUrl()}/login`;
  const qrDataUrl = await QRCode.toDataURL(loginUrl, {
    margin: 0,
    width: 300,
    color: { dark: "#1f7fb8", light: "#ffffff" },
  });

  return renderToBuffer(
    <GiftCardDocument
      data={{
        code: params.code,
        senderName: params.senderName,
        recipientName: params.recipientName,
        dedication: params.dedication,
        items: params.items.map(describeGiftItem),
        qrDataUrl,
        accessUrlLabel: appUrl().replace(/^https?:\/\//, ""),
      }}
    />
  );
}
