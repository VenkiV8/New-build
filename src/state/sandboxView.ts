// Pure view helpers for the Rule Sandbox. No React here.
import type { BacktestResult } from "@/lib/types";

export interface DayBucket {
  /** local midnight of the day */
  ts: number;
  count: number;
}

function midnight(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Firings per calendar day for the `days` days ending at `endTs`, including
 * zero days (backtestRule's perDay omits them), oldest first.
 */
export function firingsByDay(firings: BacktestResult["firings"], endTs: number, days = 30): DayBucket[] {
  const buckets: DayBucket[] = [];
  const index = new Map<number, DayBucket>();
  const last = new Date(midnight(endTs));
  for (let k = days - 1; k >= 0; k--) {
    const d = new Date(last);
    d.setDate(d.getDate() - k);
    const bucket = { ts: d.getTime(), count: 0 };
    buckets.push(bucket);
    index.set(bucket.ts, bucket);
  }
  for (const f of firings) {
    const b = index.get(midnight(f.ts));
    if (b) b.count++;
  }
  return buckets;
}
