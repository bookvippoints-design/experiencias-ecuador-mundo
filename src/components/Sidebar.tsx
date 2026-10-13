import type { AppRole } from "@/lib/auth/identity";
import { APP_NAME, APP_SLOGAN } from "@/lib/brand";
import { SignOutButton } from "./SignOutButton";
import { SidebarLinks, type NavItem } from "./NavLinks";


export const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Resumen" },
    { href: "/admin/empresas", label: "Empresas y cupos" },
    { href: "/admin/compras", label: "Compras de cupos" },
    { href: "/admin/pedidos", label: "Pedidos y pagos" },
    { href: "/admin/regalos", label: "Regalos", gift: true },
    { href: "/admin/beneficios", label: "Beneficios" },
    { href: "/admin/reservas", label: "Solicitudes de reserva" },
    { href: "/admin/destinos", label: "Destinos internacionales" },
    { href: "/admin/catalogo", label: "Catálogo" },
    { href: "/admin/usuarios", label: "Usuarios" },
    { href: "/admin/mensajes", label: "Mensajes a clientes" },
    { href: "/admin/correos", label: "Correos enviados" },
  ],
  company: [
    { href: "/empresa", label: "Resumen" },
    { href: "/empresa/usuarios", label: "Usuarios" },
    { href: "/empresa/compras", label: "Comprar cupos" },
    { href: "/empresa/configuracion", label: "Mi empresa" },
  ],
  user: [
    { href: "/cuenta", label: "Inicio", icon: "home" },
    { href: "/cuenta/catalogo", label: "Paquetes", icon: "bag", also: ["/cuenta/comparar", "/cuenta/destinos"] },
    { href: "/cuenta/experiencias", label: "Lo que tengo", icon: "suitcase", also: ["/cuenta/reservas", "/cuenta/puntos", "/cuenta/pedidos", "/cuenta/regalos"] },
    { href: "/cuenta/mensajes", label: "Mensajes", icon: "mail" },
    { href: "/cuenta/como-funciona", label: "Ayuda", icon: "help" },
  ],
};

export function Sidebar({ role, badges = {} }: { role: AppRole; badges?: Record<string, number> }) {
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
        <SidebarLinks items={items} badges={badges} />
      </nav>

      <div className="sidebar__footer">
        <SignOutButton />
      </div>
    </aside>
  );
}
