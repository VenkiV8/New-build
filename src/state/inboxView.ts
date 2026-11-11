// Pure view helpers for the Incident Inbox. No React here.
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

/** Compact relative time, e.g. "just now", "4h ago", "2d ago". */
export function timeAgo(ts: number, now: number): string {
  const hours = Math.floor((now - ts) / HOUR);
  if (hours < 1) return "just now";
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
