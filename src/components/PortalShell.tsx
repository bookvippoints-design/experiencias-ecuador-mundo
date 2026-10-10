import type { AppRole } from "@/lib/auth/identity";
import { Sidebar } from "./Sidebar";
import { ResponsiveTables } from "./ResponsiveTables";
import { whatsappUrl } from "@/lib/brand";

export function PortalShell({ role, children }: { role: AppRole; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <input type="checkbox" id="mobile-nav-toggle" className="mobile-nav-checkbox" />
      <Sidebar role={role} />
      <label htmlFor="mobile-nav-toggle" className="sidebar-backdrop" aria-hidden="true"></label>
      <div className="content-area">{children}</div>
      <ResponsiveTables />
      {role === "user" && (
        <a
          className="help-float"
          href={whatsappUrl("Hola, necesito ayuda con mi cuenta de Experiencias Ecuador y el Mundo")}
          target="_blank"
          rel="noreferrer"
          aria-label="Ayuda por WhatsApp"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" /></svg>
          <span className="help-float__text">¿Necesitas ayuda?</span>
        </a>
      )}
    </div>
  );
}
