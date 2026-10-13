import { POINTS_LOGIN_URL } from "@/lib/brand";

/** Botón para entrar a la plataforma de puntos BookVipPoints (se abre en otra pestaña). */
export function PointsLoginButton({ small = true, label = "Ir a BookVipPoints" }: { small?: boolean; label?: string }) {
  return (
    <a className={`btn-points${small ? " btn-small" : ""}`} href={POINTS_LOGIN_URL} target="_blank" rel="noreferrer">
      <span aria-hidden="true">⭐</span> {label} <span aria-hidden="true">↗</span>
    </a>
  );
}
