import { HudButton } from "@/components/hud/HudButton";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2">
      <span className="font-display text-[10px] tracking-[0.14em] text-text-muted uppercase">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <HudButton variant="ghost" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Prev
        </HudButton>
        <span className="font-display text-[10px] tracking-[0.14em] text-text-secondary">
          {page} / {totalPages}
        </span>
        <HudButton variant="ghost" type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </HudButton>
      </div>
    </div>
  );
}
