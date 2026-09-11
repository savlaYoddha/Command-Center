// ─────────────────────────────────────────────────────────────
// VEHICLE EXPENSE & DOCUMENT STORE — fuel/toll charges and
// linked documents per vehicle. Fuel/toll entries mirror into
// the Finance transaction ledger. Persists to localStorage.
// ─────────────────────────────────────────────────────────────
import { create } from "zustand";
import { useTransactionStore, todayStamp } from "@/modules/finance/transactionStore";

export type VehicleExpense = {
  id: string;
  vehicleId: string;
  type: "fuel" | "toll";
  amount: number;
  paymentMethodId: string;
  date: string;
  odometer: number | null;
  notes?: string;
  transactionId: string | null;
};

export type LinkedDocument = {
  id: string;
  vehicleId: string;
  title: string;
  link: string;
  note?: string;
};

const EXPENSE_KEY = "commandcenter.vehicles.expenses.v1";
const DOC_KEY = "commandcenter.vehicles.documents.v1";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function persist(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode — ignore
  }
}

const FUEL_CATEGORY = "Petrol";
const TOLL_CATEGORY = "Tolls";

type VehicleExpenseState = {
  expenses: VehicleExpense[];
  documents: LinkedDocument[];
  addExpense: (input: Omit<VehicleExpense, "id" | "transactionId"> & { vehicleName: string }) => VehicleExpense;
  updateExpense: (id: string, patch: Partial<VehicleExpense>) => void;
  deleteExpense: (id: string) => void;
  addDocument: (input: Omit<LinkedDocument, "id">) => void;
  updateDocument: (id: string, patch: Partial<LinkedDocument>) => void;
  deleteDocument: (id: string) => void;
};

function txnReason(expense: VehicleExpense, vehicleName: string): string {
  const label = expense.type === "fuel" ? "Fuel" : "Toll";
  return `${label} · ${vehicleName}`;
}

export const useVehicleExpenseStore = create<VehicleExpenseState>((set, get) => ({
  expenses: load<VehicleExpense[]>(EXPENSE_KEY, []),
  documents: load<LinkedDocument[]>(DOC_KEY, []),

  addExpense: ({ vehicleName, ...input }) => {
    const id = `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expense: VehicleExpense = {
      ...input,
      id,
      transactionId: null,
      date: input.date ?? todayStamp(),
      odometer: input.odometer ?? null,
    };
    expense.transactionId = useTransactionStore
      .getState()
      .addTransaction({
        date: expense.date,
        reason: txnReason(expense, vehicleName),
        category: expense.type === "fuel" ? FUEL_CATEGORY : TOLL_CATEGORY,
        amount: expense.amount,
        type: "expense",
        paymentMethodId: expense.paymentMethodId,
        vehicleId: expense.vehicleId,
        source: expense.type,
      }).id;
    const next = [...get().expenses, expense];
    set({ expenses: next });
    persist(EXPENSE_KEY, next);
    return expense;
  },

  updateExpense: (id, patch) => {
    const next = get().expenses.map((exp) => (exp.id === id ? { ...exp, ...patch } : exp));
    set({ expenses: next });
    persist(EXPENSE_KEY, next);
    const updated = next.find((e) => e.id === id);
    if (updated?.transactionId && (patch.amount !== undefined || patch.date !== undefined || patch.paymentMethodId !== undefined)) {
      useTransactionStore.getState().updateTransaction(updated.transactionId, {
        amount: updated.amount,
        date: updated.date,
        paymentMethodId: updated.paymentMethodId,
      });
    }
  },

  deleteExpense: (id) => {
    const target = get().expenses.find((e) => e.id === id);
    const next = get().expenses.filter((e) => e.id !== id);
    set({ expenses: next });
    persist(EXPENSE_KEY, next);
    if (target?.transactionId) {
      useTransactionStore.getState().deleteTransaction(target.transactionId);
    }
  },

  addDocument: (input) => {
    const id = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const doc: LinkedDocument = { ...input, id };
    const next = [...get().documents, doc];
    set({ documents: next });
    persist(DOC_KEY, next);
  },
  updateDocument: (id, patch) => {
    const next = get().documents.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc));
    set({ documents: next });
    persist(DOC_KEY, next);
  },
  deleteDocument: (id) => {
    const next = get().documents.filter((doc) => doc.id !== id);
    set({ documents: next });
    persist(DOC_KEY, next);
  },
}));
