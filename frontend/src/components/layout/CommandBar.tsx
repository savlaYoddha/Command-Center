import { useEffect, useRef, useState } from "react";
import { Bell, Menu, Search, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { modules } from "@/modules/registry";
import { useUiStore } from "@/store/uiStore";
import { StatusIndicator } from "@/components/hud/StatusIndicator";
import { BrandMark } from "@/components/layout/BrandMark";
import { IconButton } from "@/components/hud/IconButton";
import { useAuthStore } from "@/store/authStore";

export function CommandBar() {
  const location = useLocation();
  const current =
    modules.find((m) => m.path !== "/" && location.pathname.startsWith(m.path)) ??
    modules.find((m) => m.path === location.pathname) ??
    modules[0];
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);

  return (
    <header className="cc-boot-header flex h-14 items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="border border-[color:var(--border)] p-2 text-[color:var(--icon)] md:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={16} />
        </button>
        <div className="md:hidden">
          <BrandMark compact />
        </div>
        <div className="hidden min-w-0 md:block">
          <div className="font-display text-[10px] tracking-[0.28em] text-text-muted uppercase">Current system</div>
          <div className="truncate font-display text-xs tracking-[0.18em] text-text-primary">{current.name}</div>
        </div>
      </div>

      <button
        className="hidden min-w-[240px] max-w-md flex-1 items-center gap-2 border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-1.5 text-left text-sm text-text-muted lg:flex"
        onClick={() => setSearchOpen(true)}
      >
        <Search size={14} className="text-[color:var(--icon)]" />
        <span>Search systems…</span>
      </button>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <StatusIndicator />
        </div>
        <IconButton label="Notifications">
          <Bell size={16} />
        </IconButton>
        <button
          className="border border-[color:var(--border)] p-2 text-[color:var(--icon)] lg:hidden"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
        >
          <Search size={16} />
        </button>
        <OperatorMenu />
      </div>
    </header>
  );
}

function OperatorMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <IconButton label="Operator menu" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <UserRound size={16} />
      </IconButton>
      {open ? (
        <div className="absolute right-0 z-[var(--cc-z-overlay)] mt-2 w-52 border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-3 shadow-hud">
          <div className="mb-2 font-display text-[10px] tracking-[0.16em] text-text-muted uppercase">Operator</div>
          <div className="mb-3 truncate text-sm text-text-primary">{user?.username}</div>
          <Link
            to="/settings"
            className="mb-1 block w-full border border-[color:var(--border)] px-3 py-2 text-left font-display text-[10px] tracking-[0.16em] uppercase text-[color:var(--icon)] hover:border-[color:var(--accent)] no-underline"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            type="button"
            className="block w-full border border-[color:var(--danger)] px-3 py-2 text-left font-display text-[10px] tracking-[0.16em] uppercase text-[color:var(--danger)]"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
