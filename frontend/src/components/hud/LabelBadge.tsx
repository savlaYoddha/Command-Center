type Props = {
  children: React.ReactNode;
  color?: string;
  onClick?: () => void;
};

export function LabelBadge({ children, color = "var(--accent)", onClick }: Props) {
  const className =
    "inline-flex border px-1.5 py-0.5 font-display text-[8px] tracking-[0.14em] uppercase";
  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={{ borderColor: color, color }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <span className={className} style={{ borderColor: color, color }}>
      {children}
    </span>
  );
}
