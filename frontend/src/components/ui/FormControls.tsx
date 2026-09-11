import { useId, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { HudDatePicker } from "@/components/hud/HudDatePicker";
import { HudInput } from "@/components/hud/HudInput";
import { HudSelect } from "@/components/hud/HudSelect";
import { HudTextarea } from "@/components/hud/HudTextarea";

const fieldLabel = "font-display text-[10px] tracking-[0.22em] text-text-muted uppercase";
const fieldError = "text-xs text-[color:var(--danger)]";
const controlFocus =
  "focus-visible:border-[color:var(--accent)] focus-visible:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_55%,transparent)]";

type FieldProps = {
  label?: string;
  help?: string;
  error?: string;
};

type CheckboxControlProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

function CheckboxVisual({ checked }: { checked: boolean }) {
  return (
    <span
      className={`relative inline-flex h-4 w-4 shrink-0 items-center justify-center border transition-all duration-[var(--anim)] ${
        checked
          ? "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_14%,var(--input-bg))] shadow-[0_0_6px_color-mix(in_srgb,var(--accent)_35%,transparent)]"
          : "border-[color:var(--border)] bg-[color:var(--input-bg)]"
      }`}
      aria-hidden
    >
      <Check
        size={11}
        strokeWidth={3}
        className={`text-[color:var(--accent)] transition-opacity duration-[var(--anim)] ${checked ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}

export function CheckboxControl({
  checked,
  defaultChecked,
  onChange,
  disabled,
  id,
  "aria-label": ariaLabel,
  className = "",
}: CheckboxControlProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const [internal, setInternal] = useState(Boolean(defaultChecked));
  const isChecked = checked !== undefined ? checked : internal;

  function toggle() {
    if (disabled) return;
    const next = !isChecked;
    if (checked === undefined) setInternal(next);
    onChange?.(next, { target: { checked: next } } as ChangeEvent<HTMLInputElement>);
  }

  return (
    <button
      id={controlId}
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`inline-flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 outline-none transition-opacity duration-[var(--anim)] hover:opacity-90 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 ${controlFocus} ${className}`}
      onClick={toggle}
    >
      <CheckboxVisual checked={isChecked} />
    </button>
  );
}

export function Checkbox({
  label,
  help,
  error,
  className = "",
  id,
  checked,
  defaultChecked,
  onChange,
  disabled,
}: FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  }) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const [internal, setInternal] = useState(Boolean(defaultChecked));
  const isChecked = checked !== undefined ? checked : internal;

  function toggle() {
    if (disabled) return;
    const next = !isChecked;
    if (checked === undefined) setInternal(next);
    onChange?.({ target: { checked: next } } as ChangeEvent<HTMLInputElement>);
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <button
        id={controlId}
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        aria-label={label}
        disabled={disabled}
        className={`inline-flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left outline-none transition-opacity duration-[var(--anim)] hover:opacity-90 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 ${controlFocus}`}
        onClick={toggle}
      >
        <CheckboxVisual checked={isChecked} />
        {label ? <span className={`${fieldLabel} text-text-primary`}>{label}</span> : null}
      </button>
      {help ? <span className="text-xs text-text-muted">{help}</span> : null}
      {error ? <span className={fieldError}>{error}</span> : null}
    </div>
  );
}

export function Switch({
  label,
  help,
  error,
  checked,
  onChange,
  disabled,
}: FieldProps & { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="inline-flex cursor-pointer items-center gap-3">
        {label ? <span className={`${fieldLabel} whitespace-nowrap`}>{label}</span> : null}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label ?? "Toggle"}
          disabled={disabled}
          className={`flex h-6 w-14 shrink-0 items-center overflow-hidden border px-0.5 transition-all duration-[var(--anim)] outline-none ${controlFocus} ${
            checked
              ? "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_22%,var(--input-bg))] shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_35%,transparent)]"
              : "border-[color:var(--border)] bg-[color:var(--input-bg)]"
          } disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={() => onChange(!checked)}
        >
          <span
            className={`h-4 w-4 shrink-0 transition-all duration-[var(--anim)] ${
              checked
                ? "ml-auto bg-[color:var(--accent)] shadow-[0_0_6px_color-mix(in_srgb,var(--accent)_60%,transparent)]"
                : "ml-0 bg-[color:var(--text-muted)]"
            }`}
            aria-hidden
          />
        </button>
      </label>
      {help ? <span className="text-xs text-text-muted">{help}</span> : null}
      {error ? <span className={fieldError}>{error}</span> : null}
    </div>
  );
}

export function RadioGroup({
  label,
  name,
  value,
  options,
  onChange,
  error,
}: FieldProps & {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      {label ? <legend className={fieldLabel}>{label}</legend> : null}
      <div className="space-y-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          const optionId = `${name}-${opt.value}`;
          return (
            <label key={opt.value} htmlFor={optionId} className="group flex cursor-pointer items-center gap-2.5">
              <span
                className={`relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-[var(--anim)] group-hover:border-[color:var(--accent)] group-has-[:checked]:border-[color:var(--accent)] group-has-[:focus-visible]:border-[color:var(--accent)] group-has-[:focus-visible]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_55%,transparent)] ${
                  selected ? "border-[color:var(--accent)]" : "border-[color:var(--border)] bg-[color:var(--input-bg)]"
                }`}
              >
                <input
                  id={optionId}
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={selected}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                />
                <span
                  className={`h-2 w-2 rounded-full bg-[color:var(--accent)] transition-all duration-[var(--anim)] ${
                    selected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  }`}
                  aria-hidden
                />
              </span>
              <span className="text-sm text-text-primary">{opt.label}</span>
            </label>
          );
        })}
      </div>
      {error ? <span className={fieldError}>{error}</span> : null}
    </fieldset>
  );
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  help,
  error,
}: FieldProps & {
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {label ? <div className={fieldLabel}>{label}</div> : null}
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              className={`border px-2 py-1 text-xs ${active ? "border-[color:var(--accent)] text-[color:var(--accent)]" : "border-[color:var(--border)] text-text-muted"}`}
              onClick={() => onChange(active ? value.filter((v) => v !== opt.value) : [...value, opt.value])}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {help ? <span className="text-xs text-text-muted">{help}</span> : null}
      {error ? <span className={fieldError}>{error}</span> : null}
    </div>
  );
}

export function NumberInput({ className = "", ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return <HudInput type="number" className={`cc-number-input ${className}`} {...props} />;
}

export function CurrencyInput({ currency = "₹", className = "", ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement> & { currency?: string }) {
  return (
    <label className="block space-y-1">
      {props.label ? <span className={fieldLabel}>{props.label}</span> : null}
      <div className="flex border border-[color:var(--border)] bg-[color:var(--input-bg)] focus-within:border-[color:var(--focus)]">
        <span className="flex items-center px-3 font-display text-[10px] tracking-[0.14em] text-text-muted">{currency}</span>
        <input
          type="number"
          className={`cc-number-input w-full bg-transparent px-2 py-2 text-sm outline-none ${className}`}
          style={{ minHeight: "var(--cc-control-height)" }}
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
          placeholder={props.placeholder}
        />
      </div>
      {props.help ? <span className="text-xs text-text-muted">{props.help}</span> : null}
      {props.error ? <span className={fieldError}>{props.error}</span> : null}
    </label>
  );
}

export function DateRangePicker({
  label,
  from,
  to,
  onFromChange,
  onToChange,
  error,
}: FieldProps & { from: string; to: string; onFromChange: (v: string) => void; onToChange: (v: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <HudDatePicker label={label ? `${label} from` : "From"} value={from || null} onChange={(v) => onFromChange(v ?? "")} />
      <HudDatePicker label="To" value={to || null} onChange={(v) => onToChange(v ?? "")} />
      {error ? <span className={`sm:col-span-2 ${fieldError}`}>{error}</span> : null}
    </div>
  );
}

export function FormField({ label, help, error, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className="space-y-1">
      {label ? <div className={fieldLabel}>{label}</div> : null}
      {children}
      {help ? <div className="text-xs text-text-muted">{help}</div> : null}
      {error ? <div className={fieldError}>{error}</div> : null}
    </div>
  );
}

export function Slider({
  label,
  help,
  error,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  showValue = true,
  formatValue = (v) => String(v),
  disabled,
}: FieldProps & {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {label ? <span className={fieldLabel}>{label}</span> : null}
        {showValue ? (
          <span className="font-display text-sm tracking-[0.12em] text-[color:var(--accent)]">{formatValue(value)}</span>
        ) : null}
      </div>
      <input
        type="range"
        className={`cc-hud-slider cc-hud-slider-lg w-full ${disabled ? "opacity-40" : ""}`}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      />
      {help ? <span className="mt-1 block text-sm text-text-secondary">{help}</span> : null}
      {error ? <span className={fieldError}>{error}</span> : null}
    </div>
  );
}

export { HudInput as Input, HudSelect as Select, HudTextarea as Textarea };
