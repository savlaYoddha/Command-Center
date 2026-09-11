import { CommandPanel } from "./CommandPanel";
import { DataReadout } from "./DataReadout";

type Props = {
  value: string | number;
  label: string;
  unit?: string;
};

export function MetricCard({ value, label, unit }: Props) {
  return (
    <CommandPanel className="p-4">
      <DataReadout value={value} label={label} unit={unit} />
    </CommandPanel>
  );
}
