// ─────────────────────────────────────────────────────────────
// TRANSACTION STORE — single source of truth for the ledger.
// Persists to localStorage so edits survive reloads.
// ─────────────────────────────────────────────────────────────
import { create } from "zustand";

export type Transaction = {
  id: string;
  date: string;
  reason: string;
  category: string;
  amount: number;
  type: "expense" | "income";
  paymentMethodId: string;
  vehicleId?: string;
  source?: "manual" | "fuel" | "toll";
};

const STORAGE_KEY = "commandcenter.finance.transactions.v1";

export function todayStamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function seedTransactions(): Transaction[] {
  return [];
}

function loadInitial(): Transaction[] {
  if (typeof window === "undefined") return seedTransactions();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Transaction[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fall through to seed
  }
  return seedTransactions();
}

type TransactionState = {
  transactions: Transaction[];
  addTransaction: (txn: Omit<Transaction, "id">) => Transaction;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist(transactions: Transaction[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      // storage full / private mode — ignore
    }
  }, 150);
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: loadInitial(),
  addTransaction: (txn) => {
    const id = `txn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const created: Transaction = { ...txn, id };
    const next = [created, ...get().transactions];
    set({ transactions: next });
    persist(next);
    return created;
  },
  updateTransaction: (id, patch) => {
    const next = get().transactions.map((txn) => (txn.id === id ? { ...txn, ...patch } : txn));
    set({ transactions: next });
    persist(next);
  },
  deleteTransaction: (id) => {
    const next = get().transactions.filter((txn) => txn.id !== id);
    set({ transactions: next });
    persist(next);
  },
}));
