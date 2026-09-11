import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandBar } from "@/components/layout/CommandBar";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { GridBackground, ScanlineBackground } from "@/components/hud/Atmosphere";
import { NavLink } from "react-router-dom";
import { navModules, settingsModule } from "@/modules/registry";
import { BootProvider } from "@/motion/boot";
import { HudToastHost, PageTransition } from "@/components/ui";

export function MainLayout() {
  return (
    <BootProvider>
    <div className="relative flex h-dvh overflow-hidden bg-[color:var(--bg-primary)] text-text-primary cc-boot-shell">
      <GridBackground />
      <ScanlineBackground />
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <CommandBar />
        <main className="min-h-0 flex-1 overflow-auto pb-20 md:pb-6" style={{ padding: "var(--cc-page-pad)" }}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[color:var(--border)] bg-[color:var(--bg-secondary)] md:hidden">
          {navModules.slice(0, 4).map((mod) => (
            <NavLink
              key={mod.id}
              to={mod.path}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2 font-display text-[9px] tracking-[0.12em] uppercase ${
                  isActive ? "text-[color:var(--accent)]" : "text-[color:var(--icon)]"
                }`
              }
            >
              <mod.icon size={16} />
              {mod.name}
            </NavLink>
          ))}
          <NavLink
            to={settingsModule.path}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 font-display text-[9px] tracking-[0.12em] uppercase ${
                isActive ? "text-[color:var(--accent)]" : "text-[color:var(--icon)]"
              }`
            }
          >
            <settingsModule.icon size={16} />
            {settingsModule.name}
          </NavLink>
        </nav>
      </div>
      <GlobalSearch />
      <HudToastHost />
    </div>
    </BootProvider>
  );
}
