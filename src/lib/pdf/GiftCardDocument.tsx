import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const BLUE = "#4aa8e0";
const BLUE_DARK = "#1f7fb8";
const ORANGE = "#f07a1f";
const ORANGE_DARK = "#c4520a";
const SKY = "#eaf6fd";
const TEXT = "#2b2f33";

const styles = StyleSheet.create({
  page: { backgroundColor: SKY, padding: 28, fontFamily: "Helvetica", color: TEXT },
  card: { backgroundColor: "#ffffff", borderRadius: 14, flexGrow: 1, overflow: "hidden" },
  header: { backgroundColor: BLUE, paddingVertical: 20, paddingHorizontal: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: "#ffffff", fontSize: 18, fontFamily: "Helvetica-Bold" },
  slogan: { color: "#ffffff", fontSize: 10, fontFamily: "Helvetica-Oblique", marginTop: 2 },
  ribbon: { backgroundColor: ORANGE, color: "#ffffff", fontSize: 10, fontFamily: "Helvetica-Bold", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  body: { paddingHorizontal: 28, paddingTop: 22, paddingBottom: 16, flexDirection: "row", gap: 24 },
  left: { flexGrow: 1, flexBasis: 0 },
  right: { width: 120, alignItems: "center" },
  eyebrow: { fontSize: 9, color: BLUE_DARK, fontFamily: "Helvetica-Bold", letterSpacing: 1.2 },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", color: ORANGE_DARK, marginTop: 4 },
  from: { fontSize: 11, marginTop: 4 },
  dedication: { marginTop: 12, padding: 12, backgroundColor: SKY, borderRadius: 8, fontSize: 11, fontFamily: "Helvetica-Oblique", lineHeight: 1.4 },
  listTitle: { marginTop: 14, fontSize: 10, fontFamily: "Helvetica-Bold", color: BLUE_DARK },
  item: { flexDirection: "row", marginTop: 5, fontSize: 10.5 },
  bullet: { width: 12, color: ORANGE, fontFamily: "Helvetica-Bold" },
  itemText: { flexGrow: 1, flexBasis: 0 },
  qr: { width: 96, height: 96 },
  qrCaption: { fontSize: 8, color: "#6b7280", textAlign: "center", marginTop: 6 },
  code: { marginTop: 10, fontSize: 9, fontFamily: "Helvetica-Bold", color: ORANGE_DARK },
  footer: { paddingHorizontal: 28, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#e6eef4", fontSize: 8, color: "#6b7280" },
});

export interface GiftCardData {
  code: string;
  senderName: string;
  recipientName: string;
  dedication: string | null;
  items: string[];
  qrDataUrl: string;
  accessUrlLabel: string;
}

export function GiftCardDocument({ data }: { data: GiftCardData }) {
  return (
    <Document title={`Regalo ${data.code}`} author="Experiencias Ecuador y el Mundo">
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>Experiencias Ecuador y el Mundo</Text>
              <Text style={styles.slogan}>Para disfrutar y regalar</Text>
            </View>
            <Text style={styles.ribbon}>TARJETA DE REGALO</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.left}>
              <Text style={styles.eyebrow}>UN REGALO PARA</Text>
              <Text style={styles.title}>{data.recipientName}</Text>
              <Text style={styles.from}>De parte de {data.senderName}</Text>

              {data.dedication ? <Text style={styles.dedication}>“{data.dedication}”</Text> : null}

              <Text style={styles.listTitle}>TU REGALO INCLUYE</Text>
              {data.items.map((item, i) => (
                <View key={i} style={styles.item}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.right}>
              <Image style={styles.qr} src={data.qrDataUrl} />
              <Text style={styles.qrCaption}>Escanea para entrar a tu cuenta</Text>
              <Text style={styles.code}>{data.code}</Text>
            </View>
          </View>

          <Text style={styles.footer}>
            Entra en {data.accessUrlLabel} con tu correo para ver tus experiencias, su vigencia y solicitar tu reserva.
            Los impuestos y tasas del hotel o resort de la invitación internacional los paga el viajero.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
