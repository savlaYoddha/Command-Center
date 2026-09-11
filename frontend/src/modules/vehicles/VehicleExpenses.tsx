// ─────────────────────────────────────────────────────────────
// VEHICLE EXPENSES — shared fuel / toll charge modal and list.
// Charges mirror into the Finance transaction ledger via the
// vehicle expense store.
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { CurrencyInput, HudButton, HudDatePicker, HudInput, HudModal, HudSelect } from "@/components/ui";
import { notify } from "@/store/toastStore";
import { usePaymentMethodStore } from "@/modules/finance/paymentMethodStore";
import { todayStamp } from "@/modules/finance/transactionStore";
import { useVehicleExpenseStore, type VehicleExpense } from "./vehicleExpenseStore";
import type { Vehicle } from "./types";
import { fmtPrice } from "./vehiclesUi";

type ExpenseDraft = {
  amount: string;
  paymentMethodId: string;
  date: string;
  odometer: string;
  notes: string;
};

function emptyDraft(): ExpenseDraft {
  return { amount: "", paymentMethodId: "", date: todayStamp(), odometer: "", notes: "" };
}

function draftFromExpense(expense: VehicleExpense): ExpenseDraft {
  return {
    amount: String(expense.amount),
    paymentMethodId: expense.paymentMethodId,
    date: expense.date,
    odometer: expense.odometer ? String(expense.odometer) : "",
    notes: expense.notes ?? "",
  };
}

const kindLabel: Record<VehicleExpense["type"], string> = { fuel: "Fuel charge", toll: "Toll charge" };

export function FuelChargeModal({
  open,
  onClose,
  vehicle,
  kind,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  kind: "fuel" | "toll";
  editing: VehicleExpense | null;
}) {
  const methods = usePaymentMethodStore((s) => s.methods);
  const addExpense = useVehicleExpenseStore((s) => s.addExpense);
  const updateExpense = useVehicleExpenseStore((s) => s.updateExpense);
  const [draft, setDraft] = useState<ExpenseDraft>(emptyDraft());
  const activeKind = editing ? editing.type : kind;

  const key = `${open}-${editing?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState("");
  if (key !== lastKey) {
    setLastKey(key);
    setDraft(editing ? draftFromExpense(editing) : { ...emptyDraft(), paymentMethodId: methods[0]?.id ?? "" });
  }

  function save() {
    const amount = Number(draft.amount);
    if (!amount || amount <= 0) {
      notify("warning", "ENTER AMOUNT", "Enter a positive charge amount.");
      return;
    }
    if (!draft.paymentMethodId) {
      notify("warning", "PAYMENT METHOD", "Choose a payment method.");
      return;
    }
    const base = {
      amount,
      paymentMethodId: draft.paymentMethodId,
      date: draft.date,
      odometer: draft.odometer ? Number(draft.odometer) || null : null,
      notes: draft.notes.trim(),
    };
    if (editing) {
      updateExpense(editing.id, { ...base });
      notify("success", "CHARGE UPDATED", `${kindLabel[activeKind]} for ${vehicle.name} saved.`);
    } else {
      addExpense({ ...base, vehicleId: vehicle.id, type: activeKind, vehicleName: vehicle.name });
      notify("success", "CHARGE RECORDED", `${kindLabel[activeKind]} for ${vehicle.name} added to the ledger.`);
    }
    onClose();
  }

  return (
    <HudModal
      open={open}
      title={editing ? `Edit ${kindLabel[activeKind].toLowerCase()} — ${vehicle.name}` : `${kindLabel[activeKind]} — ${vehicle.name}`}
      size="md"
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyInput label="Amount (₹)" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0" />
        <HudSelect label="Payment method" value={draft.paymentMethodId} onChange={(e) => setDraft({ ...draft, paymentMethodId: e.target.value })}>
          <option value="">Select…</option>
          {methods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name} · {method.detail}
            </option>
          ))}
        </HudSelect>
        <HudDatePicker label="Date" value={draft.date || null} onChange={(value) => setDraft({ ...draft, date: value ?? "" })} />
        <HudInput label="Odometer reading" type="number" value={draft.odometer} onChange={(e) => setDraft({ ...draft, odometer: e.target.value })} placeholder={String(vehicle.currentOdometer) || "km"} />
        <div className="md:col-span-2">
          <HudInput label="Notes (optional)" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Fuel brand, toll route, trip…" />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <HudButton variant="ghost" onClick={onClose}>Cancel</HudButton>
        <HudButton onClick={save}>{editing ? "Save changes" : "Save charge"}</HudButton>
      </div>
    </HudModal>
  );
}

// ── Expense list (used in the vehicle detail panel) ─────────
export function VehicleExpenseList({ vehicle, onEdit, onAdd }: { vehicle: Vehicle; onEdit: (expense: VehicleExpense) => void; onAdd: () => void }) {
  const all = useVehicleExpenseStore((s) => s.expenses);
  const deleteExpense = useVehicleExpenseStore((s) => s.deleteExpense);
  const methods = usePaymentMethodStore((s) => s.methods);
  const expenses = all
    .filter((e) => e.vehicleId === vehicle.id)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  if (expenses.length === 0) {
    return (
      <div className="border border-dashed border-[color:var(--border)] px-4 py-6 text-center">
        <div className="font-display text-[9px] tracking-[0.24em] text-[color:var(--accent)] uppercase">No entries yet</div>
        <p className="mt-1.5 text-xs text-text-secondary">Record fuel purchases (and tolls for cars) here — each charge mirrors into the finance ledger.</p>
        <HudButton variant="ghost" className="mt-3" onClick={onAdd}>Add charge</HudButton>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => (
        <div key={expense.id} className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-2 last:border-0 last:pb-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-text-primary">
              <span className={`rounded px-1.5 py-0.5 font-display text-[9px] tracking-[0.14em] uppercase ${expense.type === "fuel" ? "bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-[color:var(--accent)]" : "bg-[color:color-mix(in_srgb,var(--warning)_14%,transparent)] text-[color:var(--warning)]"}`}>
                {expense.type}
              </span>
              {fmtPrice(expense.amount)}
            </div>
            <div className="mt-0.5 text-xs text-text-muted">
              {expense.date}
              {expense.odometer ? ` · ${expense.odometer.toLocaleString("en-IN")} km` : ""}
              {expense.paymentMethodId ? ` · ${methods.find((m) => m.id === expense.paymentMethodId)?.name ?? "—"}` : ""}
              {expense.notes ? ` · ${expense.notes}` : ""}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <HudButton variant="ghost" className="!min-h-0 px-1.5 py-0.5" aria-label="Edit charge" onClick={() => onEdit(expense)}><Pencil size={12} /></HudButton>
            <HudButton variant="ghost" className="!min-h-0 px-1.5 py-0.5 text-[color:var(--danger)]" aria-label="Delete charge" onClick={() => { deleteExpense(expense.id); notify("success", "CHARGE DELETED", "The linked ledger transaction was removed too."); }}><Trash2 size={12} /></HudButton>
          </div>
        </div>
      ))}
    </div>
  );
}