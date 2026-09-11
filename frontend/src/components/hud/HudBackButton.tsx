import { useNavigate } from "react-router-dom";
import { HudButton } from "./HudButton";
import { HudLink } from "./HudLink";

type Props = {
  label?: string;
  to?: string;
  fallback?: string;
};

export function HudBackButton({ label = "BACK", to, fallback = "/" }: Props) {
  const navigate = useNavigate();

  if (to) {
    return (
      <HudLink to={to} className="inline-flex no-underline">
        <span className="clip-hud border border-[color:var(--border)] px-4 py-2.5 font-display text-[11px] tracking-[0.18em] text-text-primary uppercase hover:border-[color:var(--accent)]">
          {label}
        </span>
      </HudLink>
    );
  }

  return (
    <HudButton
      type="button"
      variant="ghost"
      onClick={() => {
        if (window.history.length > 1) navigate(-1);
        else navigate(fallback);
      }}
    >
      {label}
    </HudButton>
  );
}
