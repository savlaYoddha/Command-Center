export type ChartPoint = { label: string; value: number };

export type ComparisonPoint = {
  label: string;
  income: number;
  expenses: number;
};

export type ChartState = "ready" | "loading" | "empty" | "error";

export function formatInr(value: number, compact = false): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (compact && abs >= 100000) {
    const lakhs = abs / 100000;
    return `${sign}₹${lakhs >= 10 ? lakhs.toFixed(1) : lakhs.toFixed(2)}L`;
  }
  if (compact && abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  }
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function chartTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const step = Math.ceil(max / count / 1000) * 1000 || Math.ceil(max / count);
  const ticks: number[] = [];
  for (let i = 0; i <= count; i += 1) {
    ticks.push(Math.round((step * i * max) / (step * count)));
  }
  return [...new Set(ticks)].sort((a, b) => a - b);
}

export function niceMax(values: number[]): number {
  const max = Math.max(...values, 1);
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
}
