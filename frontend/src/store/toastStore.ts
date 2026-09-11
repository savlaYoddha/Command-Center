import { create } from "zustand";

export type ToastTone = "success" | "warning" | "error" | "info";

export type HudToast = {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
};

type ToastState = {
  toasts: HudToast[];
  push: (toast: Omit<HudToast, "id"> & { id?: string }) => string;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = toast.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts.slice(-4), { ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

export function notify(tone: ToastTone, title: string, body?: string): void {
  useToastStore.getState().push({ tone, title, body });
}
