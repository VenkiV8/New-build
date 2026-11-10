const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹ amount for display, e.g. formatInr(1340) → "₹1,340". */
export function formatInr(amount: number): string {
  return inrFormatter.format(Math.round(amount));
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/** Clock time for display, e.g. "8:00 PM". */
export function formatClockTime(ts: number): string {
  return timeFormatter.format(ts);
}
