// ─────────────────────────────────────────────────────────────
// LOAN FORM — Add / Edit loan; same model as Excel import.
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CheckboxControl, HudButton, HudDatePicker, HudInput, HudModal, HudSelect } from "@/components/ui";
import { notify } from "@/store/toastStore";
import { addMonths, calculateEmi, formatDate, type InterestType, type Loan, type LoanStatus, type PartPaymentRule, type PreclosureRule } from "./loanEngine";

export type LoanDraft = {
  loanId: string;
  name: string;
  type: Loan["type"];
  lender: string;
  account: string;
  status: LoanStatus;
  principal: string;
  disbursementAmount: string;
  disbursementDate: string;
  firstEmiDate: string;
  interestType: InterestType;
  annualRate: string;
  tenureMonths: string;
  emi: string; // optional — auto-calculated
  emiDueDay: string;
  processingFee: string;
  documentationFee: string;
  insuranceFinanced: string;
  otherFinanced: string;
  preclosureRules: PreclosureRule[];
  partPaymentRules: PartPaymentRule[];
  notes: string;
};

export function emptyDraft(): LoanDraft {
  const today = new Date();
  const firstEmi = formatDate(addMonths(today, 1));
  return {
    loanId: "",
    name: "",
    type: "Vehicle",
    lender: "",
    account: "",
    status: "active",
    principal: "",
    disbursementAmount: "",
    disbursementDate: formatDate(today),
    firstEmiDate: firstEmi,
    interestType: "reducing",
    annualRate: "",
    tenureMonths: "",
    emi: "",
    emiDueDay: "5",
    processingFee: "",
    documentationFee: "",
    insuranceFinanced: "",
    otherFinanced: "",
    preclosureRules: [
      { fromMonth: 1, toMonth: 12, chargeType: "percentage", chargeValue: 3, gstApplicable: false },
      { fromMonth: 13, toMonth: 24, chargeType: "percentage", chargeValue: 2, gstApplicable: false },
      { fromMonth: 25, toMonth: 999, chargeType: "percentage", chargeValue: 0, gstApplicable: false },
    ],
    partPaymentRules: [
      { fromMonth: 1, toMonth: 24, chargeType: "percentage", chargeValue: 3, gstApplicable: false },
      { fromMonth: 25, toMonth: 999, chargeType: "percentage", chargeValue: 0, gstApplicable: false },
    ],
    notes: "",
  };
}

export function draftFromLoan(loan: Loan): LoanDraft {
  return {
    loanId: loan.loanId,
    name: loan.name,
    type: loan.type,
    lender: loan.lender,
    account: loan.account,
    status: loan.status,
    principal: String(loan.principal),
    disbursementAmount: String(loan.disbursementAmount),
    disbursementDate: loan.disbursementDate,
    firstEmiDate: loan.firstEmiDate,
    interestType: loan.interestType,
    annualRate: String(loan.annualRate),
    tenureMonths: String(loan.tenureMonths),
    emi: loan.emi ? String(loan.emi) : "",
    emiDueDay: String(loan.emiDueDay),
    processingFee: String(loan.processingFee || ""),
    documentationFee: String(loan.documentationFee || ""),
    insuranceFinanced: String(loan.insuranceFinanced || ""),
    otherFinanced: String(loan.otherFinanced || ""),
    preclosureRules: loan.preclosureRules.map((r) => ({ ...r })),
    partPaymentRules: loan.partPaymentRules.map((r) => ({ ...r })),
    notes: loan.notes ?? "",
  };
}

const num = (value: string) => (value.trim() === "" ? 0 : Number(value));

export function validateDraft(draft: LoanDraft): string | null {
  if (!draft.loanId.trim()) return "Loan ID is required.";
  if (!draft.name.trim()) return "Loan name is required.";
  if (!draft.lender.trim()) return "Lender is required.";
  const principal = num(draft.principal);
  if (principal <= 0) return "Principal amount must be positive.";
  if (!draft.disbursementDate) return "Disbursement date is required.";
  if (!draft.firstEmiDate) return "First EMI date is required.";
  const rate = num(draft.annualRate);
  if (draft.interestType !== "simple" && (rate <= 0 || rate > 60)) return "Annual interest rate must be between 0 and 60.";
  const tenure = num(draft.tenureMonths);
  if (tenure <= 0) return "Tenure must be a positive number of months.";
  if (draft.emi && num(draft.emi) <= 0) return "EMI must be positive.";
  const dueDay = num(draft.emiDueDay);
  if (dueDay < 1 || dueDay > 31) return "EMI due day must be between 1 and 31.";
  for (const rule of draft.preclosureRules) {
    if (rule.fromMonth > rule.toMonth) return `Preclosure rule ${rule.fromMonth}-${rule.toMonth} has an invalid range.`;
    if (rule.chargeValue < 0) return "Preclosure charge values cannot be negative.";
  }
  for (const rule of draft.partPaymentRules) {
    if (rule.fromMonth > rule.toMonth) return `Part-payment rule ${rule.fromMonth}-${rule.toMonth} has an invalid range.`;
    if (rule.chargeValue < 0) return "Part-payment charge values cannot be negative.";
  }
  return null;
}

export function buildLoanFromDraft(draft: LoanDraft, existing: Loan | null): Loan {
  const principal = num(draft.principal);
  const rate = num(draft.annualRate);
  const tenure = Math.round(num(draft.tenureMonths));
  const calculatedEmi = draft.interestType === "reducing" && principal > 0 && tenure > 0 && rate > 0
    ? calculateEmi(principal, rate, tenure)
    : principal > 0 && tenure > 0
      ? principal / tenure
      : 0;
  const emi = draft.emi && num(draft.emi) > 0 ? num(draft.emi) : calculatedEmi;
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: existing?.id ?? `loan-${Date.now()}`,
    loanId: draft.loanId.trim(),
    name: draft.name.trim(),
    type: draft.type,
    lender: draft.lender.trim(),
    account: draft.account.trim(),
    status: draft.status,
    principal,
    disbursementAmount: num(draft.disbursementAmount) || principal,
    disbursementDate: draft.disbursementDate,
    firstEmiDate: draft.firstEmiDate,
    interestType: draft.interestType,
    annualRate: rate,
    tenureMonths: tenure,
    emi: Math.round(emi * 100) / 100,
    emiDueDay: Math.min(31, Math.max(1, num(draft.emiDueDay) || 1)),
    processingFee: num(draft.processingFee),
    documentationFee: num(draft.documentationFee),
    insuranceFinanced: num(draft.insuranceFinanced),
    otherFinanced: num(draft.otherFinanced),
    preclosureRules: draft.preclosureRules.map((r) => ({ ...r, notes: r.notes })),
    partPaymentRules: draft.partPaymentRules.map((r) => ({ ...r, notes: r.notes })),
    payments: existing?.payments ?? [],
    notes: draft.notes.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function LoanFormModal({
  open,
  editing,
  existing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: boolean;
  existing: Loan | null;
  onClose: () => void;
  onSave: (loan: Loan) => void;
}) {
  const [draft, setDraft] = useState<LoanDraft>(editing && existing ? draftFromLoan(existing) : emptyDraft());

  // reset when opening with different loan
  const [lastKey, setLastKey] = useState<string>("");
  const key = `${open}-${editing}-${existing?.id ?? "new"}`;
  if (key !== lastKey) {
    setLastKey(key);
    setDraft(editing && existing ? draftFromLoan(existing) : emptyDraft());
  }

  const set = (patch: Partial<LoanDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const rate = num(draft.annualRate);
  const principal = num(draft.principal);
  const tenure = num(draft.tenureMonths);
  const suggestedEmi = draft.interestType === "reducing" && principal > 0 && tenure > 0 && rate > 0 ? Math.round(calculateEmi(principal, rate, tenure)) : 0;

  function save() {
    const error = validateDraft(draft);
    if (error) {
      notify("warning", "CHECK THE FORM", error);
      return;
    }
    onSave(buildLoanFromDraft(draft, existing));
  }

  return (
    <HudModal open={open} title={editing ? `Edit loan — ${existing?.loanId}` : "Add loan"} size="lg" onClose={onClose}>
      <div className="cc-hud-scrollbar max-h-[65vh] space-y-6 overflow-y-auto pr-1">
        <section className="space-y-3">
          <h4 className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Basic information</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <HudInput label="Loan ID" value={draft.loanId} onChange={(e) => set({ loanId: e.target.value })} placeholder="e.g. CAR-001" />
            <HudInput label="Loan name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. City Car Loan" />
            <HudSelect label="Loan type" value={draft.type} onChange={(e) => set({ type: e.target.value as Loan["type"] })}>
              <option value="Vehicle">Vehicle</option><option value="Personal">Personal</option><option value="Home">Home</option>
              <option value="Education">Education</option><option value="Other">Other</option>
            </HudSelect>
            <HudInput label="Lender" value={draft.lender} onChange={(e) => set({ lender: e.target.value })} placeholder="e.g. HDFC Bank" />
            <HudInput label="Loan account / reference no." value={draft.account} onChange={(e) => set({ account: e.target.value })} placeholder="Optional account number" />
            <HudSelect label="Loan status" value={draft.status} onChange={(e) => set({ status: e.target.value as LoanStatus })}>
              <option value="active">Active</option><option value="overdue">Overdue</option>
              <option value="closed">Closed</option><option value="preclosed">Preclosed</option>
            </HudSelect>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Loan financial information</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <HudInput label="Original principal amount (₹)" type="number" value={draft.principal} onChange={(e) => set({ principal: e.target.value })} placeholder="1000000" />
            <HudInput label="Disbursement amount (₹)" type="number" value={draft.disbursementAmount} onChange={(e) => set({ disbursementAmount: e.target.value })} placeholder="Optional" />
            <HudDatePicker label="Disbursement date" value={draft.disbursementDate || null} onChange={(v) => set({ disbursementDate: v ?? "" })} />
            <HudDatePicker label="First EMI date" value={draft.firstEmiDate || null} onChange={(v) => set({ firstEmiDate: v ?? "" })} />
            <HudSelect label="Interest type" value={draft.interestType} onChange={(e) => set({ interestType: e.target.value as InterestType })}>
              <option value="reducing">Reducing balance</option><option value="fixed">Fixed</option><option value="simple">Simple</option>
            </HudSelect>
            <HudInput label="Annual interest rate (%)" type="number" value={draft.annualRate} onChange={(e) => set({ annualRate: e.target.value })} placeholder="8.55" />
            <div className="grid grid-cols-2 gap-3">
              <HudInput label="Tenure" type="number" value={draft.tenureMonths} onChange={(e) => set({ tenureMonths: e.target.value })} placeholder="60" />
              <HudInput label="Tenure unit" value="Months" disabled />
            </div>
            <HudInput label="EMI amount (₹) — auto if blank" type="number" value={draft.emi} onChange={(e) => set({ emi: e.target.value })} placeholder={suggestedEmi ? String(suggestedEmi) : "Auto"} />
            <HudInput label="EMI due day (1–31)" type="number" value={draft.emiDueDay} onChange={(e) => set({ emiDueDay: e.target.value })} />
          </div>
          {suggestedEmi > 0 ? (
            <p className="text-xs text-text-secondary">Suggested EMI from parameters: <span className="text-[color:var(--accent)]">₹{suggestedEmi.toLocaleString("en-IN")}</span></p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h4 className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Additional costs</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <HudInput label="Processing fee (₹)" type="number" value={draft.processingFee} onChange={(e) => set({ processingFee: e.target.value })} />
            <HudInput label="Documentation fee (₹)" type="number" value={draft.documentationFee} onChange={(e) => set({ documentationFee: e.target.value })} />
            <HudInput label="Insurance financed (₹)" type="number" value={draft.insuranceFinanced} onChange={(e) => set({ insuranceFinanced: e.target.value })} />
            <HudInput label="Other financed amount (₹)" type="number" value={draft.otherFinanced} onChange={(e) => set({ otherFinanced: e.target.value })} />
          </div>
        </section>

        <RulesEditor draft={draft} set={set} />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <HudButton variant="ghost" onClick={onClose}>Cancel</HudButton>
        <HudButton onClick={save}>{editing ? "Save changes" : "Add loan"}</HudButton>
      </div>
    </HudModal>
  );
}

function RulesEditor({ draft, set }: { draft: LoanDraft; set: (patch: Partial<LoanDraft>) => void }) {
  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Preclosure rules</h4>
          <HudButton variant="ghost" onClick={() => set({ preclosureRules: [...draft.preclosureRules, { fromMonth: draft.preclosureRules.length * 12 + 1, toMonth: 999, chargeType: "percentage", chargeValue: 0, gstApplicable: false }] })}><Plus size={13} /> Add rule</HudButton>
        </div>
        {draft.preclosureRules.map((rule, index) => (
          <div key={index} className="grid grid-cols-2 items-end gap-2 border border-[color:var(--border)] p-2 sm:grid-cols-5">
            <HudInput label="From" type="number" value={String(rule.fromMonth)} onChange={(e) => set({ preclosureRules: draft.preclosureRules.map((r, i) => i === index ? { ...r, fromMonth: Number(e.target.value) } : r) })} />
            <HudInput label="To" type="number" value={String(rule.toMonth)} onChange={(e) => set({ preclosureRules: draft.preclosureRules.map((r, i) => i === index ? { ...r, toMonth: Number(e.target.value) } : r) })} />
            <HudSelect label="Charge type" value={rule.chargeType} onChange={(e) => set({ preclosureRules: draft.preclosureRules.map((r, i) => i === index ? { ...r, chargeType: e.target.value as "percentage" | "value" } : r) })}>
              <option value="percentage">Percentage</option><option value="value">Fixed value</option>
            </HudSelect>
            <HudInput label="Charge value" type="number" value={String(rule.chargeValue)} onChange={(e) => set({ preclosureRules: draft.preclosureRules.map((r, i) => i === index ? { ...r, chargeValue: Number(e.target.value) } : r) })} />
            <div className="flex items-center justify-end gap-1">
              <label className="flex items-center gap-1 text-xs text-text-secondary">
                <CheckboxControl checked={rule.gstApplicable} aria-label="GST applicable" onChange={(checked) => set({ preclosureRules: draft.preclosureRules.map((r, i) => i === index ? { ...r, gstApplicable: checked } : r) })} /> GST
              </label>
              <HudButton variant="ghost" aria-label="Remove rule" onClick={() => set({ preclosureRules: draft.preclosureRules.filter((_, i) => i !== index) })}><Trash2 size={13} /></HudButton>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Part-payment rules</h4>
          <HudButton variant="ghost" onClick={() => set({ partPaymentRules: [...draft.partPaymentRules, { fromMonth: draft.partPaymentRules.length * 12 + 1, toMonth: 999, chargeType: "percentage", chargeValue: 0, gstApplicable: false }] })}><Plus size={13} /> Add rule</HudButton>
        </div>
        {draft.partPaymentRules.map((rule, index) => (
          <div key={index} className="grid grid-cols-2 items-end gap-2 border border-[color:var(--border)] p-2 sm:grid-cols-6">
            <HudInput label="From" type="number" value={String(rule.fromMonth)} onChange={(e) => set({ partPaymentRules: draft.partPaymentRules.map((r, i) => i === index ? { ...r, fromMonth: Number(e.target.value) } : r) })} />
            <HudInput label="To" type="number" value={String(rule.toMonth)} onChange={(e) => set({ partPaymentRules: draft.partPaymentRules.map((r, i) => i === index ? { ...r, toMonth: Number(e.target.value) } : r) })} />
            <HudSelect label="Charge type" value={rule.chargeType} onChange={(e) => set({ partPaymentRules: draft.partPaymentRules.map((r, i) => i === index ? { ...r, chargeType: e.target.value as "percentage" | "value" } : r) })}>
              <option value="percentage">Percentage</option><option value="value">Fixed value</option>
            </HudSelect>
            <HudInput label="Charge value" type="number" value={String(rule.chargeValue)} onChange={(e) => set({ partPaymentRules: draft.partPaymentRules.map((r, i) => i === index ? { ...r, chargeValue: Number(e.target.value) } : r) })} />
            <HudInput label="Min payment" type="number" value={rule.minPayment ? String(rule.minPayment) : ""} onChange={(e) => set({ partPaymentRules: draft.partPaymentRules.map((r, i) => i === index ? { ...r, minPayment: e.target.value ? Number(e.target.value) : undefined } : r) })} />
            <div className="flex items-center justify-end gap-1">
              <label className="flex items-center gap-1 text-xs text-text-secondary">
                <CheckboxControl checked={rule.gstApplicable} aria-label="GST applicable" onChange={(checked) => set({ partPaymentRules: draft.partPaymentRules.map((r, i) => i === index ? { ...r, gstApplicable: checked } : r) })} /> GST
              </label>
              <HudButton variant="ghost" aria-label="Remove rule" onClick={() => set({ partPaymentRules: draft.partPaymentRules.filter((_, i) => i !== index) })}><Trash2 size={13} /></HudButton>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}