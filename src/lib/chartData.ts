// Chart data for the Incident Detail screen: actual metric vs expected band.
// Pure TS — no React. Band = seasonal median ± 2×MAD from baselineAt().

import { baselineAt } from "./detector";
import type { Alert, HourPoint } from "./types";

const HOUR = 3_600_000;

export interface BandPoint {
  ts: number;
  actual: number;
  /** seasonal median for this hour-of-week */
  expected: number;
  /** [median − 2×MAD (floored at 0), median + 2×MAD] */
  band: [number, number];
  /** inside the alert window (startedAt → last data point) */
  anomalous: boolean;
}

/** Hourly value of the metric an alert is about. CTR is returned in percent. */
export function metricAccessor(metric: Alert["metric"]): (p: HourPoint) => number {
  switch (metric) {
    case "spend":
    case "budget":
      return (p) => p.spendInr;
    case "conversions":
      return (p) => p.conversions;
    case "impressions":
      return (p) => p.impressions;
    case "ctr":
      return (p) => (p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0);
    case "cpa":
      return (p) => (p.conversions > 0 ? p.spendInr / p.conversions : 0);
  }
}

/** Hours from alert start through the last data point, inclusive (min 1). */
export function alertWindowHours(series: HourPoint[], startedAt: number): number {
  const last = series[series.length - 1]?.ts ?? startedAt;
  return Math.max(1, Math.round((last - startedAt) / HOUR) + 1);
}

/** Last `hours` points of the alert's metric with its expected band. */
export function bandSeries(
  series: HourPoint[],
  metric: Alert["metric"],
  startedAt: number,
  hours = 72,
): BandPoint[] {
  const value = metricAccessor(metric);
  const out: BandPoint[] = [];
  for (let i = Math.max(0, series.length - hours); i < series.length; i++) {
    const b = baselineAt(series, i, value);
    out.push({
      ts: series[i].ts,
      actual: value(series[i]),
      expected: b.median,
      band: [Math.max(0, b.median - 2 * b.mad), b.median + 2 * b.mad],
      anomalous: series[i].ts >= startedAt,
    });
  }
  return out;
}

/** Contiguous anomalous runs as [firstTs, lastTs] pairs, for shading. */
export function anomalousRanges(points: BandPoint[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (const p of points) {
    if (!p.anomalous) continue;
    const last = ranges[ranges.length - 1];
    if (last && p.ts - last[1] === HOUR) last[1] = p.ts;
    else ranges.push([p.ts, p.ts]);
  }
  return ranges;
}
