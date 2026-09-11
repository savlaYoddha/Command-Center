// ─────────────────────────────────────────────────────────────
// LOAN ENGINE — pure calculation logic for the Loans module
// Everything here is deterministic: same inputs → same outputs.
// ─────────────────────────────────────────────────────────────

import { formatINR } from "@/utils/format";

export type InterestType = "reducing" | "fixed" | "simple";

export type LoanStatus = "active" | "closed" | "preclosed" | "overdue" | "archived";

export type PreclosureRule = {
  fromMonth: number;
  toMonth: number; // 999 = unlimited
  chargeType: "percentage" | "value";
  chargeValue: number;
  gstApplicable: boolean;
  notes?: string;
};

export type PartPaymentRule = {
  fromMonth: number;
  toMonth: number; // 999 = unlimited
  chargeType: "percentage" | "value";
  chargeValue: number;
  minPayment?: number;
  maxPayment?: number;
  frequency?: string;
  gstApplicable: boolean;
  notes?: string;
};

export type PaymentType = "EMI" | "Part Payment" | "Preclosure" | "Late Fee" | "Other";

export type PaymentRecord = {
  id: string;
  loanId: string;
  date: string; // YYYY-MM-DD
  type: PaymentType;
  amount: number;
  principal: number;
  interest: number;
  charges: number;
  reference?: string;
  notes?: string;
};

export type AmortizationRow = {
  month: number; // 1-based
  date: string; // scheduled EMI date
  openingBalance: number;
  emi: number;
  interest: number;
  principal: number;
  closingBalance: number;
  /** true when this row has been settled by an actual payment */
  paid: boolean;
};

// ── Loan master record (same model for UI entry and Excel import) ──
export type Loan = {
  id: string; // unique internal id
  loanId: string; // user-facing Loan_ID e.g. "CAR-001"
  name: string;
  type: "Vehicle" | "Personal" | "Home" | "Education" | "Other";
  lender: string;
  account: string;
  status: LoanStatus;
  principal: number; // original principal
  disbursementAmount: number;
  disbursementDate: string;
  firstEmiDate: string;
  interestType: InterestType;
  annualRate: number; // percent, e.g. 8.55
  tenureMonths: number;
  emi: number;
  emiDueDay: number; // day of month 1-31
  processingFee: number;
  documentationFee: number;
  insuranceFinanced: number;
  otherFinanced: number;
  preclosureRules: PreclosureRule[];
  partPaymentRules: PartPaymentRule[];
  payments: PaymentRecord[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type RuleCharge = { charge: number; gst: number; total: number };

export type PreclosureQuote = {
  outstanding: number;
  rule: PreclosureRule | null;
  charge: number;
  gst: number;
  otherCharges: number;
  totalRequired: number;
  remainingInterest: number;
  netBenefit: number;
};

export type PartPaymentQuote = {
  amount: number;
  rule: PartPaymentRule | null;
  penalty: number;
  gst: number;
  totalCashRequired: number;
  newOutstanding: number;
  interestSaved: number;
  reduceTenure: { totalInterest: number; remainingTenure: number; newEndDate: string; emi: number };
  reduceEmi: { totalInterest: number; newEmi: number; remainingTenure: number; endDate: string };
};

// ── Date helpers (local, no TZ surprises) ───────────────────
export function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/** Suggested EMI date for schedule month i (0-based) starting from firstEmiDate */
export function emiDateFor(firstEmiDate: string, monthIndex: number): string {
  const base = parseDate(firstEmiDate);
  if (!base) return "";
  return formatDate(addMonths(base, monthIndex));
}

export function monthsBetween(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  if (!a || !b) return 0;
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}

export function currentLoanMonth(loan: Pick<Loan, "disbursementDate" | "firstEmiDate">): number {
  const anchor = parseDate(loan.firstEmiDate || loan.disbursementDate);
  if (!anchor) return 1;
  const today = new Date();
  const diff = monthsBetween(formatDate(anchor), formatDate(today));
  return Math.min(Math.max(diff + 1, 1), 9999);
}

// ── EMI / amortization ──────────────────────────────────────
export function calculateEmi(principal: number, annualRate: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRate <= 0) return principal / tenureMonths;
  const monthlyRate = annualRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/** Reducing-balance amortization schedule */
export function buildSchedule(loan: Pick<Loan, "principal" | "annualRate" | "tenureMonths" | "emi" | "firstEmiDate" | "interestType" | "payments">): AmortizationRow[] {
  if (loan.interestType !== "reducing") {
    return buildFlatSchedule(loan);
  }
  const rows: AmortizationRow[] = [];
  let opening = loan.principal;
  const monthlyRate = loan.annualRate / 100 / 12;
  for (let month = 1; month <= loan.tenureMonths; month++) {
    const interest = opening * monthlyRate;
    const emi = month === loan.tenureMonths ? opening + interest : loan.emi;
    const principal = emi - interest;
    const closing = opening - principal;
    rows.push({
      month,
      date: emiDateFor(loan.firstEmiDate, month - 1),
      openingBalance: round2(opening),
      emi: round2(emi),
      interest: round2(interest),
      principal: round2(principal),
      closingBalance: round2(closing),
      paid: false,
    });
    opening = closing;
    if (opening <= 0.01) break;
  }
  return rows;
}

/** Flat (non-reducing) schedule: interest = principal × rate × tenure / 12, split evenly */
function buildFlatSchedule(loan: Pick<Loan, "principal" | "annualRate" | "tenureMonths" | "emi" | "firstEmiDate" | "interestType" | "payments">): AmortizationRow[] {
  const totalInterest = (loan.principal * loan.annualRate / 100 / 12) * loan.tenureMonths;
  const emi = loan.emi || round2((loan.principal + totalInterest) / loan.tenureMonths);
  const interestPortion = totalInterest / loan.tenureMonths;
  const principalPortion = loan.principal / loan.tenureMonths;
  const rows: AmortizationRow[] = [];
  let opening = loan.principal;
  for (let month = 1; month <= loan.tenureMonths; month++) {
    const closing = opening - principalPortion;
    rows.push({
      month,
      date: emiDateFor(loan.firstEmiDate, month - 1),
      openingBalance: round2(opening),
      emi: round2(emi),
      interest: round2(interestPortion),
      principal: round2(principalPortion),
      closingBalance: round2(closing),
      paid: false,
    });
    opening = closing;
  }
  return rows;
}

/** Mark schedule rows as paid based on actual EMI payments (chronological). Each EMI payment settles the next unpaid installment. */
export function applyPaymentsToSchedule(rows: AmortizationRow[], payments: PaymentRecord[]): AmortizationRow[] {
  const emiPayments = payments
    .filter((p) => p.type === "EMI")
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const result = rows.map((row) => ({ ...row }));
  let cursor = 0;
  for (const _payment of emiPayments) {
    while (cursor < result.length && result[cursor].paid) cursor++;
    if (cursor < result.length) {
      result[cursor].paid = true;
      cursor++;
    }
  }
  return result;
}

// ── Portfolio metrics ───────────────────────────────────────
export type LoanMetrics = {
  outstanding: number;
  principalRepaid: number;
  interestPaid: number;
  remainingInterest: number;
  totalInterest: number;
  totalRepayment: number;
  emisCompleted: number;
  emisRemaining: number;
  repaidPercent: number;
  completionDate: string;
  nextEmiDate: string;
  nextEmiAmount: number;
  currentMonthInterest: number;
  currentMonthPrincipal: number;
  totalChargesPaid: number;
  totalPartPaymentAmount: number;
  totalPreclosureCharges: number;
  estimatedPreclosure: number;
  schedule: AmortizationRow[];
};

export function computeMetrics(loan: Loan): LoanMetrics {
  const schedule = applyPaymentsToSchedule(buildSchedule(loan), loan.payments);
  const paidEmis = schedule.filter((row) => row.paid).length;
  const principalRepaidFromSchedule = schedule.filter((row) => row.paid).reduce((sum, row) => sum + row.principal, 0);
  const partPayments = loan.payments.filter((p) => p.type === "Part Payment");
  const preclosurePayments = loan.payments.filter((p) => p.type === "Preclosure");
  const partPaymentPrincipal = partPayments.reduce((sum, p) => sum + p.principal, 0);
  const principalRepaid = principalRepaidFromSchedule + partPaymentPrincipal;

  const interestPaidSchedule = schedule.filter((row) => row.paid).reduce((sum, row) => sum + row.interest, 0);
  const interestPaid = loan.payments
    .filter((p) => p.type === "EMI" || p.type === "Part Payment" || p.type === "Preclosure")
    .reduce((sum, p) => sum + p.interest, 0) || interestPaidSchedule;

  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const remainingInterest = Math.max(0, totalInterest - interestPaid);
  const totalRepayment = loan.principal + totalInterest;

  // Remaining principal = original − principal repaid
  const outstanding = Math.max(0, loan.principal - (principalRepaid + (preclosurePayments.reduce((sum, p) => sum + p.principal, 0))));

  const emisCompleted = paidEmis + partPayments.length;
  const emisRemaining = Math.max(0, loan.tenureMonths - emisCompleted);

  const firstUnpaid = schedule.find((row) => !row.paid);
  const nextEmiDate = firstUnpaid?.date ?? "";
  const nextEmiAmount = firstUnpaid?.emi ?? 0;

  const month = currentLoanMonth(loan);
  const currentRow = schedule[Math.min(Math.max(month - 1, 0), schedule.length - 1)];
  const currentMonthInterest = currentRow ? currentRow.interest : 0;
  const currentMonthPrincipal = currentRow ? currentRow.principal : 0;

  const totalChargesPaid = loan.payments.reduce((sum, p) => sum + p.charges, 0);
  const totalPartPaymentAmount = partPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPreclosureCharges = preclosurePayments.reduce((sum, p) => sum + p.charges, 0);
  const repaidPercent = loan.principal > 0 ? (principalRepaid / loan.principal) * 100 : 0;

  const completionDate = firstUnpaid ? formatDate(addMonths(parseDate(firstUnpaid.date) ?? new Date(), emisRemaining)) : "";

  // Preclosure estimate computed inline (avoids recursive computeMetrics → quotePreclosure → computeMetrics)
  const preclosureRule = findRule(loan.preclosureRules, month);
  const preclosureCharge = ruleCharge(preclosureRule, outstanding);
  const estimatedPreclosure = outstanding + preclosureCharge.charge + preclosureCharge.gst;

  return {
    outstanding: round2(outstanding),
    principalRepaid: round2(principalRepaid),
    interestPaid: round2(interestPaid),
    remainingInterest: round2(remainingInterest),
    totalInterest: round2(totalInterest),
    totalRepayment: round2(totalRepayment),
    emisCompleted,
    emisRemaining,
    repaidPercent: round2(repaidPercent),
    completionDate,
    nextEmiDate,
    nextEmiAmount: round2(nextEmiAmount),
    currentMonthInterest: round2(currentMonthInterest),
    currentMonthPrincipal: round2(currentMonthPrincipal),
    totalChargesPaid: round2(totalChargesPaid),
    totalPartPaymentAmount: round2(totalPartPaymentAmount),
    totalPreclosureCharges: round2(totalPreclosureCharges),
    estimatedPreclosure: round2(estimatedPreclosure),
    schedule,
  };
}

// ── Rules engine ────────────────────────────────────────────
export function findRule<T extends { fromMonth: number; toMonth: number }>(rules: T[], month: number): T | null {
  return rules.find((rule) => month >= rule.fromMonth && month <= rule.toMonth) ?? null;
}

export function ruleCharge(rule: PreclosureRule | PartPaymentRule | null, base: number): RuleCharge {
  if (!rule) return { charge: 0, gst: 0, total: 0 };
  const charge = rule.chargeType === "percentage" ? (base * rule.chargeValue) / 100 : Math.min(rule.chargeValue, base);
  const gst = rule.gstApplicable ? charge * 0.18 : 0;
  return { charge: round2(charge), gst: round2(gst), total: round2(charge + gst) };
}

// ── Preclosure quote ────────────────────────────────────────
export function quotePreclosure(loan: Loan, month: number): PreclosureQuote {
  const metrics = computeMetrics(loan);
  const outstanding = metrics.outstanding;
  const rule = findRule(loan.preclosureRules, month);
  const { charge, gst } = ruleCharge(rule, outstanding);
  const remainingInterest = metrics.remainingInterest;
  const totalRequired = outstanding + charge + gst;
  return {
    outstanding: round2(outstanding),
    rule,
    charge: round2(charge),
    gst: round2(gst),
    otherCharges: 0,
    totalRequired: round2(totalRequired),
    remainingInterest: round2(remainingInterest),
    netBenefit: round2(remainingInterest - charge - gst),
  };
}

// ── Part-payment quote ──────────────────────────────────────
export function quotePartPayment(loan: Loan, amount: number): PartPaymentQuote {
  const metrics = computeMetrics(loan);
  const effectiveAmount = Math.min(Math.max(amount, 0), metrics.outstanding);
  const month = currentLoanMonth(loan);
  const rule = findRule(loan.partPaymentRules, month);
  const { charge, gst } = ruleCharge(rule, effectiveAmount);
  const newOutstanding = metrics.outstanding - effectiveAmount;

  // Reduce tenure: keep EMI, recompute schedule on new outstanding
  const emi = loan.emi || calculateEmi(metrics.outstanding, loan.annualRate, metrics.emisRemaining);
  const tenureAfter = Math.max(1, Math.ceil(calculateTenure(newOutstanding, emi, loan.annualRate)));
  const interestAfterTenure = totalInterestFor(newOutstanding, loan.annualRate, tenureAfter);

  // Reduce EMI: keep tenure, recompute EMI
  const newEmi = calculateEmi(newOutstanding, loan.annualRate, Math.max(1, metrics.emisRemaining));
  const interestAfterEmi = totalInterestFor(newOutstanding, loan.annualRate, metrics.emisRemaining);

  const firstUnpaid = metrics.schedule.find((row) => !row.paid);
  const baseDate = firstUnpaid?.date ?? loan.firstEmiDate;

  return {
    amount: round2(effectiveAmount),
    rule,
    penalty: round2(charge),
    gst: round2(gst),
    totalCashRequired: round2(effectiveAmount + charge + gst),
    newOutstanding: round2(newOutstanding),
    interestSaved: round2(metrics.totalInterest - (interestAfterTenure + metrics.interestPaid)),
    reduceTenure: {
      totalInterest: round2(metrics.interestPaid + interestAfterTenure),
      remainingTenure: tenureAfter,
      newEndDate: formatDate(addMonths(parseDate(baseDate) ?? new Date(), tenureAfter - 1)),
      emi: round2(emi),
    },
    reduceEmi: {
      totalInterest: round2(metrics.interestPaid + interestAfterEmi),
      newEmi: round2(newEmi),
      remainingTenure: metrics.emisRemaining,
      endDate: formatDate(addMonths(parseDate(baseDate) ?? new Date(), Math.max(0, metrics.emisRemaining - 1))),
    },
  };
}

function totalInterestFor(principal: number, annualRate: number, tenureMonths: number): number {
  if (tenureMonths <= 0 || principal <= 0) return 0;
  if (annualRate <= 0) return 0;
  const emi = calculateEmi(principal, annualRate, tenureMonths);
  return emi * tenureMonths - principal;
}

function calculateTenure(principal: number, emi: number, annualRate: number): number {
  if (principal <= 0 || emi <= 0) return 0;
  if (annualRate <= 0) return principal / emi;
  const r = annualRate / 100 / 12;
  return Math.log(emi / (emi - principal * r)) / Math.log(1 + r);
}

// ── Balance-over-time series (for the full-width graph) ────
export type BalancePoint = { label: string; month: number; date: string; outstanding: number; principal: number; interest: number };

export function buildBalanceSeries(loan: Loan): BalancePoint[] {
  const metrics = computeMetrics(loan);
  return metrics.schedule.map((row) => ({
    label: row.date ? row.date.slice(0, 7) : `M${row.month}`,
    month: row.month,
    date: row.date,
    outstanding: row.closingBalance,
    principal: row.principal,
    interest: row.interest,
  }));
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export const inr = (value: number) => formatINR(value);