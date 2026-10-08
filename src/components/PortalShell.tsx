import type { AppRole } from "@/lib/auth/identity";
import { Sidebar } from "./Sidebar";
import { ResponsiveTables } from "./ResponsiveTables";

export function PortalShell({ role, children }: { role: AppRole; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <input type="checkbox" id="mobile-nav-toggle" className="mobile-nav-checkbox" />
      <Sidebar role={role} />
      <label htmlFor="mobile-nav-toggle" className="sidebar-backdrop" aria-hidden="true"></label>
      <div className="content-area">{children}</div>
      <ResponsiveTables />
    </div>
  );
}
