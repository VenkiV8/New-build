// Pure view helpers for the Incident Inbox. No React here.
import type { Alert, CampaignHistory } from "@/lib/types";

/** Global guardrail from SPEC: at most 5 alerts/day per advertiser page you. */
export const ALERT_BUDGET = 5;

const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;

/**
 * Split alerts by the alert budget: the top 5 by ₹ at risk page the advertiser,
 * the lowest-₹ remainder folds into the daily digest.
 */
export function splitByAlertBudget(alerts: Alert[]): { paged: Alert[]; digest: Alert[] } {
  const sorted = [...alerts].sort((a, b) => b.inrAtRiskTotal - a.inrAtRiskTotal);
  return { paged: sorted.slice(0, ALERT_BUDGET), digest: sorted.slice(ALERT_BUDGET) };
}

/** End of the most recent data hour (the "now" the demo data is anchored to). */
export function dataEnd(history: CampaignHistory): number {
  let last = 0;
  for (const series of Object.values(history)) {
    const ts = series[series.length - 1]?.ts ?? 0;
    if (ts > last) last = ts;
  }
  return last + HOUR;
}

/** ₹ at risk caught by incidents that started in the 7 days before `now`. */
export function protectedThisWeek(alerts: Alert[], now: number): number {
  return alerts
    .filter((a) => a.startedAt >= now - WEEK)
    .reduce((sum, a) => sum + a.inrAtRiskTotal, 0);
}

/** Compact relative time, e.g. "just now", "4h ago", "2d ago". */
export function timeAgo(ts: number, now: number): string {
  const hours = Math.floor((now - ts) / HOUR);
  if (hours < 1) return "just now";
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
