import { istParts } from "@/lib/dataGenerator";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹ amount for display, e.g. formatInr(1340) → "₹1,340". */
export function formatInr(amount: number): string {
  return inrFormatter.format(Math.round(amount));
}

// All dates/times are shown in IST, never the viewer's local zone: the demo
// clock is fixed at demoNow() (Tue 10 Nov 2026, 8:00 PM IST).
export const DEMO_TIME_ZONE = "Asia/Kolkata";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: DEMO_TIME_ZONE,
});

/** Clock time in IST, e.g. "8:00 PM". */
export function formatClockTime(ts: number): string {
  return timeFormatter.format(ts);
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: DEMO_TIME_ZONE,
});

/** Short date in IST, e.g. "Tue, 10 Nov". */
export function formatDate(ts: number): string {
  return dateFormatter.format(ts);
}

/** Short date + time in IST, e.g. "Tue, 10 Nov, 4:00 PM". */
export function formatDateTime(ts: number): string {
  return `${formatDate(ts)}, ${formatClockTime(ts)}`;
}

/** Hour tick label for charts in IST, e.g. "4 PM". */
export function formatHourTick(ts: number): string {
  const h = istParts(ts).hours;
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
