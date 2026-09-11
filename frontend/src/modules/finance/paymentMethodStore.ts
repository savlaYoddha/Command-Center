// ─────────────────────────────────────────────────────────────
// PAYMENT METHOD STORE — shared list of payment methods used by
// transactions and vehicle fuel/toll entries. Persists to
// localStorage.
// ─────────────────────────────────────────────────────────────
import { create } from "zustand";

export type PaymentKind = "credit-card" | "bank-account" | "upi";
export type PaymentMethod = {
  id: string;
  name: string;
  kind: PaymentKind;
  detail: string;
  bank: string;
  balance: number;
  limit?: number;
  dueDate?: string;
  extra: string;
};

const STORAGE_KEY = "commandcenter.finance.methods.v1";

function seedMethods(): PaymentMethod[] {
  return [
    { id: "coral", name: "ICICI Coral CC", kind: "credit-card", detail: "•••• 1007", bank: "ICICI Bank", balance: 0, limit: 100000, dueDate: "12 Sep 2026", extra: "Expiry available in secure records" },
    { id: "savings", name: "Everyday Savings", kind: "bank-account", detail: "•••• 1048", bank: "ICICI Bank", balance: 42850, extra: "IFSC ICIC0001048" },
    { id: "gpay", name: "Google Pay UPI", kind: "upi", detail: "savlay@okicici", bank: "Linked to ICICI Savings", balance: 42850, extra: "Active on Google Pay" },
  ];
}

function loadInitial(): PaymentMethod[] {
  if (typeof window === "undefined") return seedMethods();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PaymentMethod[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fall through to seed
  }
  return seedMethods();
}

type MethodState = {
  methods: PaymentMethod[];
  addMethod: (method: PaymentMethod) => void;
  updateMethod: (id: string, patch: Partial<PaymentMethod>) => void;
  deleteMethod: (id: string) => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist(methods: PaymentMethod[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
    } catch {
      // storage full / private mode — ignore
    }
  }, 150);
}

export const usePaymentMethodStore = create<MethodState>((set, get) => ({
  methods: loadInitial(),
  addMethod: (method) => {
    const next = [...get().methods, method];
    set({ methods: next });
    persist(next);
  },
  updateMethod: (id, patch) => {
    const next = get().methods.map((m) => (m.id === id ? { ...m, ...patch } : m));
    set({ methods: next });
    persist(next);
  },
  deleteMethod: (id) => {
    const next = get().methods.filter((m) => m.id !== id);
    set({ methods: next });
    persist(next);
  },
}));