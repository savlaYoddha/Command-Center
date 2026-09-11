import { useMemo, useRef, useState } from "react";
import { Archive, ArchiveRestore, BarChart3, Building2, ChevronDown, CreditCard, IndianRupee, Pencil, Plus, Smartphone, Trash2, WalletCards } from "lucide-react";
import {
  Card, ChartCard, ComposableFilterBar, ComparisonAreaChart, ConfirmDialog, CurrencyInput, DataTable, DonutChart, HudButton,
  HudDatePicker, HudInput, HudModal, HudSelect, Tabs, Textarea, type DataTableColumn, type FilterDef, type FilterValues,
} from "@/components/ui";
import { PageHeader } from "@/components/hud/PageHeader";
import { notify } from "@/store/toastStore";
import { formatINR, formatSignedINR } from "@/utils/format";
import { LoanFormModal } from "../loans/LoanForm";
import { LoansGrid } from "../loans/LoanCards";
import { LoanPortfolioGraph } from "../loans/LoanPortfolioGraph";
import { LoanDetail } from "../loans/LoanDetail";
import { useLoanStore } from "../loans/loanStore";
import { downloadTemplate, exportLoans, parseLoanWorkbook, type ParsedLoan } from "../loans/loanExcel";
import { formatDate, inr, type Loan } from "../loans/loanEngine";
import { useTransactionStore, type Transaction } from "../transactionStore";
import { usePaymentMethodStore, type PaymentKind, type PaymentMethod } from "../paymentMethodStore";

type MethodDraft = {
  name: string;
  kind: PaymentKind;
  detail: string;
  bank: string;
  balance: string;
  limit: string;
  dueDate: string;
  extra: string;
};

const emptyMethodDraft: MethodDraft = {
  name: "",
  kind: "credit-card",
  detail: "",
  bank: "",
  balance: "",
  limit: "",
  dueDate: "",
  extra: "",
};

const methodKindLabel: Record<PaymentKind, string> = {
  "credit-card": "Credit card",
  "bank-account": "Bank account",
  upi: "UPI ID",
};

const methodKindHint: Record<PaymentKind, string> = {
  "credit-card": "Last 4 digits of the card (masked)",
  "bank-account": "Last 4 digits of the account (masked)",
  upi: "Your UPI handle, e.g. name@bank",
};

const money = (value: number) => formatINR(value);
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CATEGORIES = ["Food", "Petrol", "Entertainment", "Shopping", "Bills", "Tolls", "Travel", "Other"];

function HudMenuSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <span className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">{label}</span>
      <div className="relative">
        <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex w-full items-center justify-between border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 py-2 text-left text-sm focus-visible:border-[color:var(--accent)]">
          {value}<ChevronDown size={16} className={open ? "rotate-180 text-[color:var(--accent)]" : "text-text-muted"} />
        </button>
        {open ? <div className="cc-hud-scrollbar absolute z-20 mt-1 max-h-56 w-full overflow-y-auto border border-[color:var(--accent)] bg-[color:var(--modal-bg)] p-1 shadow-hud">
          {options.map((option) => <button key={option} type="button" className={`block w-full px-3 py-2 text-left text-sm ${option === value ? "bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] text-[color:var(--accent)]" : "text-text-primary hover:bg-[color:var(--surface)]"}`} onClick={() => { onChange(option); setOpen(false); }}>{option}</button>)}
        </div> : null}
      </div>
    </div>
  );
}

export function FinancePage() {
  const [activeTab, setActiveTab] = useState("transactions");
  const transactions = useTransactionStore((state) => state.transactions);
  const addTransactionStore = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction);
  const paymentMethods = usePaymentMethodStore((state) => state.methods);
  const addMethodStore = usePaymentMethodStore((state) => state.addMethod);
  const updateMethodStore = usePaymentMethodStore((state) => state.updateMethod);
  const deleteMethodStore = usePaymentMethodStore((state) => state.deleteMethod);
  const [txModal, setTxModal] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null });
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [loanToArchive, setLoanToArchive] = useState<Loan | null>(null);
  const [loanToPurge, setLoanToPurge] = useState<Loan | null>(null);
  const [showArchivedLoans, setShowArchivedLoans] = useState(false);
  const [txView, setTxView] = useState<"all" | "monthly" | "income">("all");
  const [txFilters, setTxFilters] = useState<FilterValues>({});
  const [methodModal, setMethodModal] = useState<{ open: boolean; editingId: string | null }>({ open: false, editingId: null });
  const [methodDraft, setMethodDraft] = useState<MethodDraft>(emptyMethodDraft);

  // Loans module state
  const loans = useLoanStore((state) => state.loans);
  const addLoan = useLoanStore((state) => state.addLoan);
  const updateLoan = useLoanStore((state) => state.updateLoan);
  const addPayment = useLoanStore((state) => state.addPayment);
  const [loanFormModal, setLoanFormModal] = useState<{ open: boolean; editingId: string | null }>({ open: false, editingId: null });
  const [loanDetail, setLoanDetail] = useState<{ id: string; initialTab: "schedule" | "payments" | "preclose" | "partpay" | "analysis" } | null>(null);
  const [importPreview, setImportPreview] = useState<{ open: boolean; parsed: ParsedLoan[]; hasFatal: boolean } | null>(null);
  const [pendingPartPayment, setPendingPartPayment] = useState<{ loan: Loan | null; amount: number }>({ loan: null, amount: 0 });
  const importRef = useRef<HTMLInputElement>(null);
  const detailLoan = loans.find((loan) => loan.id === loanDetail?.id) ?? null;
  const editingLoan = loans.find((loan) => loan.id === loanFormModal.editingId) ?? null;
  const [reportMonth, setReportMonth] = useState("September");
  const [reportYear, setReportYear] = useState("2026");
  const [reportType, setReportType] = useState("Expenses only");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [lineYear, setLineYear] = useState("2026");
  const [lineDisplay, setLineDisplay] = useState("Income and expenses");
  const [form, setForm] = useState({
    amount: "", reason: "", category: "Food", type: "expense" as Transaction["type"], paymentMethodId: "coral", date: formatDate(new Date()),
  });

  const monthPrefix = formatDate(new Date()).slice(0, 7);
  const monthSpent = transactions.filter((item) => item.type === "expense" && item.date.startsWith(monthPrefix)).reduce((sum, item) => sum + item.amount, 0);
  const monthIncome = transactions.filter((item) => item.type === "income" && item.date.startsWith(monthPrefix)).reduce((sum, item) => sum + item.amount, 0);
  const savings = monthIncome - monthSpent;
  const paymentUsage = useMemo(() => Object.fromEntries(paymentMethods.map((method) => [
    method.id,
    transactions.filter((item) => item.paymentMethodId === method.id).reduce((sum, item) => sum + (item.type === "expense" ? item.amount : -item.amount), 0),
  ])), [paymentMethods, transactions]);
  const reportTransactions = useMemo(() => transactions.filter((item) => {
    const matchesYear = item.date.startsWith(`${reportYear}-`);
    const matchesMonth = reportMonth === "All months" || item.date.slice(5, 7) === String(monthNames.indexOf(reportMonth) + 1).padStart(2, "0");
    const matchesRange = (!reportFrom || item.date >= reportFrom) && (!reportTo || item.date <= reportTo);
    const matchesType = reportType === "All activity" || (reportType === "Expenses only" ? item.type === "expense" : item.type === "income");
    return matchesYear && matchesMonth && matchesRange && matchesType;
  }), [reportFrom, reportMonth, reportTo, reportType, reportYear, transactions]);
  const reportCategoryData = useMemo(() => Object.entries(reportTransactions.reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + item.amount;
    return result;
  }, {})).map(([label, value]) => ({ label, value })), [reportTransactions]);
  const monthlyCashflow = useMemo(() => monthNames.map((label, index) => {
    const prefix = `${lineYear}-${String(index + 1).padStart(2, "0")}`;
    const entries = transactions.filter((item) => item.date.startsWith(prefix));
    const income = entries.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expenses = entries.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    return { label: label.slice(0, 3), income: lineDisplay === "Expenses only" ? 0 : income, expenses: lineDisplay === "Income only" ? 0 : expenses };
  }), [lineDisplay, lineYear, transactions]);

  // ── Loan handlers ─────────────────────────────────────────────────
  function openAddLoan() {
    setLoanFormModal({ open: true, editingId: null });
  }

  function openEditLoan(loan: Loan) {
    setLoanFormModal({ open: true, editingId: loan.id });
  }

  function saveLoanFromModal(loan: Loan) {
    const editing = loanFormModal.editingId;
    if (editing) {
      const existing = loans.find((item) => item.id === editing);
      if (existing) {
        // Preserve payment history when editing a loan
        updateLoan(editing, { ...loan, payments: existing.payments, createdAt: existing.createdAt });
        notify("success", "LOAN UPDATED", `${loan.loanId} details saved — payment history preserved.`);
      }
    } else {
      if (loans.some((item) => item.loanId.toLowerCase() === loan.loanId.toLowerCase())) {
        notify("warning", "DUPLICATE LOAN ID", `${loan.loanId} already exists. Choose a unique Loan ID.`);
        return;
      }
      addLoan(loan);
      notify("success", "LOAN ADDED", `${loan.loanId} · ${loan.name} is now tracked with a full amortization schedule.`);
    }
    setLoanFormModal({ open: false, editingId: null });
  }

  function openPartPayment(loan: Loan) {
    setPendingPartPayment({ loan, amount: 0 });
  }

  function confirmPartPayment() {
    const { loan, amount } = pendingPartPayment;
    if (!loan || amount <= 0) {
      notify("warning", "ENTER AMOUNT", "Enter a positive lump-sum amount.");
      return;
    }
    addPayment(loan.id, {
      id: `pay-${Date.now()}`,
      loanId: loan.id,
      date: formatDate(new Date()),
      type: "Part Payment",
      amount,
      principal: amount,
      interest: 0,
      charges: 0,
      reference: "Part payment",
      notes: "Recorded from the loans screen",
    });
    setPendingPartPayment({ loan: null, amount: 0 });
    notify("success", "PART PAYMENT RECORDED", "Outstanding updated and the schedule recalculates automatically.");
  }

  function handleImportFile(file: File) {
    parseLoanWorkbook(file).then((result) => {
      setImportPreview({ open: true, parsed: result.loans, hasFatal: result.hasFatal });
    });
  }

  function commitImport() {
    if (!importPreview || importPreview.hasFatal) return;
    const ok = importPreview.parsed.filter((item) => item.issues.length === 0);
    if (ok.length === 0) {
      notify("warning", "NOTHING TO IMPORT", "Fix the errors in the file first, then import again.");
      return;
    }
    let added = 0;
    for (const parsed of ok) {
      // Skip duplicate Loan IDs
      if (loans.some((loan) => loan.loanId.toLowerCase() === parsed.loan.loanId.toLowerCase())) {
        notify("warning", "SKIPPED DUPLICATE", `${parsed.loan.loanId} already exists — skipped.`);
        continue;
      }
      addLoan(parsed.loan);
      added++;
    }
    setImportPreview(null);
    notify("success", "IMPORT COMPLETE", `${added} loan${added === 1 ? "" : "s"} imported with the same engine, validation and rules as the UI.`);
  }

  function openAddTx() {
    setForm({ amount: "", reason: "", category: "Food", type: "expense", paymentMethodId: paymentMethods[0]?.id ?? "coral", date: formatDate(new Date()) });
    setTxModal({ open: true, editing: null });
  }

  function openEditTx(txn: Transaction) {
    setForm({ amount: String(txn.amount), reason: txn.reason, category: txn.category, type: txn.type, paymentMethodId: txn.paymentMethodId, date: txn.date });
    setTxModal({ open: true, editing: txn });
  }

  function saveTransaction() {
    const amount = Number(form.amount);
    if (!amount || !form.reason.trim()) {
      notify("warning", "MISSING DETAILS", "Enter an amount and a reason before saving.");
      return;
    }
    if (txModal.editing) {
      updateTransaction(txModal.editing.id, { amount, reason: form.reason, category: form.category, type: form.type, paymentMethodId: form.paymentMethodId, date: form.date });
      notify("success", "TRANSACTION UPDATED", "The ledger and reports have updated.");
    } else {
      addTransactionStore({ amount, reason: form.reason, category: form.category, type: form.type, paymentMethodId: form.paymentMethodId, date: form.date });
      notify("success", "TRANSACTION SAVED", "The payment method and reports have updated.");
    }
    setForm({ amount: "", reason: "", category: "Food", type: "expense" as Transaction["type"], paymentMethodId: paymentMethods[0]?.id ?? "coral", date: formatDate(new Date()) });
    setTxModal({ open: false, editing: null });
  }

  function confirmDeleteTx() {
    if (!txToDelete) return;
    deleteTransaction(txToDelete.id);
    notify("success", "TRANSACTION DELETED", `${txToDelete.reason} was removed from the ledger.`);
    setTxToDelete(null);
  }

  function confirmArchiveLoan() {
    if (!loanToArchive) return;
    useLoanStore.getState().archiveLoan(loanToArchive.id);
    notify("success", "LOAN ARCHIVED", `${loanToArchive.loanId} moved to the archive.`);
    setLoanToArchive(null);
  }

  function confirmPurgeLoan() {
    if (!loanToPurge) return;
    useLoanStore.getState().deleteLoan(loanToPurge.id);
    notify("success", "LOAN DELETED", `${loanToPurge.loanId} was permanently removed from the archive.`);
    setLoanToPurge(null);
  }

  function openAddMethod() {
    setMethodDraft(emptyMethodDraft);
    setMethodModal({ open: true, editingId: null });
  }

  function openEditMethod(method: PaymentMethod) {
    setMethodDraft({
      name: method.name,
      kind: method.kind,
      detail: method.detail.replace(/^••••\s*/, ""),
      bank: method.bank,
      balance: String(method.balance),
      limit: method.limit ? String(method.limit) : "",
      dueDate: method.dueDate ?? "",
      extra: method.extra,
    });
    setMethodModal({ open: true, editingId: method.id });
  }

  function saveMethod() {
    const name = methodDraft.name.trim();
    const detail = methodDraft.detail.trim();
    const balance = Number(methodDraft.balance) || 0;
    const limit = methodDraft.limit ? Number(methodDraft.limit) : undefined;
    if (!name) {
      notify("warning", "NAME REQUIRED", "Give the method a display name before saving.");
      return;
    }
    if (!detail) {
      notify("warning", "DETAIL REQUIRED", `Enter the ${methodKindHint[methodDraft.kind].toLowerCase()}.`);
      return;
    }
    if (limit !== undefined && limit <= 0) {
      notify("warning", "INVALID LIMIT", "Credit limit must be a positive number.");
      return;
    }
    const editing = methodModal.editingId;
    const duplicate = paymentMethods.some((method) => method.id !== editing && method.detail.replace(/^••••\s*/, "") === detail && method.kind === methodDraft.kind);
    if (duplicate) {
      notify("warning", "DUPLICATE DETAIL", `A ${methodKindLabel[methodDraft.kind].toLowerCase()} with that detail already exists.`);
      return;
    }
    const masked = methodDraft.kind === "upi" ? detail : `•••• ${detail}`;
    const method: PaymentMethod = {
      id: editing ?? `method-${Date.now()}`,
      name,
      kind: methodDraft.kind,
      detail: masked,
      bank: methodDraft.bank.trim() || "—",
      balance,
      limit: methodDraft.kind === "credit-card" ? limit : undefined,
      dueDate: methodDraft.kind === "credit-card" && methodDraft.dueDate ? methodDraft.dueDate : undefined,
      extra: methodDraft.extra.trim() || "—",
    };
    if (editing) {
      updateMethodStore(editing, method);
    } else {
      addMethodStore(method);
    }
    setMethodModal({ open: false, editingId: null });
    notify("success", editing ? "METHOD UPDATED" : "METHOD ADDED", `${name} is ready for new transactions.`);
  }

  function deleteMethod(method: PaymentMethod) {
    const used = paymentUsage[method.id] ?? 0;
    if (used !== 0) {
      notify("warning", "METHOD IN USE", `${method.name} still holds ${money(Math.abs(used))} of activity — reassign those transactions first.`);
      return;
    }
    if (transactions.some((item) => item.paymentMethodId === method.id)) {
      notify("warning", "METHOD IN USE", "Reassign or delete these transactions before removing this method.");
      return;
    }
    deleteMethodStore(method.id);
    notify("success", "METHOD REMOVED", `${method.name} was deleted.`);
  }

  const columns: DataTableColumn<Transaction>[] = [
    { id: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
    { id: "reason", header: "Reason", accessor: (row) => <div><div>{row.reason}</div><div className="mt-0.5 text-xs text-text-muted">{paymentMethods.find((method) => method.id === row.paymentMethodId)?.name}</div></div>, sortValue: (row) => row.reason },
    { id: "category", header: "Category", accessor: (row) => row.category, sortValue: (row) => row.category },
    { id: "amount", header: "Amount", accessor: (row) => <span className={row.type === "income" ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}>{formatSignedINR(row.type === "income" ? row.amount : -row.amount)}</span>, sortValue: (row) => row.amount },
  ];

  const transactionFilters: FilterDef[] = [
    { id: "type", type: "select", label: "Type", options: [{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }] },
    { id: "category", type: "select", label: "Category", options: CATEGORIES.map((category) => ({ value: category, label: category })) },
    { id: "method", type: "select", label: "Payment", options: paymentMethods.map((method) => ({ value: method.id, label: method.name })) },
    { id: "date", type: "date-range", label: "Date" },
  ];

  const viewRows = txView === "monthly"
    ? transactions.filter((item) => item.type === "expense" && item.date.startsWith(monthPrefix))
    : txView === "income"
      ? transactions.filter((item) => item.type === "income")
      : transactions;
  const filteredTx = viewRows.filter((item) => {
    const typeFilter = txFilters.type as string | undefined;
    const categoryFilter = txFilters.category as string | undefined;
    const methodFilter = txFilters.method as string | undefined;
    const range = txFilters.date as { from?: string; to?: string } | undefined;
    if (typeFilter && item.type !== typeFilter) return false;
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (methodFilter && item.paymentMethodId !== methodFilter) return false;
    if (range?.from && item.date < range.from) return false;
    if (range?.to && item.date > range.to) return false;
    return true;
  });

  const txTabs: Array<{ id: "all" | "monthly" | "income"; label: string }> = [
    { id: "all", label: "All" },
    { id: "monthly", label: "Monthly spends" },
    { id: "income", label: "Income" },
  ];

  const transactionsContent = (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="This month spent" icon={WalletCards}><div className="font-display text-2xl text-[color:var(--danger)]">{money(monthSpent)}</div></Card>
        <Card title="Income recorded" icon={IndianRupee}><div className="font-display text-2xl text-[color:var(--success)]">{money(monthIncome)}</div></Card>
        <Card title="Savings" icon={IndianRupee}><div className={`font-display text-2xl ${savings >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}`}>{formatSignedINR(savings)}</div></Card>
        <Card title="Active methods" icon={CreditCard}><div className="font-display text-2xl text-[color:var(--accent)]">{paymentMethods.length}</div></Card>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-display text-sm tracking-[0.16em] uppercase">Transaction ledger</h2><p className="mt-1 text-sm text-text-secondary">New transactions appear here and update the other tabs immediately.</p></div>
        <HudButton onClick={openAddTx}><Plus size={16} /> Add transaction</HudButton>
      </div>
      <div className="flex flex-wrap gap-2">
        {txTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`border px-3 py-1.5 font-display text-[9px] tracking-[0.14em] uppercase ${txView === tab.id ? "border-[color:var(--accent)] text-[color:var(--accent)]" : "border-[color:var(--border)] text-text-muted hover:border-[color:var(--border)] hover:text-text-primary"}`}
            onClick={() => setTxView((current) => (current === tab.id ? "all" : tab.id))}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ComposableFilterBar
        filters={transactionFilters}
        values={txFilters}
        onChange={setTxFilters}
        onClearAll={() => setTxFilters({})}
      />
      <DataTable columns={columns} data={filteredTx} rowKey={(row) => row.id} searchable sortable pagination pageSize={8} searchPlaceholder="Search transactions…" searchFilter={(row, query) => `${row.reason} ${row.category}`.toLowerCase().includes(query)} rowActions={(row) => <div className="flex justify-end gap-1"><HudButton variant="ghost" className="!min-h-0 px-1.5 py-0.5" aria-label={`Edit ${row.reason}`} onClick={() => openEditTx(row)}><Pencil size={13} /></HudButton><HudButton variant="ghost" className="!min-h-0 px-1.5 py-0.5 text-[color:var(--danger)]" aria-label={`Delete ${row.reason}`} onClick={() => setTxToDelete(row)}><Trash2 size={13} /></HudButton></div>} />
    </div>
  );

  const methodsContent = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-sm tracking-[0.16em] uppercase">Payment methods</h2><p className="mt-1 text-sm text-text-secondary">Transaction payment choices are pulled from these cards.</p></div><HudButton onClick={openAddMethod}><Plus size={16} /> Add method</HudButton></div>
      <div className="grid gap-4 lg:grid-cols-3">
        {paymentMethods.map((method) => {
          const used = paymentUsage[method.id] ?? 0;
          const estimatedAvailable = method.kind === "credit-card" ? (method.limit ?? 0) - used : method.balance - used;
          const outstanding = Math.max(used, 0);
          const utilization = method.limit ? Math.min((outstanding / method.limit) * 100, 100) : 0;
          return <Card key={method.id} title={method.kind.replace("-", " ")} description={method.bank} icon={method.kind === "credit-card" ? CreditCard : method.kind === "bank-account" ? Building2 : Smartphone} footer={<div className="flex gap-2"><HudButton variant="ghost" onClick={() => navigator.clipboard?.writeText(`${method.name}\n${method.detail}\n${method.extra}`).then(() => notify("success", "DETAILS COPIED", `${method.name} details copied.`))}>Copy details</HudButton><HudButton variant="ghost" onClick={() => openEditMethod(method)}>Update</HudButton><HudButton variant="ghost" aria-label={`Delete ${method.name}`} onClick={() => deleteMethod(method)}><Trash2 size={14} /></HudButton></div>}>
            <div className="font-display text-lg tracking-[0.08em]">{method.name}</div><div className="mt-1 text-sm text-text-secondary">{method.detail}</div>
            <div className="mt-5 border-t border-[color:var(--border)] pt-3"><div className="text-xs text-text-muted">{method.kind === "credit-card" ? "Credit available" : "Estimated available"}</div><div className="mt-1 text-xl text-[color:var(--accent)]">{money(estimatedAvailable)}</div>{method.kind === "credit-card" ? <><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><div className="text-xs text-text-muted">Repayment due</div><div className="mt-1">{method.dueDate}</div></div><div><div className="text-xs text-text-muted">Amount to pay</div><div className="mt-1 text-[color:var(--danger)]">{money(outstanding)}</div></div></div><div className="mt-4"><div className="flex justify-between text-xs text-text-muted"><span>Outstanding {money(outstanding)}</span><span>Limit {money(method.limit ?? 0)}</span></div><div className="mt-2 h-2 overflow-hidden bg-[color:var(--bg-secondary)]"><div className="h-full bg-[color:var(--accent)]" style={{ width: `${utilization}%` }} /></div></div></> : null}<div className="mt-3 text-xs text-text-muted">{method.extra}</div></div>
          </Card>;
        })}
      </div>
    </div>
  );

  const activeLoans = loans.filter((loan) => loan.status !== "archived");
  const archivedLoans = loans.filter((loan) => loan.status === "archived");

  const loansContent = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm tracking-[0.16em] uppercase">{showArchivedLoans ? "Archived loans" : "Active loans"}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {showArchivedLoans
              ? "Archived loans are hidden from the portfolio until restored. Deleting here removes them permanently."
              : "Deleting a loan moves it to the archive — it is never destroyed accidentally."}
          </p>
        </div>
        {archivedLoans.length > 0 ? (
          <HudButton variant="ghost" onClick={() => setShowArchivedLoans((current) => !current)}>
            {showArchivedLoans ? (
              <>
                <ArchiveRestore size={14} className="mr-1.5" />
                Active loans
              </>
            ) : (
              <>
                <Archive size={14} className="mr-1.5" />
                Archived ({archivedLoans.length})
              </>
            )}
          </HudButton>
        ) : null}
      </div>
      {showArchivedLoans ? (
        archivedLoans.length === 0 ? (
          <div className="rounded-lg border border-[color:var(--border)] px-6 py-12 text-center text-sm text-text-muted">
            No archived loans yet — delete a loan to move it here.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {archivedLoans.map((loan) => (
              <Card
                key={loan.id}
                title={`${loan.loanId} · ${loan.name}`}
                description={`${loan.type} · ${loan.lender}`}
                icon={Building2}
                className="flex flex-col"
                footer={
                  <div className="flex flex-wrap gap-1.5">
                    <HudButton variant="ghost" onClick={() => { useLoanStore.getState().unarchiveLoan(loan.id); notify("success", "LOAN RESTORED", `${loan.loanId} returned to the active portfolio.`); }}><ArchiveRestore size={13} className="mr-1" />Restore</HudButton>
                    <HudButton variant="danger" onClick={() => setLoanToPurge(loan)}><Trash2 size={13} className="mr-1" />Delete permanently</HudButton>
                  </div>
                }
              >
                <div className="text-xs text-text-muted">Principal {money(loan.principal)} · EMI {inr(loan.emi)} · {loan.tenureMonths} mo</div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
          {/* First panel: full-width portfolio graph */}
          <LoanPortfolioGraph loans={activeLoans} />
          {/* Second row onward: loan cards */}
          <LoansGrid
            loans={activeLoans}
            onView={(loan) => setLoanDetail({ id: loan.id, initialTab: "schedule" })}
            onEdit={openEditLoan}
            onPartPayment={openPartPayment}
            onPreclose={(loan) => setLoanDetail({ id: loan.id, initialTab: "preclose" })}
            onArchive={(loan) => setLoanToArchive(loan)}
            onAdd={openAddLoan}
            onImport={() => importRef.current?.click()}
            onExport={() => { exportLoans(activeLoans); notify("success", "EXPORTED", "commandcenter-loans-export.xlsx generated with master, rules, payments, fees and amortization sheets."); }}
            onDownloadTemplate={() => { downloadTemplate(); notify("success", "TEMPLATE DOWNLOADED", "commandcenter-loan-template.xlsx with Loan_Master, Payments, Preclosure_Rules, PartPayment_Rules and Fees sheets."); }}
          />
        </>
      )}
    </div>
  );

  const reportsContent = (
    <div className="space-y-6"><div><h2 className="font-display text-sm tracking-[0.16em] uppercase">Reports</h2><p className="mt-1 text-sm text-text-secondary">Each chart has its own controls and can be reviewed independently.</p></div><div className="grid gap-4 lg:grid-cols-2"><ChartCard className="w-full" title="Category breakdown" description="Spending, income, or all activity by category"><div className="mb-5 grid gap-3 border-b border-[color:var(--border)] pb-4 sm:grid-cols-2 lg:grid-cols-3"><HudMenuSelect label="Show" value={reportType} options={["Expenses only", "Income only", "All activity"]} onChange={setReportType} /><HudMenuSelect label="Month" value={reportMonth} options={["All months", ...monthNames]} onChange={setReportMonth} /><HudMenuSelect label="Year" value={reportYear} options={["2026", "2025", "2024"]} onChange={setReportYear} /><HudDatePicker label="From date" value={reportFrom || null} onChange={(value) => setReportFrom(value ?? "")} /><HudDatePicker label="To date" value={reportTo || null} onChange={(value) => setReportTo(value ?? "")} /></div><DonutChart data={reportCategoryData} formatValue={money} emptyTitle="NO MATCHING ACTIVITY" emptyBody="Try changing this chart's filters." /></ChartCard><ChartCard className="w-full" title="Monthly income and expenses" description="Yearly monthly trend"><div className="mb-5 grid max-w-md gap-3 border-b border-[color:var(--border)] pb-4 sm:grid-cols-2"><HudMenuSelect label="Display" value={lineDisplay} options={["Income and expenses", "Income only", "Expenses only"]} onChange={setLineDisplay} /><HudMenuSelect label="Year" value={lineYear} options={["2026", "2025", "2024"]} onChange={setLineYear} /></div><ComparisonAreaChart data={monthlyCashflow} /></ChartCard></div></div>
  );

  return <div className="space-y-6"><PageHeader kicker="Personal finance" title="Finance command" actions={<HudButton onClick={openAddTx}><Plus size={16} /> Add transaction</HudButton>} /><Tabs activeId={activeTab} onChange={setActiveTab} tabs={[{ id: "transactions", label: "Transactions", icon: WalletCards, badge: transactions.length, content: transactionsContent }, { id: "methods", label: "Payment methods", icon: CreditCard, badge: paymentMethods.length, content: methodsContent }, { id: "loans", label: "Loans", icon: WalletCards, content: loansContent }, { id: "reports", label: "Reports", icon: BarChart3, content: reportsContent }]} /><HudModal open={txModal.open} title={txModal.editing ? "Edit transaction" : "Add transaction"} size="lg" onClose={() => setTxModal({ open: false, editing: null })}><div className="grid gap-4 md:grid-cols-2"><CurrencyInput label="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" /><HudDatePicker label="Date" value={form.date || null} onChange={(value) => setForm({ ...form, date: value ?? "" })} /><HudInput label="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="What was this for?" /><HudMenuSelect label="Category" value={form.category} options={CATEGORIES} onChange={(category) => setForm({ ...form, category })} /><HudSelect label="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Transaction["type"] })}><option value="expense">Expense</option><option value="income">Income</option></HudSelect><HudSelect label="Payment method" value={form.paymentMethodId} onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })}>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name} · {method.detail}</option>)}</HudSelect><div className="md:col-span-2"><Textarea label="Notes (optional)" placeholder="Add useful context…" rows={3} /></div></div><div className="mt-6 flex justify-end gap-2"><HudButton variant="ghost" onClick={() => setTxModal({ open: false, editing: null })}>Cancel</HudButton><HudButton onClick={saveTransaction}>{txModal.editing ? "Save changes" : "Save transaction"}</HudButton></div></HudModal><HudModal open={methodModal.open} title={methodModal.editingId ? "Update payment method" : "Add payment method"} size="lg" onClose={() => setMethodModal({ open: false, editingId: null })}><div className="grid gap-4 md:grid-cols-2"><HudSelect label="Type" value={methodDraft.kind} onChange={(event) => setMethodDraft({ ...methodDraft, kind: event.target.value as PaymentKind })}><option value="credit-card">Credit card</option><option value="bank-account">Bank account</option><option value="upi">UPI ID</option></HudSelect><HudInput label="Display name" value={methodDraft.name} onChange={(event) => setMethodDraft({ ...methodDraft, name: event.target.value })} placeholder={methodDraft.kind === "credit-card" ? "e.g. ICICI Coral CC" : methodDraft.kind === "bank-account" ? "e.g. Everyday Savings" : "e.g. Google Pay UPI"} /><HudInput label={methodKindLabel[methodDraft.kind]} value={methodDraft.detail} onChange={(event) => setMethodDraft({ ...methodDraft, detail: event.target.value })} placeholder={methodDraft.kind === "upi" ? "name@bank" : "Last 4 digits"} /><HudInput label="Bank / provider" value={methodDraft.bank} onChange={(event) => setMethodDraft({ ...methodDraft, bank: event.target.value })} placeholder="e.g. ICICI Bank" /><CurrencyInput label={methodDraft.kind === "credit-card" ? "Credit limit" : "Current balance"} value={methodDraft.balance} onChange={(event) => setMethodDraft({ ...methodDraft, balance: event.target.value })} placeholder="0" />{methodDraft.kind === "credit-card" ? <HudDatePicker label="Repayment due date" value={methodDraft.dueDate || null} onChange={(value) => setMethodDraft({ ...methodDraft, dueDate: value ?? "" })} /> : <HudInput label="Credit limit (credit cards only)" value={methodDraft.limit} placeholder="Not needed for this type" disabled />}<div className="md:col-span-2"><Textarea label="Notes (optional)" value={methodDraft.extra} onChange={(event) => setMethodDraft({ ...methodDraft, extra: event.target.value })} placeholder={methodDraft.kind === "credit-card" ? "Expiry, card network, rewards…" : "IFSC code, linked app, remarks…"} rows={3} /></div></div><div className="mt-6 flex justify-end gap-2"><HudButton variant="ghost" onClick={() => setMethodModal({ open: false, editingId: null })}>Cancel</HudButton><HudButton onClick={saveMethod}>{methodModal.editingId ? "Save changes" : "Add method"}</HudButton></div></HudModal><LoanDetail open={!!loanDetail} loan={detailLoan} initialTab={loanDetail?.initialTab ?? "schedule"} onClose={() => setLoanDetail(null)} onEdit={openEditLoan} onRecordPayment={(payment) => { addPayment(payment.loanId, payment); notify("success", "PAYMENT RECORDED", "Payment history appended — schedule metrics recalculated."); }} onPreclose={(loan) => { addPayment(loan.id, { id: "pay-" + Date.now(), loanId: loan.id, date: formatDate(new Date()), type: "Preclosure", amount: 0, principal: 0, interest: 0, charges: 0, reference: "Preclosure", notes: "Closed via preclosure" }); updateLoan(loan.id, { status: "preclosed" }); notify("success", "LOAN PRECLOSED", loan.loanId + " marked as preclosed — payment history preserved."); setLoanDetail(null); }} /><input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files ? e.target.files[0] : null; if (f) handleImportFile(f); e.target.value = ""; }} /><LoanFormModal open={loanFormModal.open} editing={!!loanFormModal.editingId} existing={editingLoan} onClose={() => setLoanFormModal({ open: false, editingId: null })} onSave={saveLoanFromModal} /><HudModal open={!!pendingPartPayment.loan} title={"Part payment — " + (pendingPartPayment.loan ? pendingPartPayment.loan.loanId : "")} size="md" onClose={() => setPendingPartPayment({ loan: null, amount: 0 })}><div className="space-y-4"><p className="text-sm text-text-secondary">This records a lump-sum principal payment; the outstanding balance, schedule, interest and remaining tenure recalculate automatically.</p><CurrencyInput label="Lump-sum amount (₹)" value={pendingPartPayment.amount ? String(pendingPartPayment.amount) : ""} onChange={(e) => setPendingPartPayment((current) => ({ ...current, amount: Number(e.target.value) }))} placeholder="e.g. 100000" /><div className="mt-6 flex justify-end gap-2"><HudButton variant="ghost" onClick={() => setPendingPartPayment({ loan: null, amount: 0 })}>Cancel</HudButton><HudButton onClick={confirmPartPayment}>Record part payment</HudButton></div></div></HudModal><HudModal open={!!importPreview?.open} title="Import preview" size="lg" onClose={() => setImportPreview(null)}><div className="cc-hud-scrollbar max-h-[60vh] space-y-4 overflow-y-auto pr-1">{importPreview ? <><div className="text-sm text-text-secondary">{importPreview.parsed.length} loan(s) detected. {importPreview.hasFatal ? <span className="text-[color:var(--danger)]">Fix the errors in the file and re-import — nothing will be committed.</span> : <span className="text-[color:var(--success)]">No fatal errors — ready to import.</span>}</div>{importPreview.parsed.map((parsed) => (<div key={parsed.loan.id} className="rounded-lg border border-[color:var(--border)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-display text-xs tracking-[0.14em] uppercase">{parsed.loan.loanId} · {parsed.loan.name}</div><div className="text-xs text-text-muted">{parsed.loan.type} · {parsed.loan.lender} · {parsed.loan.annualRate}% · {parsed.loan.tenureMonths} mo</div></div><div className="mt-1 text-xs text-text-secondary">EMI {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(parsed.loan.emi)} · Principal {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(parsed.loan.principal)} · First EMI {parsed.loan.firstEmiDate}</div>{parsed.issues.length ? <div className="mt-2 space-y-1">{parsed.issues.map((issue, i) => <div key={i} className={"flex items-start gap-2 text-xs " + (issue.level === "error" ? "text-[color:var(--danger)]" : "text-[color:var(--warning)]")}><span className="mt-0.5 shrink-0">{issue.level === "error" ? "⛔" : "⚠️"}</span><span>{issue.sheet} row {issue.row}: {issue.message}</span></div>)}</div> : <div className="mt-2 text-xs text-[color:var(--success)]">✓ Valid — will import cleanly.</div>}</div>))}</> : null}</div><div className="mt-6 flex justify-end gap-2"><HudButton variant="ghost" onClick={() => setImportPreview(null)}>Cancel</HudButton><HudButton onClick={commitImport} disabled={importPreview ? importPreview.hasFatal : true}>Import {importPreview && !importPreview.hasFatal ? importPreview.parsed.filter((p) => p.issues.length === 0).length : 0} loans</HudButton></div></HudModal><ConfirmDialog open={Boolean(txToDelete)} title="Delete transaction" body={<p>Are you sure you want to delete <strong>{txToDelete?.reason}</strong> of <strong>{txToDelete ? money(txToDelete.amount) : ""}</strong>? This cannot be undone.</p>} confirmLabel="Delete" danger onConfirm={confirmDeleteTx} onCancel={() => setTxToDelete(null)} /><ConfirmDialog open={Boolean(loanToArchive)} title="Archive loan" body={<p><strong>{loanToArchive?.loanId}</strong> will be moved to the archive and hidden from the active portfolio. You can restore it later, or delete it permanently from the archive.</p>} confirmLabel="Archive" onConfirm={confirmArchiveLoan} onCancel={() => setLoanToArchive(null)} /><ConfirmDialog open={Boolean(loanToPurge)} title="Delete loan permanently" body={<p>Are you sure? Permanently deleting <strong>{loanToPurge?.loanId}</strong> removes it and its full payment history. This cannot be undone.</p>} confirmLabel="Delete permanently" danger onConfirm={confirmPurgeLoan} onCancel={() => setLoanToPurge(null)} /></div>;
}
