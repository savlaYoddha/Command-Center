// ─────────────────────────────────────────────────────────────
// LOAN DETAIL — schedule, payment history, calculators
// Preclosure & part-payment quotes come straight from the engine.
// ─────────────────────────────────────────────────────────────
import { useMemo, useRef, useState } from "react";
import { ArrowRightLeft, CalendarDays, Calculator, IndianRupee, LineChart as LineChartIcon, ReceiptText } from "lucide-react";
import { Card, CurrencyInput, DataTable, HudButton, HudDatePicker, HudDrawer, StatusBadge, type DataTableColumn } from "@/components/ui";
import { notify } from "@/store/toastStore";
import {
  computeMetrics, currentLoanMonth, formatDate, inr, quotePartPayment, quotePreclosure,
  type AmortizationRow, type Loan, type PaymentRecord,
} from "./loanEngine";

type PaymentsProps = {
  payments: PaymentRecord[];
  loan: Loan;
  onRecordPayment: (payment: PaymentRecord) => void;
};

export function LoanDetail({
  open,
  loan,
  initialTab = "schedule",
  onClose,
  onEdit,
  onRecordPayment,
  onPreclose,
}: {
  open: boolean;
  loan: Loan | null;
  initialTab?: "schedule" | "payments" | "preclose" | "partpay" | "analysis";
  onClose: () => void;
  onEdit: (loan: Loan) => void;
  onRecordPayment: (payment: PaymentRecord) => void;
  onPreclose: (loan: Loan) => void;
}) {
  const [tab, setTab] = useState<"schedule" | "payments" | "preclose" | "partpay" | "analysis">(initialTab);
  const [partAmount, setPartAmount] = useState("");
  const lastLoanIdRef = useRef<string | null>(null);

  // When a different loan is opened, reset to its requested start tab
  const currentId = loan?.id ?? null;
  if (currentId !== lastLoanIdRef.current) {
    lastLoanIdRef.current = currentId;
    setTab(initialTab);
  }

  const metrics = useMemo(() => (loan ? computeMetrics(loan) : null), [loan]);
  const month = loan ? currentLoanMonth(loan) : 0;
  const preclosure = useMemo(() => (loan ? quotePreclosure(loan, month) : null), [loan, month]);
  const partQuote = useMemo(() => {
    if (!loan) return null;
    const amount = Number(partAmount);
    return Number.isFinite(amount) && amount > 0 ? quotePartPayment(loan, amount) : null;
  }, [loan, partAmount]);

  // Keep parts mounted so tab state persists while drawer is open
  const content = loan && metrics ? (
    <div className="flex h-full flex-col">
      <Header loan={loan} metrics={metrics} onEdit={onEdit} onPreclose={onPreclose} onClose={onClose} />
      <TabsRow tab={tab} setTab={setTab} loan={loan} />

      <div className="cc-hud-scrollbar mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
        {tab === "schedule" ? <ScheduleTab loan={loan} metrics={metrics} /> : null}
        {tab === "payments" ? <PaymentsTab payments={loan.payments} loan={loan} onRecordPayment={onRecordPayment} /> : null}
        {tab === "preclose" && preclosure ? <PreclosureTab loan={loan} quote={preclosure} onPreclose={onPreclose} /> : null}
        {tab === "partpay" ? <PartPaymentTab loan={loan} amount={partAmount} setAmount={setPartAmount} quote={partQuote} onRecordPayment={onRecordPayment} /> : null}
        {tab === "analysis" ? <AnalysisTab loan={loan} metrics={metrics} /> : null}
      </div>
    </div>
  ) : null;

  return (
    <HudDrawer open={open} title={loan ? `${loan.loanId} · ${loan.name}` : "Loan"} onClose={onClose} wide>
      {content}
    </HudDrawer>
  );
}

// ── Header ──────────────────────────────────────────────────
function Header({ loan, metrics, onEdit, onPreclose, onClose }: { loan: Loan; metrics: ReturnType<typeof computeMetrics>; onEdit: (l: Loan) => void; onPreclose: (l: Loan) => void; onClose: () => void }) {
  return (
    <div className="border-b border-[color:var(--border)] pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm tracking-[0.16em] uppercase">{loan.name}</h2>
            <StatusBadge status={loan.status === "active" ? "success" : loan.status === "overdue" ? "error" : loan.status === "preclosed" ? "info" : "neutral"} label={loan.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {loan.loanId} · {loan.type} · {loan.lender}
            {loan.account ? ` · ${loan.account}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <HudButton variant="ghost" onClick={() => onEdit(loan)}>Edit details</HudButton>
          {loan.status === "active" || loan.status === "overdue" ? <HudButton onClick={() => onPreclose(loan)}>Preclose loan</HudButton> : null}
          <HudButton variant="ghost" onClick={onClose}>Close</HudButton>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <HeadMetric label="Outstanding" value={inr(metrics.outstanding)} tone="danger" />
        <HeadMetric label="Monthly EMI" value={inr(loan.emi)} />
        <HeadMetric label="Principal repaid" value={inr(metrics.principalRepaid)} tone="success" />
        <HeadMetric label="Interest rate" value={`${loan.annualRate}%`} />
      </div>
    </div>
  );
}

function HeadMetric({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  const color = tone === "danger" ? "text-[color:var(--danger)]" : tone === "success" ? "text-[color:var(--success)]" : "text-[color:var(--accent)]";
  return (
    <div>
      <div className="text-[10px] tracking-[0.14em] text-text-muted uppercase">{label}</div>
      <div className={`mt-1 font-display text-lg tracking-[0.06em] ${color}`}>{value}</div>
    </div>
  );
}

// ── Tabs ────────────────────────────────────────────────────
function TabsRow({ tab, setTab, loan }: { tab: string; setTab: (t: "schedule" | "payments" | "preclose" | "partpay" | "analysis") => void; loan: Loan }) {
  const items = [
    { id: "schedule" as const, label: "Amortization", icon: LineChartIcon },
    { id: "payments" as const, label: "Payments", icon: ReceiptText },
    { id: "preclose" as const, label: "Preclose", icon: ArrowRightLeft },
    { id: "partpay" as const, label: "Part payment", icon: Calculator },
    { id: "analysis" as const, label: "Analysis", icon: CalendarDays },
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-1 border-b border-[color:var(--border)] pb-0">
      {items.map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs transition-colors ${active ? "border-[color:var(--accent)] text-[color:var(--accent)]" : "border-transparent text-text-muted hover:text-text-primary"}`}
          >
            <Icon size={13} /> {item.label}
            {item.id === "payments" ? <span className="text-[9px] text-text-muted">({loan.payments.length})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// ── Amortization schedule tab ───────────────────────────────
function ScheduleTab({ loan, metrics }: { loan: Loan; metrics: ReturnType<typeof computeMetrics> }) {
  const columns: DataTableColumn<AmortizationRow>[] = [
    { id: "month", header: "Month", accessor: (row) => <span className={row.paid ? "text-text-muted" : "font-display text-[color:var(--accent)]"}>{row.month}</span>, sortValue: (row) => row.month },
    { id: "date", header: "EMI date", accessor: (row) => row.date, sortValue: (row) => row.date },
    { id: "opening", header: "Opening", accessor: (row) => inr(row.openingBalance), sortValue: (row) => row.openingBalance },
    { id: "emi", header: "EMI", accessor: (row) => inr(row.emi), sortValue: (row) => row.emi },
    { id: "interest", header: "Interest", accessor: (row) => <span className="text-text-secondary">{inr(row.interest)}</span>, sortValue: (row) => row.interest },
    { id: "principal", header: "Principal", accessor: (row) => <span className="text-[color:var(--success)]">{inr(row.principal)}</span>, sortValue: (row) => row.principal },
    { id: "closing", header: "Closing", accessor: (row) => <span className={row.paid ? "text-text-muted" : "font-display"}>{inr(row.closingBalance)}</span>, sortValue: (row) => row.closingBalance },
    { id: "status", header: "Status", accessor: (row) => (row.paid ? <span className="text-xs text-[color:var(--success)]">Paid</span> : <span className="text-xs text-text-muted">Scheduled</span>) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <SmallStat label="Total interest (full term)" value={inr(metrics.totalInterest)} />
        <SmallStat label="Interest paid so far" value={inr(metrics.interestPaid)} />
        <SmallStat label="Remaining interest" value={inr(metrics.remainingInterest)} />
        <SmallStat label="Remaining EMIs" value={`${metrics.emisRemaining} months`} />
      </div>
      <p className="text-xs text-text-secondary">
        The schedule follows {loan.interestType} balance interest at {loan.annualRate}% p.a. Rows are generated by the engine; actual <b>EMI payments</b> recorded in the Payments tab mark rows as Paid.
      </p>
      <DataTable columns={columns} data={metrics.schedule} rowKey={(row) => String(row.month)} searchable={false} sortable pagination pageSize={12} />
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] p-3">
      <div className="text-[10px] tracking-[0.14em] text-text-muted uppercase">{label}</div>
      <div className="mt-1 font-display text-sm tracking-[0.06em]">{value}</div>
    </div>
  );
}

// ── Payments tab ────────────────────────────────────────────
function PaymentsTab({ payments, loan, onRecordPayment }: PaymentsProps) {
  const columns: DataTableColumn<PaymentRecord>[] = [
    { id: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
    { id: "type", header: "Type", accessor: (row) => <TypeBadge type={row.type} />, sortValue: (row) => row.type },
    { id: "amount", header: "Amount", accessor: (row) => inr(row.amount), sortValue: (row) => row.amount },
    { id: "principal", header: "Principal", accessor: (row) => inr(row.principal), sortValue: (row) => row.principal },
    { id: "interest", header: "Interest", accessor: (row) => inr(row.interest), sortValue: (row) => row.interest },
    { id: "charges", header: "Charges", accessor: (row) => inr(row.charges), sortValue: (row) => row.charges },
    { id: "reference", header: "Reference", accessor: (row) => <span className="text-xs text-text-muted">{row.reference || row.notes || "—"}</span> },
  ];
  const [emiDate, setEmiDate] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const nextUnpaid = useMemo(() => computeMetrics(loan).schedule.find((row) => !row.paid), [loan]);
  const suggested = nextUnpaid ?? { date: "", emi: loan.emi };

  function recordEmi() {
    const amount = Number(emiAmount) || suggested.emi;
    const date = emiDate || suggested.date || formatDate(new Date());
    if (amount <= 0) {
      notify("warning", "INVALID AMOUNT", "Enter a positive EMI amount.");
      return;
    }
    onRecordPayment({
      id: `pay-${Date.now()}`,
      loanId: loan.id,
      date,
      type: "EMI",
      amount,
      principal: 0,
      interest: 0,
      charges: 0,
      reference: "Recorded from detail view",
    });
    setEmiAmount("");
    setEmiDate("");
    notify("success", "EMI RECORDED", "The schedule will mark the next unpaid installment as paid.");
  }

  function recordManual(type: "Other" | "Late Fee") {
    const amount = Number(emiAmount) || 0;
    if (amount <= 0) {
      notify("warning", "INVALID AMOUNT", "Enter a positive amount first.");
      return;
    }
    onRecordPayment({
      id: `pay-${Date.now()}`,
      loanId: loan.id,
      date: emiDate || formatDate(new Date()),
      type,
      amount,
      principal: 0,
      interest: 0,
      charges: amount,
      reference: `Recorded ${type} from detail view`,
    });
    setEmiAmount("");
    setEmiDate("");
    notify("success", `${type.toUpperCase()} RECORDED`, "Payment history updated.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[color:var(--border)] p-4">
        <div className="font-display text-[10px] tracking-[0.16em] text-text-muted uppercase">Record a payment</div>
        <p className="mt-1 text-xs text-text-secondary">
          Next unpaid installment: <b>{suggested.date || "—"}</b> — <b>{inr(suggested.emi)}</b> (suggested). EMI payments settle schedule rows chronologically; part payments and preclosure are handled on their own tabs.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <HudDatePicker label="Date" value={emiDate || null} onChange={(v) => setEmiDate(v ?? "")} />
          <CurrencyInput label="Amount" value={emiAmount} onChange={(e) => setEmiAmount(e.target.value)} placeholder={String(Math.round(suggested.emi))} />
          <div className="flex items-end gap-2">
            <HudButton onClick={recordEmi}>Record EMI</HudButton>
            <HudButton variant="ghost" onClick={() => recordManual("Other")}>Other</HudButton>
            <HudButton variant="ghost" onClick={() => recordManual("Late Fee")}>Late fee</HudButton>
          </div>
        </div>
      </div>
      {payments.length === 0 ? (
        <div className="rounded-lg border border-[color:var(--border)] px-6 py-10 text-center text-sm text-text-muted">No payments recorded yet — they live separately from the generated schedule.</div>
      ) : (
        <DataTable columns={columns} data={payments.slice().sort((a, b) => b.date.localeCompare(a.date))} rowKey={(row) => row.id} searchable sortable pagination pageSize={10} searchPlaceholder="Search payments…" searchFilter={(row, q) => `${row.type} ${row.reference ?? ""} ${row.notes ?? ""}`.toLowerCase().includes(q)} />
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: PaymentRecord["type"] }) {
  const color = type === "EMI" ? "var(--success)" : type === "Part Payment" ? "var(--info)" : type === "Preclosure" ? "var(--danger)" : "var(--text-muted)";
  return <span className="rounded px-1.5 py-0.5 text-[10px] uppercase" style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>{type}</span>;
}

// ── Preclosure tab ──────────────────────────────────────────
function PreclosureTab({ loan, quote, onPreclose }: { loan: Loan; quote: ReturnType<typeof quotePreclosure>; onPreclose: (l: Loan) => void }) {
  const activeLabel = quote.rule ? `${quote.rule.fromMonth === 1 && quote.rule.toMonth === 999 ? "Lifetime" : `Months ${quote.rule.fromMonth}–${quote.rule.toMonth === 999 ? "onwards" : quote.rule.toMonth}`} · ${quote.rule.chargeType === "percentage" ? `${quote.rule.chargeValue}%` : `₹${quote.rule.chargeValue}`}${quote.rule.gstApplicable ? " + GST" : ""}` : "No rule — 0%";
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[color:var(--border)] p-4">
        <div className="font-display text-[10px] tracking-[0.16em] text-text-muted uppercase">Preclosure quote — month {currentMonth(loan)}</div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <Row label="Outstanding principal" value={inr(quote.outstanding)} />
            <Row label="Applicable rule" value={activeLabel} />
            <Row label="Preclosure charge" value={inr(quote.charge)} />
            <Row label="GST on charge" value={inr(quote.gst)} />
            {quote.otherCharges > 0 ? <Row label="Other charges" value={inr(quote.otherCharges)} /> : null}
            <Row label="Remaining interest (forgone)" value={inr(quote.remainingInterest)} />
          </div>
          <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--accent)_8%,transparent)] p-4">
            <div className="text-[10px] tracking-[0.16em] text-text-muted uppercase">Total required to close</div>
            <div className="mt-1 font-display text-2xl tracking-[0.06em] text-[color:var(--accent)]">{inr(quote.totalRequired)}</div>
            <div className="mt-2 text-xs text-text-secondary">Net benefit vs paying full term: {inr(quote.netBenefit)} saved on interest, minus charge & GST.</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <HudButton variant="danger" onClick={() => onPreclose(loan)}>Confirm preclosure</HudButton>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {loan.preclosureRules.map((rule, i) => (
          <div key={i} className="rounded-lg border border-[color:var(--border)] p-3 text-sm">
            <div className="text-[10px] tracking-[0.14em] text-text-muted uppercase">Rule {i + 1}</div>
            <div className="mt-1">Months {rule.fromMonth}–{rule.toMonth === 999 ? "onwards" : rule.toMonth}</div>
            <div className="mt-0.5 text-[color:var(--accent)]">{rule.chargeType === "percentage" ? `${rule.chargeValue}%` : `₹${rule.chargeValue}`} of outstanding{rule.gstApplicable ? " + 18% GST" : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function currentMonth(loan: Loan) {
  return currentLoanMonth(loan);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-2">
      <span className="text-text-muted">{label}</span>
      <span className="font-display tracking-[0.06em]">{value}</span>
    </div>
  );
}

// ── Part-payment tab ────────────────────────────────────────
function PartPaymentTab({ loan, amount, setAmount, quote, onRecordPayment }: { loan: Loan; amount: string; setAmount: (v: string) => void; quote: ReturnType<typeof quotePartPayment> | null; onRecordPayment: (p: PaymentRecord) => void }) {
  const month = currentLoanMonth(loan);
  const metrics = useMemo(() => computeMetrics(loan), [loan]);
  const activeRule = quote?.rule;
  const activeLabel = activeRule ? `${activeRule.fromMonth === 1 && activeRule.toMonth === 999 ? "Lifetime" : `Months ${activeRule.fromMonth}–${activeRule.toMonth === 999 ? "onwards" : activeRule.toMonth}`} · ${activeRule.chargeType === "percentage" ? `${activeRule.chargeValue}%` : `₹${activeRule.chargeValue}`}${activeRule.gstApplicable ? " + GST" : ""}` : "No rule — 0%";

  function confirm() {
    if (!quote || quote.amount <= 0) {
      notify("warning", "ENTER AMOUNT", "Enter how much you want to prepay.");
      return;
    }
    onRecordPayment({
      id: `pay-${Date.now()}`,
      loanId: loan.id,
      date: formatDate(new Date()),
      type: "Part Payment",
      amount: quote.amount,
      principal: quote.amount,
      interest: 0,
      charges: quote.penalty + quote.gst,
      reference: "Part payment from calculator",
      notes: `Charge ${inr(quote.penalty)} + GST ${inr(quote.gst)}`,
    });
    setAmount("");
    notify("success", "PART PAYMENT RECORDED", "Outstanding reduced; schedule metrics updated.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[color:var(--border)] p-4">
        <div className="font-display text-[10px] tracking-[0.16em] text-text-muted uppercase">Part payment calculator</div>
        <p className="mt-1 text-xs text-text-secondary">Month {month} · Outstanding {inr(metrics.outstanding)} · Rule: {activeLabel}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <CurrencyInput label="Lump-sum amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100000" />
          <div className="flex items-end">
            <HudButton onClick={confirm} disabled={!quote || quote.amount <= 0}>Apply part payment</HudButton>
          </div>
          {quote ? (
            <>
              <SmallStat label="Penalty + GST" value={`${inr(quote.penalty)} + ${inr(quote.gst)}`} />
              <SmallStat label="New outstanding" value={inr(quote.newOutstanding)} />
            </>
          ) : null}
        </div>
        {quote ? (
          <div className="mt-4 text-xs text-text-secondary">Total cash required: <b>{inr(quote.totalCashRequired)}</b> · Interest saved vs schedule: <b className="text-[color:var(--success)]">{inr(quote.interestSaved)}</b> (combined principal + interest effect).</div>
        ) : null}
      </div>

      {quote ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Option A — Reduce tenure" description="Keep the same EMI and finish earlier">
            <div className="space-y-2 text-sm"><Row label="New remaining tenure" value={`${quote.reduceTenure.remainingTenure} months`} /><Row label="Total interest (paid + future)" value={inr(quote.reduceTenure.totalInterest)} /><Row label="Total interest saved" value={<span className="text-[color:var(--success)]">{inr(quote.interestSaved)}</span>} /><Row label="EMI unchanged" value={inr(quote.reduceTenure.emi)} /><Row label="Expected payoff" value={quote.reduceTenure.newEndDate} /></div>
          </Card>
          <Card title="Option B — Reduce EMI" description="Keep the tenure and lower the monthly payment">
            <div className="space-y-2 text-sm"><Row label="New EMI" value={inr(quote.reduceEmi.newEmi)} /><Row label="Remaining tenure" value={`${quote.reduceEmi.remainingTenure} months`} /><Row label="Total interest (paid + future)" value={inr(quote.reduceEmi.totalInterest)} /><Row label="Interest saved vs schedule" value={<span className="text-[color:var(--success)]">{inr(Math.max(0, metrics.remainingInterest - quote.reduceEmi.totalInterest + metrics.interestPaid))}</span>} /><Row label="Expected payoff" value={quote.reduceEmi.endDate} /></div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

// ── Analysis tab ────────────────────────────────────────────
function AnalysisTab({ loan, metrics }: { loan: Loan; metrics: ReturnType<typeof computeMetrics> }) {
  const breakdown = useMemo(() => {
    const total = loan.principal + metrics.totalInterest;
    return [
      { label: "Principal", value: loan.principal, color: "var(--accent)" },
      { label: "Total interest", value: metrics.totalInterest, color: "var(--warning)" },
      { label: "Charges/fees", value: loan.processingFee + loan.documentationFee + loan.insuranceFinanced + loan.otherFinanced, color: "var(--text-muted)" },
    ].map((item) => ({ ...item, pct: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [loan, metrics]);
  const interestProgress = metrics.totalInterest > 0 ? (metrics.interestPaid / metrics.totalInterest) * 100 : 0;
  const principalProgress = loan.principal > 0 ? (metrics.principalRepaid / loan.principal) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SmallStat label="Total cost of loan" value={inr(metrics.totalRepayment)} />
        <SmallStat label="Total interest" value={inr(metrics.totalInterest)} />
        <SmallStat label="Effective rate (approx)" value={`${loan.annualRate}% p.a.`} />
      </div>
      <Card title="Cost breakdown" description="Where each rupee of repayment goes">
        <div className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs text-text-muted"><span>{item.label}</span><span>{inr(item.value)} · {Math.round(item.pct)}%</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-[color:var(--bg-secondary)]"><div className="h-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} /></div>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Repayment progress" description={`${Math.round(principalProgress)}% of principal repaid`}>
          <div className="mt-1 h-3 w-full overflow-hidden rounded bg-[color:var(--bg-secondary)]"><div className="h-full bg-[color:var(--success)]" style={{ width: `${principalProgress}%` }} /></div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm"><div><div className="text-xs text-text-muted">Paid</div><div className="mt-0.5 text-[color:var(--success)]">{inr(metrics.principalRepaid)}</div></div><div><div className="text-xs text-text-muted">Outstanding</div><div className="mt-0.5 text-[color:var(--danger)]">{inr(metrics.outstanding)}</div></div></div>
        </Card>
        <Card title="Interest already paid" description={`${Math.round(interestProgress)}% of total interest consumed`}>
          <div className="mt-1 h-3 w-full overflow-hidden rounded bg-[color:var(--bg-secondary)]"><div className="h-full bg-[color:var(--warning)]" style={{ width: `${interestProgress}%` }} /></div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm"><div><div className="text-xs text-text-muted">Paid</div><div className="mt-0.5">{inr(metrics.interestPaid)}</div></div><div><div className="text-xs text-text-muted">Remaining</div><div className="mt-0.5">{inr(metrics.remainingInterest)}</div></div></div>
        </Card>
      </div>
      <div className="rounded-lg border border-[color:var(--border)] p-4 text-sm">
        <div className="flex items-center gap-2 text-text-muted"><IndianRupee size={14} /> Payment history is preserved independently of this generated analysis — editing the loan never rewrites recorded transactions.</div>
      </div>
    </div>
  );
}