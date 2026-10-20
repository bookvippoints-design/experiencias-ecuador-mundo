import { redirect } from "next/navigation";

/** La ficha anterior ahora es "Activar paquete". */
export default async function FichaAnterior({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/cuenta/activar/${encodeURIComponent(slug)}`);
}
