import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const NAVY = "#102D40";
const ORANGE = "#F07A1F";
const BURNT = "#C4520A";
const BLUE = "#1F7FB8";
const PALE = "#EAF6FD";
const CREAM = "#FFF1E6";
const BODY = "#2C4A5C";
const MUTED = "#5D7686";

export type PdfImage = { data: Buffer; format: "jpg" | "png" } | null;

export interface InvitationData {
  recipientName: string;
  email: string;
  companyName: string | null;
  companyLogo: PdfImage;
  brandLogo: PdfImage;
  hero1: PdfImage;
  hero2: PdfImage;
  national: { name: string; img: PdfImage }[];
  international: { name: string; img: PdfImage }[];
  qr: Buffer;
  code: string;
  whatsapp: string;
  site: string;
}

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", color: NAVY, backgroundColor: "#FFFFFF" },
  header: { height: 84, paddingHorizontal: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  companyBox: { width: 160, height: 50, justifyContent: "center" },
  companyLogo: { maxWidth: 160, maxHeight: 50, objectFit: "contain" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY },
  brandWrap: { flexDirection: "row", alignItems: "center" },
  brandText: { alignItems: "flex-end", marginRight: 9 },
  invites: { fontSize: 7.5, letterSpacing: 1.2, fontFamily: "Helvetica-Bold", color: MUTED },
  brandName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BURNT, textAlign: "right", lineHeight: 1.15 },
  slogan: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLUE },
  brandLogo: { width: 40, height: 40, borderRadius: 9 },
  heroRow: { height: 165, flexDirection: "row", position: "relative" },
  hero1: { width: "62%", height: 165, objectFit: "cover" },
  hero2: { width: "38%", height: 165, objectFit: "cover" },
  heroFallback: { backgroundColor: PALE },
  ribbonRow: { flexDirection: "row", paddingHorizontal: 36, marginTop: -13 },
  ribbon: { backgroundColor: ORANGE, color: "#FFFFFF", fontSize: 9.5, fontFamily: "Helvetica-Bold", letterSpacing: 1.4, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 13 },
  intro: { paddingTop: 12, paddingHorizontal: 36 },
  greeting: { fontSize: 12.5, fontFamily: "Helvetica-Bold", color: BLUE },
  title: { fontSize: 25, fontFamily: "Helvetica-Bold", lineHeight: 1.08, marginTop: 7 },
  titleAccent: { color: BURNT },
  message: { fontSize: 10.5, lineHeight: 1.5, color: BODY, marginTop: 7, textAlign: "justify" },
  strong: { fontFamily: "Helvetica-Bold" },
  section: { paddingHorizontal: 36, marginTop: 12 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 5 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  sectionNote: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BURNT },
  tiles: { flexDirection: "row", justifyContent: "space-between" },
  tile: { height: 57, borderRadius: 7, overflow: "hidden", position: "relative" },
  tileImg: { width: "100%", height: 57, objectFit: "cover" },
  tileLabel: { position: "absolute", left: 0, right: 0, bottom: 0, paddingVertical: 3, paddingHorizontal: 5, backgroundColor: NAVY, opacity: 0.85, color: "#FFFFFF", fontSize: 8, fontFamily: "Helvetica-Bold" },
  card: { marginTop: 15, marginHorizontal: 36, backgroundColor: NAVY, borderRadius: 15, paddingVertical: 15, paddingHorizontal: 18, flexDirection: "row", alignItems: "center" },
  qrBox: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 7, alignItems: "center", marginRight: 18 },
  qr: { width: 99, height: 99 },
  scan: { fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginTop: 3 },
  steps: { flexGrow: 1, flexBasis: 0, color: "#FFFFFF" },
  stepsTitle: { fontSize: 15.5, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  step: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  stepNum: { width: 16, height: 16, borderRadius: 8, backgroundColor: ORANGE, color: "#FFFFFF", fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "center", paddingTop: 3, marginRight: 7 },
  stepText: { fontSize: 10, lineHeight: 1.35, flexGrow: 1, flexBasis: 0 },
  emailLine: { fontSize: 9, color: "#CFE3EF", borderTopWidth: 1, borderTopColor: "#2F5068", paddingTop: 6, marginTop: 2 },
  footer: { position: "absolute", left: 36, right: 36, bottom: 22, flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: MUTED },
});

function Tiles({ items, gap, fallback }: { items: { name: string; img: PdfImage }[]; gap: number; fallback: string }) {
  const width = (595 - 72 - gap * (items.length - 1)) / items.length;
  return (
    <View style={s.tiles}>
      {items.map((d) => (
        <View key={d.name} style={[s.tile, { width, backgroundColor: fallback }]}>
          {d.img ? <Image style={s.tileImg} src={d.img} /> : null}
          <Text style={s.tileLabel}>{d.name}</Text>
        </View>
      ))}
    </View>
  );
}

export function InvitationDocument({ data }: { data: InvitationData }) {
  const host = data.companyName ?? "Experiencias Ecuador y el Mundo";
  return (
    <Document title={`Invitación · ${data.recipientName}`} author="Experiencias Ecuador y el Mundo">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.companyBox}>
            {data.companyLogo ? (
              <Image style={s.companyLogo} src={data.companyLogo} />
            ) : data.companyName ? (
              <Text style={s.companyName}>{data.companyName}</Text>
            ) : null}
          </View>
          <View style={s.brandWrap}>
            <View style={s.brandText}>
              <Text style={s.invites}>{data.companyName ? "TE INVITA A" : "BIENVENIDA A"}</Text>
              <Text style={s.brandName}>Experiencias Ecuador{"\n"}y el Mundo</Text>
              <Text style={s.slogan}>Para disfrutar y regalar</Text>
            </View>
            {data.brandLogo ? <Image style={s.brandLogo} src={data.brandLogo} /> : null}
          </View>
        </View>

        <View style={s.heroRow}>
          {data.hero1 ? <Image style={s.hero1} src={data.hero1} /> : <View style={[s.hero1, s.heroFallback]} />}
          {data.hero2 ? <Image style={s.hero2} src={data.hero2} /> : <View style={[s.hero2, s.heroFallback]} />}
        </View>
        <View style={s.ribbonRow}><Text style={s.ribbon}>INVITACIÓN PERSONAL</Text></View>

        <View style={s.intro}>
          <Text style={s.greeting}>Querid@ {data.recipientName}:</Text>
          <Text style={s.title}>
            Hay viajes que se recuerdan toda la vida. <Text style={s.titleAccent}>El tuyo empieza aquí.</Text>
          </Text>
          <Text style={s.message}>
            En <Text style={s.strong}>{host}</Text> queremos agradecerte con algo que no se guarda en un cajón: momentos para vivir.
            Te abrimos las puertas a un catálogo privado de escapadas con precios especiales, para disfrutar con quien más quieres
            o para regalar una sorpresa inolvidable.
          </Text>
        </View>

        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Destinos nacionales</Text>
            <Text style={s.sectionNote}>Para ti y un acompañante</Text>
          </View>
          <Tiles items={data.national} gap={6} fallback={PALE} />
        </View>

        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Más de 130 destinos internacionales</Text>
            <Text style={s.sectionNote}>Hoteles y resorts en el mundo</Text>
          </View>
          <Tiles items={data.international} gap={6} fallback={CREAM} />
        </View>

        <View style={s.card}>
          <View style={s.qrBox}>
            <Image style={s.qr} src={{ data: data.qr, format: "png" }} />
            <Text style={s.scan}>ESCANÉAME</Text>
          </View>
          <View style={s.steps}>
            <Text style={s.stepsTitle}>Activa tu acceso en 3 pasos</Text>
            <View style={s.step}><Text style={s.stepNum}>1</Text><Text style={s.stepText}>Escanea el código con la cámara de tu celular.</Text></View>
            <View style={s.step}><Text style={s.stepNum}>2</Text><Text style={s.stepText}>Confirma tu correo y crea tu propia contraseña.</Text></View>
            <View style={s.step}><Text style={s.stepNum}>3</Text><Text style={s.stepText}>Elige tu experiencia: tienes 14 días de precios especiales para activarla.</Text></View>
            <Text style={s.emailLine}>Tu correo para entrar: <Text style={[s.strong, { color: "#FFFFFF" }]}>{data.email}</Text></Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>¿Dudas? Escríbenos por WhatsApp al {data.whatsapp}{"\n"}{data.site} · Imágenes referenciales</Text>
          <Text style={{ textAlign: "right" }}>Invitación personal e intransferible{"\n"}Código {data.code}</Text>
        </View>
      </Page>
    </Document>
  );
}
