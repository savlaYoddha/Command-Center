// ─────────────────────────────────────────────────────────────
// EXCEL BRIDGE — template, import (validate → preview), export
// SheetJS (xlsx) based. Same Loan model as the UI form.
// ─────────────────────────────────────────────────────────────
import * as XLSX from "xlsx";
import { calculateEmi, computeMetrics, type InterestType, type Loan, type LoanStatus, type PartPaymentRule, type PaymentRecord, type PreclosureRule } from "./loanEngine";

// ── Column definitions ──────────────────────────────────────
export const LOAN_MASTER_COLUMNS = [
  "Loan_ID", "Loan_Name", "Loan_Type", "Lender", "Loan_Account", "Principal_Amount", "Disbursement_Amount",
  "Disbursement_Date", "First_EMI_Date", "Interest_Type", "Annual_Interest_Rate", "Tenure_Months", "EMI_Amount",
  "EMI_Due_Day", "Processing_Fee", "Documentation_Fee", "Insurance_Financed", "Other_Financed_Amount",
  "Loan_Status", "Notes",
] as const;

export const PRECLOSURE_COLUMNS = ["Loan_ID", "From_Month", "To_Month", "Charge_Type", "Charge_Value", "GST_Applicable", "Notes"] as const;
export const PART_PAYMENT_COLUMNS = ["Loan_ID", "From_Month", "To_Month", "Charge_Type", "Charge_Value", "Minimum_Payment", "Maximum_Payment", "Frequency", "GST_Applicable", "Notes"] as const;
export const PAYMENTS_COLUMNS = ["Payment_ID", "Loan_ID", "Payment_Date", "Payment_Type", "Amount", "Principal", "Interest", "Charges", "Reference", "Notes"] as const;
export const FEES_COLUMNS = ["Loan_ID", "Fee_Type", "Amount", "Percentage", "Applicable", "Notes"] as const;

const REQUIRED_MASTER = [
  "Loan_ID", "Loan_Name", "Loan_Type", "Lender", "Principal_Amount", "Disbursement_Date",
  "First_EMI_Date", "Interest_Type", "Annual_Interest_Rate", "Tenure_Months",
] as const;

const VALID_LOAN_TYPES = ["Vehicle", "Personal", "Home", "Education", "Other"];
const VALID_INTEREST_TYPES = ["reducing", "fixed", "simple"];
const VALID_STATUSES: LoanStatus[] = ["active", "closed", "preclosed", "overdue", "archived"];
const VALID_PAYMENT_TYPES = ["EMI", "Part Payment", "Preclosure", "Late Fee", "Other"];

export type ImportIssue = { loanId: string; sheet: string; row: number; level: "error" | "warning"; message: string };
export type ParsedLoan = {
  loan: Loan;
  issues: ImportIssue[];
  schedulePreview: Array<{ month: number; emi: number; interest: number; principal: number; balance: number }>;
};

// ── Template download ───────────────────────────────────────
export function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  const master: (string | number)[][] = [
    [...LOAN_MASTER_COLUMNS],
    ["CAR-001", "City Car Loan", "Vehicle", "HDFC Bank", "CAR-ACC-8841", 1000000, 1000000, "2024-06-15", "2024-07-15", "reducing", 8.55, 60, 20541, 15, 10000, 2000, 0, 0, "active", "Example row"],
  ];
  const wsMaster = XLSX.utils.aoa_to_sheet(master);
  XLSX.utils.book_append_sheet(wb, wsMaster, "Loan_Master");

  const preclosure: (string | number)[][] = [
    [...PRECLOSURE_COLUMNS],
    ["CAR-001", 1, 12, "percentage", 3, "No", "Example"],
    ["CAR-001", 13, 24, "percentage", 2, "No", ""],
    ["CAR-001", 25, 999, "percentage", 0, "No", ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(preclosure), "Preclosure_Rules");

  const partPayment: (string | number)[][] = [
    [...PART_PAYMENT_COLUMNS],
    ["CAR-001", 1, 24, "percentage", 3, 5000, 100000, "Once per month", "No", ""],
    ["CAR-001", 25, 999, "percentage", 0, 5000, 100000, "Once per month", "No", ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(partPayment), "PartPayment_Rules");

  const payments: (string | number)[][] = [[...PAYMENTS_COLUMNS], ["PAY-001", "CAR-001", "2024-08-15", "EMI", 20541, 13416, 7125, 0, "NEFT", "Example"]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payments), "Payments");

  const fees: (string | number)[][] = [[...FEES_COLUMNS], ["CAR-001", "Processing", 10000, "", "Yes", ""]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fees), "Fees");

  XLSX.writeFile(wb, "commandcenter-loan-template.xlsx");
}

// ── Helpers ─────────────────────────────────────────────────
function cell(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toLowerCase()];
}

function asNum(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const cleaned = value.replace(/[₹,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const text = asString(value).toLowerCase();
  return text === "yes" || text === "true" || text === "y" || text === "1";
}

// ── Import ──────────────────────────────────────────────────
export function parseLoanWorkbook(file: File): Promise<{ loans: ParsedLoan[]; issues: ImportIssue[]; hasFatal: boolean }> {
  return file.arrayBuffer().then((buffer) => {
    const wb = XLSX.read(buffer, { type: "array", cellDates: false });
    const issues: ImportIssue[] = [];
    const masters = sheetToRows(wb, "Loan_Master");
    const preclosureRows = sheetToRows(wb, "Preclosure_Rules");
    const partPaymentRows = sheetToRows(wb, "PartPayment_Rules");
    const paymentsRows = sheetToRows(wb, "Payments");

    if (masters.length === 0) {
      issues.push({ loanId: "-", sheet: "Loan_Master", row: 1, level: "error", message: "Loan_Master sheet is empty or missing." });
      return { loans: [], issues, hasFatal: true };
    }

    // Validate Loan_ID references in rule sheets
    const ids = new Set(masters.map((m) => asString(cell(m, "Loan_ID"))));
    const dupes = new Set<string>();
    const seen = new Set<string>();
    for (const row of masters) {
      const id = asString(cell(row, "Loan_ID"));
      if (seen.has(id)) dupes.add(id);
      seen.add(id);
    }
    for (const id of dupes) issues.push({ loanId: id, sheet: "Loan_Master", row: 0, level: "error", message: `Duplicate Loan_ID: ${id}` });

    const parsed: ParsedLoan[] = [];

    for (const [index, row] of masters.entries()) {
      const loanId = asString(cell(row, "Loan_ID"));
      if (!loanId) continue;
      const loanIssues: ImportIssue[] = [];
      const fail = (message: string, sheet = "Loan_Master") => loanIssues.push({ loanId, sheet, row: index + 2, level: "error", message });

      // Required fields
      for (const key of REQUIRED_MASTER) {
        const value = cell(row, key);
        if (value === undefined || value === null || asString(value) === "") fail(`Missing required field: ${key}.`);
      }
      const name = asString(cell(row, "Loan_Name")) || loanId;
      const typeRaw = asString(cell(row, "Loan_Type"));
      const type = VALID_LOAN_TYPES.includes(typeRaw) ? (typeRaw as Loan["type"]) : "Other";
      if (!VALID_LOAN_TYPES.includes(typeRaw)) fail(`Invalid Loan_Type "${typeRaw}" — use ${VALID_LOAN_TYPES.join(" / ")}.`);

      const lender = asString(cell(row, "Lender"));
      const account = asString(cell(row, "Loan_Account"));
      const principal = asNum(cell(row, "Principal_Amount"));
      if (principal === null || principal <= 0) fail("Principal_Amount must be a positive number.");
      const disbursementDate = asString(cell(row, "Disbursement_Date"));
      if (!isValidDate(disbursementDate)) fail(`Invalid Disbursement_Date "${disbursementDate}" — use YYYY-MM-DD.`);
      const firstEmiDate = asString(cell(row, "First_EMI_Date"));
      if (!isValidDate(firstEmiDate)) fail(`Invalid First_EMI_Date "${firstEmiDate}" — use YYYY-MM-DD.`);
      const interestTypeRaw = asString(cell(row, "Interest_Type")).toLowerCase();
      const interestType = VALID_INTEREST_TYPES.includes(interestTypeRaw) ? (interestTypeRaw as InterestType) : "reducing";
      if (!VALID_INTEREST_TYPES.includes(interestTypeRaw)) fail(`Invalid Interest_Type "${interestTypeRaw}" — use reducing / fixed / simple.`);

      const rate = asNum(cell(row, "Annual_Interest_Rate"));
      if (rate === null || rate < 0 || rate > 100) fail("Annual_Interest_Rate must be between 0 and 100.");
      const tenure = asNum(cell(row, "Tenure_Months"));
      if (tenure === null || tenure <= 0 || !Number.isInteger(tenure)) fail("Tenure_Months must be a positive whole number.");

      const calcEmi = calculateEmi(principal ?? 0, rate ?? 0, tenure ?? 0);
      const suppliedEmi = asNum(cell(row, "EMI_Amount"));
      let emi = round2(calcEmi);
      if (suppliedEmi !== null && suppliedEmi !== undefined && suppliedEmi > 0) {
        if (Math.abs(suppliedEmi - calcEmi) > 1) {
          loanIssues.push({ loanId, sheet: "Loan_Master", row: index + 2, level: "warning", message: `Supplied EMI ${round2(suppliedEmi)} differs from calculated ${round2(calcEmi)} — using calculated value.` });
        }
        emi = round2(calcEmi);
      }

      const statusRaw = asString(cell(row, "Loan_Status")).toLowerCase() || "active";
      const status: LoanStatus = VALID_STATUSES.includes(statusRaw as LoanStatus) ? (statusRaw as LoanStatus) : "active";
      if (!VALID_STATUSES.includes(statusRaw as LoanStatus)) fail(`Invalid Loan_Status "${statusRaw}" — use ${VALID_STATUSES.join(" / ")}.`);

      const emiDueDay = asNum(cell(row, "EMI_Due_Day"));
      const dueDay = emiDueDay !== null && emiDueDay >= 1 && emiDueDay <= 31 ? emiDueDay : 1;

      const preclosureRules: PreclosureRule[] = [];
      const partPaymentRules: PartPaymentRule[] = [];
      const payments: PaymentRecord[] = [];

      // Validations for rule ranges
      const clampFail = (sheet: string, msg: string) => loanIssues.push({ loanId, sheet, row: index + 2, level: "error", message: msg });

      for (const [idx, pRow] of preclosureRows.entries()) {
        if (asString(cell(pRow, "Loan_ID")) !== loanId) continue;
        const from = asNum(cell(pRow, "From_Month"));
        const to = asNum(cell(pRow, "To_Month"));
        const chargeTypeRaw = asString(cell(pRow, "Charge_Type")).toLowerCase();
        const chargeType = chargeTypeRaw === "value" ? "value" : "percentage";
        const chargeValue = asNum(cell(pRow, "Charge_Value")) ?? 0;
        const gst = asBool(cell(pRow, "GST_Applicable"));
        const notes = asString(cell(pRow, "Notes"));
        if (from === null || to === null || from < 1 || to < from) {
          clampFail("Preclosure_Rules", `Invalid range From=${from} To=${to} on row ${idx + 2}.`);
          continue;
        }
        if (chargeValue < 0) {
          clampFail("Preclosure_Rules", `Negative Charge_Value on row ${idx + 2}.`);
          continue;
        }
        preclosureRules.push({ fromMonth: from, toMonth: to, chargeType, chargeValue, gstApplicable: gst, notes });
      }
      // Only overlap warnings for same-type ranges
      for (let i = 0; i < preclosureRules.length; i++) {
        for (let j = i + 1; j < preclosureRules.length; j++) {
          const a = preclosureRules[i];
          const b = preclosureRules[j];
          if (a.fromMonth <= b.toMonth && b.fromMonth <= a.toMonth) {
            loanIssues.push({ loanId, sheet: "Preclosure_Rules", row: index + 2, level: "warning", message: `Overlapping preclosure rules: ${a.fromMonth}-${a.toMonth} and ${b.fromMonth}-${b.toMonth}.` });
          }
        }
      }

      for (const [idx, pRow] of partPaymentRows.entries()) {
        if (asString(cell(pRow, "Loan_ID")) !== loanId) continue;
        const from = asNum(cell(pRow, "From_Month"));
        const to = asNum(cell(pRow, "To_Month"));
        const chargeTypeRaw = asString(cell(pRow, "Charge_Type")).toLowerCase();
        const chargeType = chargeTypeRaw === "value" ? "value" : "percentage";
        const chargeValue = asNum(cell(pRow, "Charge_Value")) ?? 0;
        const minPayment = asNum(cell(pRow, "Minimum_Payment")) ?? undefined;
        const maxPayment = asNum(cell(pRow, "Maximum_Payment")) ?? undefined;
        const frequency = asString(cell(pRow, "Frequency"));
        const gst = asBool(cell(pRow, "GST_Applicable"));
        const notes = asString(cell(pRow, "Notes"));
        if (from === null || to === null || from < 1 || to < from) {
          clampFail("PartPayment_Rules", `Invalid range From=${from} To=${to} on row ${idx + 2}.`);
          continue;
        }
        if (chargeValue < 0) {
          clampFail("PartPayment_Rules", `Negative Charge_Value on row ${idx + 2}.`);
          continue;
        }
        partPaymentRules.push({ fromMonth: from, toMonth: to, chargeType, chargeValue, minPayment: minPayment, maxPayment: maxPayment, frequency, gstApplicable: gst, notes });
      }
      for (let i = 0; i < partPaymentRules.length; i++) {
        for (let j = i + 1; j < partPaymentRules.length; j++) {
          const a = partPaymentRules[i];
          const b = partPaymentRules[j];
          if (a.fromMonth <= b.toMonth && b.fromMonth <= a.toMonth) {
            loanIssues.push({ loanId, sheet: "PartPayment_Rules", row: index + 2, level: "warning", message: `Overlapping part-payment rules: ${a.fromMonth}-${a.toMonth} and ${b.fromMonth}-${b.toMonth}.` });
          }
        }
      }

      for (const [idx, pRow] of paymentsRows.entries()) {
        if (asString(cell(pRow, "Loan_ID")) !== loanId) continue;
        const paymentId = asString(cell(pRow, "Payment_ID")) || `imp-${loanId}-${idx}`;
        const date = asString(cell(pRow, "Payment_Date"));
        if (!isValidDate(date)) {
          fail(`Invalid Payment_Date "${date}" (Payments row ${idx + 2}).`, "Payments");
          continue;
        }
        const typeRaw = asString(cell(pRow, "Payment_Type"));
        const type = VALID_PAYMENT_TYPES.includes(typeRaw) ? (typeRaw as PaymentRecord["type"]) : "EMI";
        if (!VALID_PAYMENT_TYPES.includes(typeRaw)) fail(`Invalid Payment_Type "${typeRaw}".`, "Payments");
        const amount = asNum(cell(pRow, "Amount")) ?? 0;
        const principal = asNum(cell(pRow, "Principal")) ?? 0;
        const interest = asNum(cell(pRow, "Interest")) ?? 0;
        const charges = asNum(cell(pRow, "Charges")) ?? 0;
        payments.push({
          id: paymentId,
          loanId,
          date,
          type,
          amount,
          principal,
          interest,
          charges,
          reference: asString(cell(pRow, "Reference")),
          notes: asString(cell(pRow, "Notes")),
        });
      }

      const now = new Date().toISOString().slice(0, 10);
      const hasErrors = loanIssues.some((i) => i.level === "error");
      const loan: Loan = {
        id: `loan-${loanId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
        loanId,
        name,
        type,
        lender: lender || "Unknown",
        account,
        status,
        principal: principal ?? 0,
        disbursementAmount: asNum(cell(row, "Disbursement_Amount")) ?? principal ?? 0,
        disbursementDate,
        firstEmiDate,
        interestType,
        annualRate: rate ?? 0,
        tenureMonths: tenure ?? 0,
        emi,
        emiDueDay: dueDay,
        processingFee: asNum(cell(row, "Processing_Fee")) ?? 0,
        documentationFee: asNum(cell(row, "Documentation_Fee")) ?? 0,
        insuranceFinanced: asNum(cell(row, "Insurance_Financed")) ?? 0,
        otherFinanced: asNum(cell(row, "Other_Financed_Amount")) ?? 0,
        preclosureRules,
        partPaymentRules,
        payments,
        notes: asString(cell(row, "Notes")),
        createdAt: now,
        updatedAt: now,
      };

      const schedulePreview = buildSchedulePreview(loan);
      parsed.push({ loan: hasErrors ? loan : finalizeLoan(loan), issues: loanIssues, schedulePreview });
    }

    for (const p of parsed) issues.push(...p.issues);

    // Rule rows referencing unknown loans
    for (const [idx, pRow] of preclosureRows.entries()) {
      const id = asString(cell(pRow, "Loan_ID"));
      if (id && !ids.has(id)) issues.push({ loanId: id, sheet: "Preclosure_Rules", row: idx + 2, level: "error", message: `Preclosure rule references unknown Loan_ID: ${id}.` });
    }
    for (const [idx, pRow] of partPaymentRows.entries()) {
      const id = asString(cell(pRow, "Loan_ID"));
      if (id && !ids.has(id)) issues.push({ loanId: id, sheet: "PartPayment_Rules", row: idx + 2, level: "error", message: `Part-payment rule references unknown Loan_ID: ${id}.` });
    }
    for (const [idx, pRow] of paymentsRows.entries()) {
      const id = asString(cell(pRow, "Loan_ID"));
      if (id && !ids.has(id)) issues.push({ loanId: id, sheet: "Payments", row: idx + 2, level: "error", message: `Payment references unknown Loan_ID: ${id}.` });
    }

    const hasFatal = issues.some((i) => i.level === "error");
    return { loans: parsed, issues, hasFatal };
  });
}

function finalizeLoan(loan: Loan): Loan {
  return { ...loan };
}

function buildSchedulePreview(loan: Loan) {
  const rows: Array<{ month: number; emi: number; interest: number; principal: number; balance: number }> = [];
  let opening = loan.principal;
  const monthlyRate = loan.annualRate / 100 / 12;
  for (let month = 1; month <= Math.min(loan.tenureMonths, 60); month++) {
    const interest = opening * monthlyRate;
    const emi = month === loan.tenureMonths ? opening + interest : loan.emi;
    const principal = emi - interest;
    const closing = opening - principal;
    rows.push({ month, emi: round2(emi), interest: round2(interest), principal: round2(principal), balance: round2(closing) });
    opening = closing;
    if (opening <= 0.01) break;
  }
  return rows;
}

// ── Export ──────────────────────────────────────────────────
export function exportLoans(loans: Loan[]) {
  const wb = XLSX.utils.book_new();

  const master: (string | number)[][] = [[...LOAN_MASTER_COLUMNS], ...loans.map((loan) => [
    loan.loanId, loan.name, loan.type, loan.lender, loan.account, loan.principal, loan.disbursementAmount,
    loan.disbursementDate, loan.firstEmiDate, loan.interestType, loan.annualRate, loan.tenureMonths, loan.emi,
    loan.emiDueDay, loan.processingFee, loan.documentationFee, loan.insuranceFinanced, loan.otherFinanced,
    loan.status, loan.notes ?? "",
  ])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(master), "Loan_Master");

  const preclosure: unknown[][] = [[...PRECLOSURE_COLUMNS]];
  for (const loan of loans) {
    for (const rule of loan.preclosureRules) {
      preclosure.push([loan.loanId, rule.fromMonth, rule.toMonth, rule.chargeType, rule.chargeValue, rule.gstApplicable ? "Yes" : "No", rule.notes ?? ""]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(preclosure), "Preclosure_Rules");

  const partPayment: unknown[][] = [[...PART_PAYMENT_COLUMNS]];
  for (const loan of loans) {
    for (const rule of loan.partPaymentRules) {
      partPayment.push([loan.loanId, rule.fromMonth, rule.toMonth, rule.chargeType, rule.chargeValue, rule.minPayment ?? "", rule.maxPayment ?? "", rule.frequency ?? "", rule.gstApplicable ? "Yes" : "No", rule.notes ?? ""]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(partPayment), "PartPayment_Rules");

  const payments: unknown[][] = [[...PAYMENTS_COLUMNS]];
  for (const loan of loans) {
    for (const p of loan.payments) {
      payments.push([p.id, loan.loanId, p.date, p.type, p.amount, p.principal, p.interest, p.charges, p.reference ?? "", p.notes ?? ""]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payments), "Payments");

  const fees: unknown[][] = [[...FEES_COLUMNS]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fees), "Fees");

  // Amortization
  const amort: unknown[][] = [["Loan_ID", "Month", "EMI_Date", "Opening_Balance", "EMI", "Interest", "Principal", "Closing_Balance"]];
  for (const loan of loans) {
    const { schedule } = computeMetrics(loan);
    for (const row of schedule) {
      amort.push([loan.loanId, row.month, row.date, row.openingBalance, row.emi, row.interest, row.principal, row.closingBalance]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(amort), "Amortization");

  XLSX.writeFile(wb, "commandcenter-loans-export.xlsx");
}

function isValidDate(value: string): boolean {
  if (!value) return false;
  const parts = value.split("-");
  if (parts.length !== 3) return false;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sheetToRows(wb: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  // Normalize keys: replace all-uppercase with title-ish keys map
  return json.map((row) => normalizeRow(row));
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.replace(/\s+/g, "_").trim();
    out[normalized] = value;
  }
  return out;
}