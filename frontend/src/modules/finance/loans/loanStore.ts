// ─────────────────────────────────────────────────────────────
// LOAN STORE — single source of truth for loans (UI + Excel)
// Persists to localStorage so edits survive reloads.
// ─────────────────────────────────────────────────────────────
import { create } from "zustand";
import { calculateEmi, emiDateFor, type Loan, type PaymentRecord } from "./loanEngine";

const STORAGE_KEY = "commandcenter.finance.loans.v1";

// ── Seed: the two validation examples from the spec ─────────
function seedLoans(): Loan[] {
  const commonRules = {
    preclosure: [
      { fromMonth: 1, toMonth: 12, chargeType: "percentage" as const, chargeValue: 3, gstApplicable: false, notes: "Spec example" },
      { fromMonth: 13, toMonth: 24, chargeType: "percentage" as const, chargeValue: 2, gstApplicable: false, notes: "Spec example" },
      { fromMonth: 25, toMonth: 999, chargeType: "percentage" as const, chargeValue: 0, gstApplicable: false, notes: "Spec example" },
    ],
    partPayment: [
      { fromMonth: 1, toMonth: 24, chargeType: "percentage" as const, chargeValue: 3, gstApplicable: false, notes: "Spec example" },
      { fromMonth: 25, toMonth: 999, chargeType: "percentage" as const, chargeValue: 0, gstApplicable: false, notes: "Spec example" },
    ],
  };
  const car1Emi = round(calculateEmi(10_00_000, 8.55, 60));
  const car2Emi = round(calculateEmi(10_00_000, 8.75, 72));
  return [
    {
      id: "loan-car-001",
      loanId: "CAR-001",
      name: "City Car Loan",
      type: "Vehicle",
      lender: "HDFC Bank",
      account: "CAR-ACC-8841",
      status: "active",
      principal: 10_00_000,
      disbursementAmount: 10_00_000,
      disbursementDate: "2024-06-15",
      firstEmiDate: "2024-07-15",
      interestType: "reducing",
      annualRate: 8.55,
      tenureMonths: 60,
      emi: car1Emi,
      emiDueDay: 15,
      processingFee: 10000,
      documentationFee: 2000,
      insuranceFinanced: 0,
      otherFinanced: 0,
      preclosureRules: commonRules.preclosure,
      partPaymentRules: commonRules.partPayment,
      payments: [],
      notes: "Validation example — 8.55% reducing, 60 months.",
      createdAt: "2024-06-10",
      updatedAt: "2024-06-10",
    },
    {
      id: "loan-car-002",
      loanId: "CAR-002",
      name: "SUV Loan",
      type: "Vehicle",
      lender: "ICICI Bank",
      account: "CAR-ACC-9032",
      status: "active",
      principal: 10_00_000,
      disbursementAmount: 10_00_000,
      disbursementDate: "2024-08-01",
      firstEmiDate: "2024-09-01",
      interestType: "reducing",
      annualRate: 8.75,
      tenureMonths: 72,
      emi: car2Emi,
      emiDueDay: 1,
      processingFee: 12000,
      documentationFee: 2500,
      insuranceFinanced: 0,
      otherFinanced: 0,
      preclosureRules: commonRules.preclosure,
      partPaymentRules: commonRules.partPayment,
      payments: [],
      notes: "Validation example — 8.75% reducing, 72 months.",
      createdAt: "2024-07-20",
      updatedAt: "2024-07-20",
    },
  ];
}

function loadInitial(): Loan[] {
  if (typeof window === "undefined") return seedLoans();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Loan[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fall through to seed
  }
  return seedLoans();
}

type LoanState = {
  loans: Loan[];
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string, patch: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  archiveLoan: (id: string) => void;
  unarchiveLoan: (id: string) => void;
  addPayment: (loanId: string, payment: PaymentRecord) => void;
  hydrate: () => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist(loans: Loan[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
    } catch {
      // storage full / private mode — ignore
    }
  }, 150);
}

export const useLoanStore = create<LoanState>((set, get) => ({
  loans: loadInitial(),
  addLoan: (loan) => {
    const next = [...get().loans, loan];
    set({ loans: next });
    persist(next);
  },
  updateLoan: (id, patch) => {
    const next = get().loans.map((loan) => {
      if (loan.id !== id) return loan;
      const merged = { ...loan, ...patch, updatedAt: new Date().toISOString().slice(0, 10) };
      // Always recompute EMI unless explicitly overridden
      if (patch.annualRate !== undefined || patch.principal !== undefined || patch.tenureMonths !== undefined) {
        if (merged.interestType === "reducing" && merged.principal > 0 && merged.tenureMonths > 0 && merged.annualRate > 0) {
          merged.emi = round(calculateEmi(merged.principal, merged.annualRate, merged.tenureMonths));
        }
      }
      return merged;
    });
    set({ loans: next });
    persist(next);
  },
  deleteLoan: (id) => {
    const next = get().loans.filter((loan) => loan.id !== id);
    set({ loans: next });
    persist(next);
  },
  archiveLoan: (id) => {
    const next = get().loans.map((loan) =>
      loan.id === id ? { ...loan, status: "archived" as const, updatedAt: new Date().toISOString().slice(0, 10) } : loan,
    );
    set({ loans: next });
    persist(next);
  },
  unarchiveLoan: (id) => {
    const next = get().loans.map((loan) =>
      loan.id === id ? { ...loan, status: "active" as const, updatedAt: new Date().toISOString().slice(0, 10) } : loan,
    );
    set({ loans: next });
    persist(next);
  },
  addPayment: (loanId, payment) => {
    const next = get().loans.map((loan) => {
      if (loan.id !== loanId) return loan;
      return { ...loan, payments: [...loan.payments, payment], updatedAt: new Date().toISOString().slice(0, 10) };
    });
    set({ loans: next });
    persist(next);
  },
  hydrate: () => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Loan[];
        if (Array.isArray(parsed)) set({ loans: parsed });
      } catch { /* ignore */ }
    }
  },
}));

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export { emiDateFor };