type Props = {
  value: string | number;
  label: string;
  unit?: string;
};

export function DataReadout({ value, label, unit }: Props) {
  return (
    <div>
      <div className="font-display text-[10px] tracking-[0.2em] text-text-muted uppercase">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl text-text-primary">{value}</span>
        {unit ? <span className="text-xs tracking-widest text-text-secondary">{unit}</span> : null}
      </div>
    </div>
  );
}
