const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inrFormatter.format(Math.round(Math.abs(value))).replace(/\u00A0/g, " ");
}

export function formatSignedINR(value: number): string {
  return value < 0 ? `-${formatINR(value)}` : `+${formatINR(value)}`;
}
