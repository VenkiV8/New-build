// Pure view helpers for the Incident Inbox. No React here.
import { demoNow } from "@/lib/dataGenerator";
import type { Alert, AlertStatus } from "@/lib/types";

/** Global guardrail from SPEC: at most 5 alerts/day per advertiser page you. */
export const ALERT_BUDGET = 5;

const HOUR = 3_600_000;

/**
 * Split alerts by the alert budget: the top 5 by ₹ at risk page the advertiser,
 * the lowest-₹ remainder folds into the daily digest.
 */
export function splitByAlertBudget(alerts: Alert[]): { paged: Alert[]; digest: Alert[] } {
  const sorted = [...alerts].sort((a, b) => b.inrAtRiskTotal - a.inrAtRiskTotal);
  return { paged: sorted.slice(0, ALERT_BUDGET), digest: sorted.slice(ALERT_BUDGET) };
}

const SETTLED: AlertStatus[] = ["RESOLVED", "EXPECTED", "SNOOZED"];

/** Inbox order: Open (and Acked) first, then Resolved/Expected/Snoozed; ₹ at risk desc within each group. */
export function sortForInbox(alerts: Alert[], statuses: Record<string, AlertStatus>): Alert[] {
  const settled = (a: Alert) => (SETTLED.includes(statuses[a.id] ?? "OPEN") ? 1 : 0);
  return [...alerts].sort((a, b) => settled(a) - settled(b) || b.inrAtRiskTotal - a.inrAtRiskTotal);
}

/**
 * The incident the "Try this" strip should open: the last injected alert if it is
 * still open, otherwise the open alert with the latest onset; null if none open.
 */
export function mostRecentOpen(
  alerts: Alert[],
  statuses: Record<string, AlertStatus>,
  preferId: string | null,
): Alert | null {
  const open = alerts.filter((a) => (statuses[a.id] ?? "OPEN") === "OPEN");
  const preferred = preferId ? open.find((a) => a.id === preferId) : undefined;
  if (preferred) return preferred;
  return open.reduce<Alert | null>((best, a) => (!best || a.startedAt > best.startedAt ? a : best), null);
}

/**
 * Health-chip summary that reflects live rule toggles:
 * no rules off → the eligibility summary; rules off → "1 rule off" (appended
 * after the fallback summary when the campaign also has fallback gates).
 */
export function healthSummary(eligibilitySummary: string, hasFallback: boolean, rulesOff: number): string {
  if (rulesOff === 0) return eligibilitySummary;
  const off = `${rulesOff} rule${rulesOff === 1 ? "" : "s"} off`;
  return hasFallback ? `${eligibilitySummary} · ${off}` : off;
}

/**
 * "started Xh ago" for an alert: measured from the END of the last data hour
 * (demoNow() is the start of the 8 PM hour, so the end is demoNow() + 1h).
 * This matches the headline durations, e.g. "0 for 4h" → "started 4h ago".
 */
export function startedAgo(startedAt: number): string {
  return timeAgo(startedAt, demoNow() + HOUR);
}

/** Compact relative time, e.g. "just now", "4h ago", "2d ago". */
export function timeAgo(ts: number, now: number): string {
  const hours = Math.floor((now - ts) / HOUR);
  if (hours < 1) return "just now";
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
