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
  return [];
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