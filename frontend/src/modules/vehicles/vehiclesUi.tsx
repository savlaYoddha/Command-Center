import { Bike, Box, Car } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HudButton } from "@/components/hud/HudButton";
import { HudDatePicker } from "@/components/hud/HudDatePicker";
import { HudInput } from "@/components/hud/HudInput";
import { HudSelect } from "@/components/hud/HudSelect";
import { HudTextarea } from "@/components/hud/HudTextarea";
import { CurrencyInput, NumberInput } from "@/components/ui";
import { useLoanStore } from "@/modules/finance/loans/loanStore";
import { formatINR } from "@/utils/format";
import type { Vehicle, VehicleInput, VehicleKind } from "./types";

export const KIND_LABELS: Record<VehicleKind, string> = {
  car: "CAR",
  motorcycle: "MOTORCYCLE",
  scooter: "SCOOTER",
  other: "OTHER",
};

export const KIND_COLORS: Record<VehicleKind, string> = {
  car: "var(--accent)",
  motorcycle: "var(--accent-secondary)",
  scooter: "var(--success)",
  other: "var(--text-muted)",
};

export const KIND_ICONS: Record<VehicleKind, LucideIcon> = {
  car: Car,
  motorcycle: Bike,
  scooter: Bike,
  other: Box,
};

const FUEL_OPTIONS = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG", "Other"];
const TRANSMISSION_OPTIONS = ["Manual", "Automatic", "AMT", "DCT", "CVT", "Other"];

export function emptyForm(): VehicleInput {
  return {
    name: "",
    kind: "car",
    make: "",
    model: "",
    variant: "",
    year: null,
    registrationNumber: "",
    vin: "",
    engineNumber: "",
    fuelType: "",
    transmission: "",
    color: "",
    loanId: null,
    frontTyre: "",
    rearTyre: "",
    purchaseDate: null,
    purchasePrice: null,
    currentOdometer: 0,
    currentValue: null,
    notes: "",
  };
}

export function vehicleToForm(vehicle: Vehicle): VehicleInput {
  return {
    name: vehicle.name,
    kind: vehicle.kind,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    registrationNumber: vehicle.registrationNumber,
    vin: vehicle.vin,
    engineNumber: vehicle.engineNumber,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    color: vehicle.color,
    loanId: vehicle.loanId,
    frontTyre: vehicle.frontTyre,
    rearTyre: vehicle.rearTyre,
    purchaseDate: vehicle.purchaseDate,
    purchasePrice: vehicle.purchasePrice,
    currentOdometer: vehicle.currentOdometer,
    currentValue: vehicle.currentValue,
    notes: vehicle.notes,
  };
}

export function fmtPrice(val: number | null): string {
  if (val == null) return "—";
  return formatINR(val);
}

export function fmtOdometer(val: number): string {
  if (!val) return "0 km";
  return `${val.toLocaleString("en-IN")} km`;
}

export function CardCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-display text-[9px] tracking-[0.16em] text-text-muted uppercase">{label}</div>
      <div className="mt-0.5 truncate text-xs text-text-primary">{value}</div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">{label}</span>
      <span className="text-right text-sm text-text-primary">{value}</span>
    </div>
  );
}

export function ArchivedTag() {
  return (
    <div className="absolute right-2 top-2 border border-[color:var(--border)] bg-[color:var(--bg-primary)]/90 px-2 py-0.5 font-display text-[9px] tracking-[0.18em] text-text-muted uppercase">
      Archived
    </div>
  );
}

export function VehicleForm({
  values,
  onChange,
  onSave,
  saving,
}: {
  values: VehicleInput;
  onChange: (patch: Partial<VehicleInput>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const loans = useLoanStore((s) => s.loans);
  return (
    <div className="space-y-4">
      <HudInput
        label="Vehicle Name *"
        value={values.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="e.g. My Car"
      />
      <div className="grid grid-cols-2 gap-3">
        <HudSelect
          label="Type"
          value={values.kind}
          onChange={(e) => {
            const kind = e.target.value as VehicleKind;
            onChange(kind !== "car" && values.transmission ? { kind, transmission: "" } : { kind });
          }}
        >
          <option value="car">Car</option>
          <option value="motorcycle">Motorcycle</option>
          <option value="scooter">Scooter</option>
          <option value="other">Other</option>
        </HudSelect>
        <NumberInput
          label="Year"
          min={1900}
          max={2100}
          value={values.year ?? ""}
          onChange={(e) => onChange({ year: e.target.value ? Number(e.target.value) : null })}
          placeholder="2024"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <HudInput
          label="Make"
          value={values.make}
          onChange={(e) => onChange({ make: e.target.value })}
          placeholder="e.g. Toyota"
        />
        <HudInput
          label="Model"
          value={values.model}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder="e.g. Innova"
        />
      </div>
      <HudInput
        label="Variant"
        value={values.variant}
        onChange={(e) => onChange({ variant: e.target.value })}
        placeholder="e.g. Crysta"
      />
      <div className="grid grid-cols-2 gap-3">
        <HudInput
          label="Registration No."
          value={values.registrationNumber}
          onChange={(e) => onChange({ registrationNumber: e.target.value })}
          placeholder="MH 02 AB 1234"
        />
        <HudInput
          label="Color"
          value={values.color}
          onChange={(e) => onChange({ color: e.target.value })}
          placeholder="e.g. White"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <HudSelect
          label="Fuel Type"
          value={values.fuelType}
          onChange={(e) => onChange({ fuelType: e.target.value })}
        >
          <option value="">Select fuel type</option>
          {FUEL_OPTIONS.map((fuel) => (
            <option key={fuel} value={fuel}>
              {fuel}
            </option>
          ))}
        </HudSelect>
        {values.kind === "car" ? (
          <HudSelect
            label="Transmission"
            value={values.transmission}
            onChange={(e) => onChange({ transmission: e.target.value })}
          >
            <option value="">Select transmission</option>
            {TRANSMISSION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </HudSelect>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <HudInput
          label="VIN / Chassis No."
          value={values.vin}
          onChange={(e) => onChange({ vin: e.target.value })}
          placeholder="Optional"
        />
        <HudInput
          label="Engine No."
          value={values.engineNumber}
          onChange={(e) => onChange({ engineNumber: e.target.value })}
          placeholder="Optional"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <HudInput
          label="Front Tyre"
          value={values.frontTyre}
          onChange={(e) => onChange({ frontTyre: e.target.value })}
          placeholder="e.g. 215/55 R17"
        />
        <HudInput
          label="Rear Tyre"
          value={values.rearTyre}
          onChange={(e) => onChange({ rearTyre: e.target.value })}
          placeholder="e.g. 205/60 R16"
        />
      </div>
      <HudSelect
        label="Linked Loan"
        value={values.loanId ?? ""}
        onChange={(e) => onChange({ loanId: e.target.value || null })}
      >
        <option value="">No linked loan</option>
        {loans.map((loan) => (
          <option key={loan.id} value={loan.id}>
            {`${loan.loanId} · ${loan.name}`}
          </option>
        ))}
      </HudSelect>
      <div className="grid grid-cols-2 gap-3">
        <CurrencyInput
          label="Purchase Price"
          value={values.purchasePrice ?? ""}
          onChange={(e) => onChange({ purchasePrice: e.target.value ? Number(e.target.value) : null })}
          placeholder="Optional"
        />
        <CurrencyInput
          label="Current Value"
          value={values.currentValue ?? ""}
          onChange={(e) => onChange({ currentValue: e.target.value ? Number(e.target.value) : null })}
          placeholder="Optional"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="Odometer (km)"
          min={0}
          value={values.currentOdometer ?? 0}
          onChange={(e) => onChange({ currentOdometer: Number(e.target.value) || 0 })}
        />
        <HudDatePicker
          label="Purchase Date"
          value={values.purchaseDate ?? null}
          onChange={(v) => onChange({ purchaseDate: v })}
        />
      </div>
      <HudTextarea
        label="Notes"
        rows={3}
        value={values.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Optional notes about this vehicle..."
      />
      <div className="flex justify-end pt-2">
        <HudButton onClick={onSave} disabled={saving || !values.name.trim()}>
          {saving ? "SAVING..." : "SAVE VEHICLE"}
        </HudButton>
      </div>
    </div>
  );
}