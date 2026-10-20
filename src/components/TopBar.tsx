import type { CurrentProfile } from "@/lib/auth/identity";

const ROLE_LABEL: Record<CurrentProfile["role"], string> = {
  admin: "Administración",
  company: "Cuenta empresarial",
  user: "Mi cuenta",
};

function roleLabel(p: CurrentProfile) {
  if (p.role !== "company") return ROLE_LABEL[p.role];
  if (p.companyRole === "owner") return "Administrador principal";
  if (p.companyRole === "admin") return "Administrador";
  return p.department ? `Departamento: ${p.department}` : "Equipo";
}

/** Barra superior. Nombre e iniciales siempre vienen del perfil autenticado. */
export function TopBar({ profile, eyebrow, title }: { profile: CurrentProfile; eyebrow: string; title: string }) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <label htmlFor="mobile-nav-toggle" className="hamburger-btn" aria-label="Abrir menú">
          ☰
        </label>
        <div>
          <div className="topbar__eyebrow">{eyebrow}</div>
          <h1 className="topbar__title">{title}</h1>
        </div>
      </div>
      <div className="topbar__user">
        <div className="topbar__user-text">
          <span className="topbar__name">{profile.fullName}</span>
          <span className="topbar__role">{roleLabel(profile)}</span>
        </div>
        <span className="topbar__avatar" aria-hidden="true">
          {profile.initials}
        </span>
      </div>
    </header>
  );
}
