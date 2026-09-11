// ─────────────────────────────────────────────────────────────
// LOAN CARDS GRID — filterable / sortable portfolio cards
// Each card shows full repayment state via computeMetrics().
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { CalendarDays, Car, GraduationCap, Home, Landmark, Percent, Plus, ReceiptText, Trash2, Wallet, type LucideIcon } from "lucide-react";
import { Card, HudButton, HudSelect, StatusBadge } from "@/components/ui";
import { computeMetrics, currentLoanMonth, inr, type Loan } from "./loanEngine";

const TYPE_ICONS: Record<Loan["type"], LucideIcon> = {
  Vehicle: Car,
  Personal: Wallet,
  Home: Home,
  Education: GraduationCap,
  Other: Landmark,
};

const STATUS_TONE: Record<Loan["status"], "success" | "warning" | "error" | "neutral" | "info"> = {
  active: "success",
  overdue: "error",
  preclosed: "info",
  closed: "neutral",
  archived: "neutral",
};

type SortKey = "outstanding" | "emi" | "rate" | "remainingTenure" | "nextEmi" | "completion";

export function LoansGrid({
  loans,
  onView,
  onEdit,
  onPartPayment,
  onPreclose,
  onArchive,
  onAdd,
  onImport,
  onExport,
  onDownloadTemplate,
}: {
  loans: Loan[];
  onView: (loan: Loan) => void;
  onEdit: (loan: Loan) => void;
  onPartPayment: (loan: Loan) => void;
  onPreclose: (loan: Loan) => void;
  onArchive: (loan: Loan) => void;
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | Loan["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | Loan["type"]>("all");
  const [sortKey, setSortKey] = useState<SortKey>("outstanding");

  const metricsByLoan = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeMetrics>>();
    for (const loan of loans) map.set(loan.id, computeMetrics(loan));
    return map;
  }, [loans]);

  const visible = useMemo(() => {
    const filtered = loans.filter((loan) => {
      if (statusFilter !== "all" && loan.status !== statusFilter) return false;
      if (typeFilter !== "all" && loan.type !== typeFilter) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      const ma = metricsByLoan.get(a.id)!;
      const mb = metricsByLoan.get(b.id)!;
      switch (sortKey) {
        case "outstanding": return mb.outstanding - ma.outstanding;
        case "emi": return mb.nextEmiAmount - ma.nextEmiAmount;
        case "rate": return b.annualRate - a.annualRate;
        case "remainingTenure": return ma.emisRemaining - mb.emisRemaining;
        case "nextEmi": return (ma.nextEmiDate || "9999").localeCompare(mb.nextEmiDate || "9999");
        case "completion": return (ma.completionDate || "9999").localeCompare(mb.completionDate || "9999");
        default: return 0;
      }
    });
    return sorted;
  }, [loans, metricsByLoan, sortKey, statusFilter, typeFilter]);

  const totalOutstanding = visible.reduce((sum, loan) => sum + (metricsByLoan.get(loan.id)?.outstanding ?? 0), 0);
  const totalMonthlyEmi = visible.reduce((sum, loan) => sum + (metricsByLoan.get(loan.id)?.nextEmiAmount ?? 0), 0);

  if (loans.length === 0) {
    return (
      <div className="space-y-5">
        <Toolbar onAdd={onAdd} onImport={onImport} onExport={onExport} onDownloadTemplate={onDownloadTemplate} loansLength={loans.length} />
        <div className="rounded-lg border border-[color:var(--border)] px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-[color:var(--accent)]"><Landmark size={22} /></div>
          <h3 className="font-display text-sm tracking-[0.16em] uppercase">No loans yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">Add a loan through the form or import the Excel template to see your amortization schedule, preclosure and part-payment calculators, and the full portfolio graph.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <HudButton onClick={onAdd}><Plus size={15} /> Add first loan</HudButton>
            <HudButton variant="ghost" onClick={onImport}>Import Excel</HudButton>
            <HudButton variant="ghost" onClick={onDownloadTemplate}>Download template</HudButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Toolbar onAdd={onAdd} onImport={onImport} onExport={onExport} onDownloadTemplate={onDownloadTemplate} loansLength={loans.length} />

      {/* Summary strip */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Total outstanding"><div className="font-display text-xl text-[color:var(--danger)]">{inr(totalOutstanding)}</div></Card>
        <Card title="Monthly EMI commitment"><div className="font-display text-xl text-[color:var(--accent)]">{inr(totalMonthlyEmi)}</div></Card>
        <Card title="Loans in view"><div className="font-display text-xl text-[color:var(--success)]">{visible.length}</div></Card>
      </div>

      {/* Filters & sort */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[color:var(--border)] p-3">
        <HudSelect label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="preclosed">Preclosed</option>
          <option value="closed">Closed</option>
        </HudSelect>
        <HudSelect label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
          <option value="all">All types</option>
          <option value="Vehicle">Vehicle</option>
          <option value="Personal">Personal</option>
          <option value="Home">Home</option>
          <option value="Education">Education</option>
          <option value="Other">Other</option>
        </HudSelect>
        <HudSelect label="Sort by" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="outstanding">Highest outstanding</option>
          <option value="emi">Highest EMI</option>
          <option value="rate">Highest interest rate</option>
          <option value="remainingTenure">Shortest remaining tenure</option>
          <option value="nextEmi">Soonest next EMI</option>
          <option value="completion">Earliest completion</option>
        </HudSelect>
        <div className="ml-auto pb-1 text-xs text-text-muted">{visible.length} of {loans.length} loans</div>
      </div>

      {/* Cards grid — starts from second row (graph is the first panel) */}
      {visible.length === 0 ? (
        <div className="rounded-lg border border-[color:var(--border)] px-6 py-12 text-center text-sm text-text-muted">No loans match the current filters.</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {visible.map((loan) => {
            const metrics = metricsByLoan.get(loan.id)!;
            const Icon = TYPE_ICONS[loan.type];
            const month = currentLoanMonth(loan);
            const repaidPct = loan.principal > 0 ? Math.min((metrics.principalRepaid / loan.principal) * 100, 100) : 0;
            const principalBreadth = loan.principal > 0 ? (metrics.principalRepaid / loan.principal) * 100 : 0;
            const interestBreadth = loan.principal > 0 ? Math.min((metrics.interestPaid / loan.principal) * 100, 100 - principalBreadth) : 0;
            return (
              <Card
                key={loan.id}
                title={`${loan.loanId} · ${loan.name}`}
                description={`${loan.type} · ${loan.lender}${loan.account ? ` · ${loan.account}` : ""}`}
                icon={Icon}
                className="flex flex-col"
                footer={
                  <div className="flex flex-wrap gap-1.5">
                    <HudButton variant="ghost" onClick={() => onView(loan)}>View</HudButton>
                    <HudButton variant="ghost" onClick={() => onEdit(loan)}>Edit</HudButton>
                    <HudButton variant="ghost" className="text-[color:var(--danger)]" onClick={() => onArchive(loan)}><Trash2 size={13} className="mr-1" />Delete</HudButton>
                    <HudButton variant="ghost" onClick={() => onPartPayment(loan)}>Part payment</HudButton>
                    {loan.status === "active" || loan.status === "overdue" ? <HudButton variant="ghost" onClick={() => onPreclose(loan)}>Preclose</HudButton> : null}
                  </div>
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={STATUS_TONE[loan.status]} label={loan.status} />
                  <span className="text-xs text-text-muted">{loan.interestType} · {loan.annualRate}% p.a.</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-4">
                  <Metric label="Loan amount" value={inr(loan.principal)} accent />
                  <Metric label="Outstanding" value={inr(metrics.outstanding)} danger />
                  <Metric label="Monthly EMI" value={inr(loan.emi)} />
                  <Metric label="Interest rate" value={`${loan.annualRate}%`} />
                  <Metric label="Tenure" value={`${loan.tenureMonths} mo`} />
                  <Metric label="Remaining" value={`${metrics.emisRemaining} mo`} />
                  <Metric label="Principal paid" value={inr(metrics.principalRepaid)} success />
                  <Metric label="Interest paid" value={inr(metrics.interestPaid)} />
                </div>

                {/* repayment progress bar */}
                <div className="mt-4 border-t border-[color:var(--border)] pt-3">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Principal repaid {Math.round(repaidPct)}%</span>
                    <span>{metrics.emisCompleted} of {loan.tenureMonths} EMIs done</span>
                  </div>
                  <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded bg-[color:var(--bg-secondary)]">
                    <div className="h-full" style={{ width: `${principalBreadth}%`, backgroundColor: "var(--success)" }} title="Principal repaid" />
                    <div className="h-full" style={{ width: `${interestBreadth}%`, backgroundColor: "var(--warning)" }} title="Interest paid" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                  <div className="flex items-center gap-1.5 text-text-secondary"><CalendarDays size={13} className="text-text-muted" /> Next EMI {metrics.nextEmiDate || "—"}</div>
                  <div className="flex items-center gap-1.5 text-text-secondary"><ReceiptText size={13} className="text-text-muted" /> {inr(metrics.nextEmiAmount)}</div>
                  <div className="flex items-center gap-1.5 text-text-secondary"><Percent size={13} className="text-text-muted" /> Est. preclose {inr(metrics.estimatedPreclosure)}</div>
                  <div className="text-xs text-text-muted">Remaining interest {inr(metrics.remainingInterest)}</div>
                  <div className="text-xs text-text-muted">Expected completion {metrics.completionDate || "—"}</div>
                  <div className="text-xs text-text-muted">Month {month} of {loan.tenureMonths}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent, danger, success }: { label: string; value: string; accent?: boolean; danger?: boolean; success?: boolean }) {
  const colorClass = accent ? "text-[color:var(--accent)]" : danger ? "text-[color:var(--danger)]" : success ? "text-[color:var(--success)]" : "";
  return (
    <div>
      <div className="text-[10px] tracking-[0.14em] text-text-muted uppercase">{label}</div>
      <div className={`mt-0.5 font-display tracking-[0.06em] ${colorClass}`}>{value}</div>
    </div>
  );
}

function Toolbar({ onAdd, onImport, onExport, onDownloadTemplate, loansLength }: { onAdd: () => void; onImport: () => void; onExport: () => void; onDownloadTemplate: () => void; loansLength: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-display text-sm tracking-[0.16em] uppercase">Loans</h2>
        <p className="mt-1 text-sm text-text-secondary">Amortization is computed automatically for every loan — UI and Excel import share one engine.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <HudButton onClick={onAdd}><Plus size={15} /> Add loan</HudButton>
        <HudButton variant="ghost" onClick={onImport}>Import Excel</HudButton>
        <HudButton variant="ghost" onClick={onExport} disabled={loansLength === 0}>Export Excel</HudButton>
        <HudButton variant="ghost" onClick={onDownloadTemplate}>Download template</HudButton>
      </div>
    </div>
  );
}