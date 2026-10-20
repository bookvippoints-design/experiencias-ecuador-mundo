import { redirect } from "next/navigation";

/** Los puntos están pausados: esta sección ya no se muestra. */
export default function PuntosPage() {
  redirect("/cuenta/experiencias");
}
