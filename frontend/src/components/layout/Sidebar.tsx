import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { navModules, settingsModule } from "@/modules/registry";
import { useUiStore } from "@/store/uiStore";
import { BrandMark } from "./BrandMark";
import { StatusIndicator } from "@/components/hud/StatusIndicator";

function NavItems({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  return (
    <div className="cc-boot-nav flex flex-1 flex-col">
      <nav className="flex-1 space-y-1 px-2">
        {navModules.map((mod) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            title={mod.name}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 border px-3 py-2 font-display text-[11px] tracking-[0.16em] uppercase transition-colors duration-[var(--anim)] ${
                collapsed ? "justify-center px-2" : ""
              } ${
                isActive
                  ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                  : "border-transparent text-[color:var(--icon)] hover:border-[color:var(--border)] hover:text-text-primary"
              }`
            }
          >
            <mod.icon size={16} className="shrink-0" />
            {collapsed ? <span className="sr-only">{mod.name}</span> : mod.name}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-[color:var(--border)] p-2">
        <NavLink
          to={settingsModule.path}
          title={settingsModule.name}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 font-display text-[11px] tracking-[0.16em] uppercase ${
              collapsed ? "justify-center px-2" : ""
            } ${isActive ? "text-[color:var(--accent)]" : "text-[color:var(--icon)]"}`
          }
        >
          <settingsModule.icon size={16} className="shrink-0" />
          {collapsed ? <span className="sr-only">{settingsModule.name}</span> : settingsModule.name}
        </NavLink>
      </div>
    </div>
  );
}

function DesktopRail() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside className="relative z-20 hidden h-full shrink-0 md:block">
      <div
        className={`flex h-full flex-col overflow-hidden bg-[color:var(--bg-secondary)] ${
          collapsed ? "w-[72px]" : "w-60"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-[color:var(--border)] px-2 cc-boot-header">
          {collapsed ? (
            <button
              type="button"
              className="flex h-10 w-full items-center justify-center text-[color:var(--accent)]"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <ChevronsRight size={18} />
            </button>
          ) : (
            <div className="flex w-full items-center justify-between gap-2 px-1">
              <BrandMark />
              <button
                type="button"
                className="shrink-0 text-[color:var(--icon)] hover:text-[color:var(--accent)]"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronsLeft size={16} />
              </button>
            </div>
          )}
        </div>
        <div className={`cc-boot-status py-3 ${collapsed ? "flex justify-center px-1" : "px-3"}`}>
          {collapsed ? <StatusIndicator label="" /> : <StatusIndicator />}
        </div>
        <NavItems collapsed={collapsed} onNavigate={() => undefined} />
      </div>
    </aside>
  );
}

function MobileDrawer() {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <div className={`fixed inset-0 z-40 md:hidden ${mobileNavOpen ? "" : "pointer-events-none"}`}>
      <button
        className={`absolute inset-0 bg-black/60 transition-opacity ${mobileNavOpen ? "opacity-100" : "opacity-0"}`}
        onClick={() => setMobileNavOpen(false)}
        aria-label="Close navigation"
      />
      <div
        className={`absolute inset-y-0 left-0 w-60 bg-[color:var(--bg-secondary)] transition-transform duration-[var(--anim)] ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b border-[color:var(--border)] px-3">
            <BrandMark />
          </div>
          <div className="px-3 py-3">
            <StatusIndicator />
          </div>
          <NavItems collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      <DesktopRail />
      <MobileDrawer />
    </>
  );
}
