import { NavLink } from "react-router-dom";

const items = [
  { to: "/tasks", label: "Active", end: true },
  { to: "/tasks/archive", label: "Archive", end: false },
  { to: "/tasks/recycle", label: "Recycle Bin", end: false },
] as const;

export function TaskLifecycleNav() {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `border px-3 py-2 font-display text-[10px] tracking-[0.16em] uppercase ${
              isActive
                ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                : "border-[color:var(--border)] text-text-muted hover:border-[color:var(--accent)]"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
