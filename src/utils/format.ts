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

const dateFormatter = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Short date, e.g. "Tue, 11 Nov". */
export function formatDate(ts: number): string {
  return dateFormatter.format(ts);
}

/** Short date + time, e.g. "Tue, 11 Nov, 4:00 PM". */
export function formatDateTime(ts: number): string {
  return `${formatDate(ts)}, ${formatClockTime(ts)}`;
}

/** Hour tick label for charts, e.g. "4 PM". */
export function formatHourTick(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
}

/** Display value for a causal-tree node or chart metric. */
export function formatMetric(value: number, unit: "inr" | "pct" | "count" | "pctPoints"): string {
  if (!Number.isFinite(value)) return "∞";
  switch (unit) {
    case "inr":
      return value < 100
        ? `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : formatInr(value);
    case "pct": // fraction → percent
      return `${(value * 100).toFixed(2)}%`;
    case "pctPoints": // already in percent
      return `${value.toFixed(2)}%`;
    case "count":
      return Math.round(value).toLocaleString("en-IN");
  }
}
