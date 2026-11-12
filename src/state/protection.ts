// Pure helpers for "At risk now" and "Protected this session". No React here.
import { CAMPAIGNS, demoNow, istParts } from "@/lib/dataGenerator";
import type { Alert, AlertStatus } from "@/lib/types";

export const TRACKING_CHECKLIST_ACTION = "Open tracking checklist";
export const MARK_FIXED_ACTION = "Mark fixed";

/**
 * Status an action moves an alert to. Snoozing or marking expected defers the
 * problem; opening the tracking checklist acknowledges it (the fix comes from
 * "Mark fixed" once the checklist is done); every other action (Pause, Cap
 * budget, Fix billing…) is a fix, so the alert is resolved.
 */
export function statusForAction(action: string): AlertStatus {
  const a = action.toLowerCase();
  if (a === TRACKING_CHECKLIST_ACTION.toLowerCase()) return "ACKED";
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

const HOUR = 3_600_000;

/**
 * Hours left in today (IST) after the data window. Data runs to the END of the
 * demoNow() hour (8–9 PM IST), so 24 − 21 = 3. Derived, not hard-coded.
 */
export function hoursLeftToday(): number {
  const endHour = istParts(demoNow() + HOUR).hours; // 21
  return endHour === 0 ? 24 : 24 - endHour;
}

/**
 * Exposure avoided by fixing an alert: ₹/h at risk for the rest of today,
 * capped at the campaign's daily budget.
 * min(alert.inrAtRiskPerHour × hoursLeftToday, campaign.dailyBudgetInr)
 */
export function exposureStopped(alert: Alert): number {
  const uncapped = alert.inrAtRiskPerHour * hoursLeftToday();
  const budget = CAMPAIGNS.find((c) => c.id === alert.campaignId)?.dailyBudgetInr ?? uncapped;
  return Math.round(Math.min(uncapped, budget));
}

/** Acknowledged is not fixed: OPEN and ACKED are active; RESOLVED / EXPECTED / SNOOZED are closed. */
export function isActive(status: AlertStatus | undefined): boolean {
  const s = status ?? "OPEN";
  return s === "OPEN" || s === "ACKED";
}

/**
 * ₹ at risk across ACTIVE alerts (OPEN + ACKED; no status entry = OPEN).
 * unackedCount = OPEN only, for the top-bar bell.
 */
export function atRiskNow(
  alerts: Alert[],
  statuses: Record<string, AlertStatus>,
): { totalInr: number; activeCount: number; unackedCount: number } {
  const active = alerts.filter((a) => isActive(statuses[a.id]));
  return {
    totalInr: active.reduce((s, a) => s + a.inrAtRiskTotal, 0),
    activeCount: active.length,
    unackedCount: alerts.filter((a) => (statuses[a.id] ?? "OPEN") === "OPEN").length,
  };
}

export type CampaignState = "active" | "paused" | "capped";

/** Effect of an action on the campaign itself: Pause → paused, Cap today's budget → capped. */
export function campaignStateForAction(action: string): CampaignState | null {
  const a = action.toLowerCase();
  if (a.startsWith("pause")) return "paused";
  if (a.startsWith("cap today")) return "capped";
  return null;
}

/** All campaigns active (initial / after Reset demo). */
export function allCampaignsActive(): Record<string, CampaignState> {
  return Object.fromEntries(CAMPAIGNS.map((c) => [c.id, "active" as const]));
}
