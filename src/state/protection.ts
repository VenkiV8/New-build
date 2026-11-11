// Pure helpers for "At risk now" and "Protected this session". No React here.
import type { Alert, AlertStatus } from "@/lib/types";

/**
 * Status an action moves an alert to. Snoozing or marking expected defers the
 * problem; every other action (Pause, Cap budget, Open tracking checklist, Fix
 * billing…) is a fix, so the alert is resolved.
 */
export function statusForAction(action: string): AlertStatus {
  const a = action.toLowerCase();
  if (a.startsWith("snooze")) return "SNOOZED";
  if (a.startsWith("mark expected") || a.startsWith("ignore")) return "EXPECTED";
  return "RESOLVED";
}

/**
 * Action buttons for an alert: its suggested actions (first = primary), plus
 * Snooze 24h and Mark expected when the class doesn't already offer them.
 */
export function actionsFor(alert: Alert): string[] {
  const actions = [...alert.suggestedActions];
  const has = (s: AlertStatus) => actions.some((a) => statusForAction(a) === s && !a.toLowerCase().startsWith("ignore"));
  if (!has("SNOOZED")) actions.push("Snooze 24h");
  if (!has("EXPECTED")) actions.push("Mark expected");
  return actions;
}

/** Rest-of-day exposure avoided by fixing an alert: ₹/h at risk × 24. */
export function exposureStopped(alert: Alert): number {
  return Math.round(alert.inrAtRiskPerHour * 24);
}

/** ₹ at risk across OPEN alerts (alerts with no status entry are OPEN). */
export function atRiskNow(
  alerts: Alert[],
  statuses: Record<string, AlertStatus>,
): { totalInr: number; openCount: number } {
  const open = alerts.filter((a) => (statuses[a.id] ?? "OPEN") === "OPEN");
  return { totalInr: open.reduce((s, a) => s + a.inrAtRiskTotal, 0), openCount: open.length };
}
