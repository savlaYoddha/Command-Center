// ─────────────────────────────────────────────────────────────
// LOAN PORTFOLIO GRAPH — full-width outstanding-over-time chart
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { ChartCard, HudSelect } from "@/components/ui";
import { calculateEmi, inr, type Loan } from "./loanEngine";

type SeriesMode = "portfolio" | "single";

export function LoanPortfolioGraph({ loans }: { loans: Loan[] }) {
  const [mode, setMode] = useState<SeriesMode>("portfolio");
  const [selectedId, setSelectedId] = useState<string>(loans[0]?.id ?? "");

  // Aggregate outstanding per month across selected loans
  const series = useMemo(() => {
    const activeLoans = mode === "portfolio" ? loans : loans.filter((l) => l.id === selectedId);
    if (activeLoans.length === 0) return [];
    // Find max tenure
    const maxMonths = Math.max(...activeLoans.map((l) => l.tenureMonths), 1);
    // For each month, outstanding = sum of remaining principal on each loan's (possibly part-paid) schedule
    const points: Array<{ label: string; outstanding: number; principal: number; interest: number }> = [];
    for (let month = 1; month <= maxMonths; month++) {
      let outstanding = 0;
      let principal = 0;
      let interest = 0;
      for (const loan of activeLoans) {
        const schedule = scheduleFor(loan);
        const row = schedule[Math.min(month - 1, schedule.length - 1)];
        if (!row) continue;
        outstanding += row.closingBalance;
        principal += row.principal;
        interest += row.interest;
      }
      const label = month <= 1 ? "Start" : `M${month}`;
      points.push({ label, outstanding, principal, interest });
    }
    // Downsample to ≤ 48 points for readability
    return downsample(points, 48);
  }, [loans, mode, selectedId]);

  const max = Math.max(...series.map((p) => p.outstanding), 1);

  return (
    <ChartCard
      title="Loan portfolio — outstanding principal over time"
      description={mode === "portfolio" ? "Combined balance across all loans (scheduled)" : loans.find((l) => l.id === selectedId)?.loanId ?? "Selected loan"}
      className="w-full"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--border)] pb-4">
        <div className="grid max-w-xs flex-1 grid-cols-2 gap-3">
          <HudSelect label="Scope" value={mode} onChange={(e) => setMode(e.target.value as SeriesMode)}>
            <option value="portfolio">Full portfolio</option>
            <option value="single">Single loan</option>
          </HudSelect>
          {mode === "single" ? (
            <HudSelect label="Loan" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {loans.map((loan) => <option key={loan.id} value={loan.id}>{loan.loanId} — {loan.name}</option>)}
            </HudSelect>
          ) : <div className="text-xs text-text-secondary self-end pb-1">{loans.length} loan{loans.length === 1 ? "" : "s"} combined</div>}
        </div>
        <div className="flex gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-[color:var(--accent)]" /> Outstanding</span>
        </div>
      </div>

      {series.length === 0 ? (
        <div className="py-16 text-center text-sm text-text-muted">No loans yet — add or import one to see the graph.</div>
      ) : (
        <svg viewBox="0 0 800 260" className="h-auto w-full" role="img" aria-label="Outstanding principal over time">
          <defs>
            <linearGradient id="loan-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = 20 + (230 - 40) * tick;
            return (
              <g key={tick}>
                <line x1={40} y1={y} x2={790} y2={y} stroke="var(--border)" strokeOpacity="0.5" />
                <text x={36} y={y + 3} textAnchor="end" className="fill-[var(--text-muted)] text-[10px]">{inr(max * (1 - tick))}</text>
              </g>
            );
          })}
          {/* area + line */}
          <path
            d={`M ${40} ${20 + (230 - 40) * (1 - series[0].outstanding / max)} L ${series.map((p, i) => {
              const x = 40 + (750 / Math.max(series.length - 1, 1)) * i;
              const y = 20 + (230 - 40) * (1 - p.outstanding / max);
              return `${i === 0 ? "" : " L"}${x} ${y}`;
            }).join("")} L 790 ${200} Z`}
            fill="url(#loan-area)"
          />
          <path
            d={series.map((p, i) => {
              const x = 40 + (750 / Math.max(series.length - 1, 1)) * i;
              const y = 20 + (230 - 40) * (1 - p.outstanding / max);
              return `${i === 0 ? "M" : " L"}${x} ${y}`;
            }).join("")}
            fill="none" stroke="var(--accent)" strokeWidth="2.5"
          />
          {/* labels */}
          {series.map((p, i) => {
            const x = 40 + (750 / Math.max(series.length - 1, 1)) * i;
            if (series.length <= 12 || i % Math.ceil(series.length / 12) === 0 || i === series.length - 1) {
              return <text key={i} x={x} y={245} textAnchor="middle" className="fill-[var(--text-secondary)] text-[9px]">{p.label}</text>;
            }
            return null;
          })}
        </svg>
      )}
    </ChartCard>
  );
}

function scheduleFor(loan: Loan) {
  // Lightweight schedule without importing computeMetrics to avoid loops
  const rows: Array<{ closingBalance: number; principal: number; interest: number }> = [];
  let opening = loan.principal;
  const monthlyRate = loan.annualRate / 100 / 12;
  const emi = loan.emi || calculateEmi(loan.principal, loan.annualRate, loan.tenureMonths);
  for (let month = 1; month <= loan.tenureMonths; month++) {
    const interest = opening * monthlyRate;
    const principal = month === loan.tenureMonths ? opening : emi - interest;
    const closing = opening - principal;
    rows.push({ closingBalance: Math.max(0, closing), principal, interest });
    opening = closing;
    if (opening <= 0.01) break;
  }
  return rows;
}

function downsample<T>(points: T[], target: number): T[] {
  if (points.length <= target) return points;
  const step = points.length / target;
  const result: T[] = [];
  for (let i = 0; i < target; i++) {
    result.push(points[Math.min(Math.floor(i * step), points.length - 1)]);
  }
  const last = points[points.length - 1];
  if (result[result.length - 1] !== last) result[result.length - 1] = last;
  return result;
}