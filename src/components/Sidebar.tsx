import Link from "next/link";
import type { AppRole } from "@/lib/auth/identity";
import { APP_NAME, APP_SLOGAN } from "@/lib/brand";
import { SignOutButton } from "./SignOutButton";

interface NavItem {
  href: string;
  label: string;
  external?: boolean;
  gift?: boolean;
}

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Resumen" },
    { href: "/admin/empresas", label: "Empresas y cupos" },
    { href: "/admin/compras", label: "Compras de cupos" },
    { href: "/admin/pedidos", label: "Pedidos y pagos" },
    { href: "/admin/regalos", label: "Regalos", gift: true },
    { href: "/admin/beneficios", label: "Beneficios" },
    { href: "/admin/reservas", label: "Solicitudes de reserva" },
    { href: "/admin/catalogo", label: "Catálogo" },
    { href: "/admin/usuarios", label: "Usuarios" },
  ],
  company: [
    { href: "/empresa", label: "Resumen" },
    { href: "/empresa/usuarios", label: "Usuarios" },
    { href: "/empresa/compras", label: "Comprar cupos" },
    { href: "/empresa/configuracion", label: "Mi empresa" },
  ],
  user: [
    { href: "/cuenta", label: "Inicio" },
    { href: "/cuenta/catalogo", label: "Catálogo" },
    { href: "/cuenta/comparar", label: "Comparar paquetes" },
    { href: "/cuenta/experiencias", label: "Mis experiencias" },
    { href: "/cuenta/regalos", label: "Regalos", gift: true },
    { href: "/cuenta/puntos", label: "Mis puntos" },
    { href: "/cuenta/reservas", label: "Mis canjes y reservas" },
    { href: "/cuenta/pedidos", label: "Mis pedidos" },
  ],
};

export function Sidebar({ role }: { role: AppRole }) {
  const items = NAV_BY_ROLE[role];

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true">EE</span>
        <div>
          <div className="sidebar__brand-name">{APP_NAME}</div>
          <div className="sidebar__brand-tag">{APP_SLOGAN}</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) =>
          item.external ? (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="sidebar__link">
              {item.label}
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={`sidebar__link${item.gift ? " is-gift" : ""}`}>
              {item.label}
            </Link>
          )
        )}
      </nav>

      <div className="sidebar__footer">
        <SignOutButton />
      </div>
    </aside>
  );
}
