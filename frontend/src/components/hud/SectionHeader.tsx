type Props = {
  kicker?: string;
  title: string;
  action?: React.ReactNode;
};

export function SectionHeader({ kicker, title, action }: Props) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {kicker ? (
          <div className="font-display text-[10px] tracking-[0.28em] text-[color:var(--accent)] uppercase">
            {kicker}
          </div>
        ) : null}
        <h2 className="font-display text-sm tracking-[0.18em] text-text-primary uppercase">{title}</h2>
      </div>
      {action}
    </div>
  );
}
