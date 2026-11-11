import { formatDate, formatHourTick } from "@/utils/format";

export const HOUR = 3_600_000;

// Chart palette. Mirrors the --bp-chart-* / --bp-sev1 tokens in src/index.css
// (SVG presentation attributes can't reliably read CSS variables).
export const INK = "#0f1b2d"; // --bp-chart-actual: actual line (navy)
export const EXPECTED = "#3b82f6"; // --bp-chart-expected: dashed expected line (blue-500)
export const BAND = "#dbeafe"; // --bp-chart-band: expected band fill (blue-100)
export const ALERT_FILL = "#fef2f2"; // --bp-chart-alert-fill: alert window (red-50)
export const ALERT_LINE = "#fca5a5"; // --bp-chart-alert-line: alert window border (red-300)
export const ALERT = "#dc2626"; // --bp-sev1: actual line inside the alert window
export const SECONDARY = "#64748b"; // slate-500: axis labels
export const MUTED = "#94a3b8"; // slate-400: hover cursor
export const GRID = "#e2e8f0"; // slate-200: grid lines

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
