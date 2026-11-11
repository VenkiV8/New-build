// Pure view helpers for the Rule Sandbox. No React here.
import { IST_OFFSET_MS } from "@/lib/dataGenerator";
import type { BacktestResult } from "@/lib/types";

const DAY = 24 * 3_600_000;

export interface DayBucket {
  /** IST midnight of the day (epoch ms) */
  ts: number;
  count: number;
}

/** Start of the IST calendar day containing `ts` (IST has no DST, so days are exactly 24h). */
export function istMidnight(ts: number): number {
  return ts - ((((ts + IST_OFFSET_MS) % DAY) + DAY) % DAY);
}

/**
 * Firings per IST calendar day for the `days` days ending at `endTs`, including
 * zero days (backtestRule's perDay omits them), oldest first.
 */
export function firingsByDay(firings: BacktestResult["firings"], endTs: number, days = 30): DayBucket[] {
  const last = istMidnight(endTs);
  const buckets: DayBucket[] = [];
  const index = new Map<number, DayBucket>();
  for (let k = days - 1; k >= 0; k--) {
    const bucket = { ts: last - k * DAY, count: 0 };
    buckets.push(bucket);
    index.set(bucket.ts, bucket);
  }
  for (const f of firings) {
    const b = index.get(istMidnight(f.ts));
    if (b) b.count++;
  }
  return buckets;
}
