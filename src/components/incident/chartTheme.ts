import { formatDate, formatHourTick } from "@/utils/format";

export const HOUR = 3_600_000;

// Neutral ink for data, red reserved for the anomaly (status, not a series hue).
export const INK = "#1e293b"; // slate-800
export const SECONDARY = "#64748b"; // slate-500
export const MUTED = "#94a3b8"; // slate-400
export const BAND = "#cbd5e1"; // slate-300
export const GRID = "#e2e8f0"; // slate-200
export const ALERT = "#dc2626"; // red-600

export const AXIS_TICK = { fontSize: 11, fill: SECONDARY };

/** Tick positions every `every` hours, aligned to midnight (default: midnight and noon). */
export function hourTicks(points: { ts: number }[], every = 12): number[] {
  return points.filter((p) => new Date(p.ts).getHours() % every === 0).map((p) => p.ts);
}

/** Midnight ticks show the date, noon ticks the hour. */
export function xTickLabel(ts: number): string {
  return new Date(ts).getHours() === 0 ? formatDate(ts).replace(",", "") : formatHourTick(ts);
}

/** Keep `value` only inside the alert window (plus the hour before, so the red segment connects). */
export function alertOnly<T extends { anomalous: boolean }>(points: T[], value: (p: T) => number): (number | null)[] {
  return points.map((p, i) => (p.anomalous || points[i + 1]?.anomalous ? value(p) : null));
}
