// Pure helpers for the demo "Inject" controls. No React here.
import { injectIncident } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import type { Alert, AlertStatus, CampaignHistory, IncidentInjection, RuleConfig } from "@/lib/types";
import { isActive, type CampaignState } from "./protection";

export type InjectableClass = "TRACKING_BREAK" | "SPEND_RUNAWAY" | "DELIVERY_FAILURE";

/** Hours of data to corrupt per class (matches the calibrated cases in detector.test.ts). */
const INJECTION_HOURS: Record<InjectableClass, number> = {
  TRACKING_BREAK: 4,
  SPEND_RUNAWAY: 2,
  DELIVERY_FAILURE: 3,
};

/** Campaigns each injection may target, in order of preference. */
export const INJECTION_TARGETS: Record<InjectableClass, string[]> = {
  TRACKING_BREAK: ["c2", "c1"],
  SPEND_RUNAWAY: ["c1", "c3", "c2"],
  DELIVERY_FAILURE: ["c4"],
};

/**
 * Targets (in preference order) that can take this injection: not paused, and
 * without an ACTIVE (OPEN/ACKED) incident of this class. A RESOLVED, EXPECTED or
 * SNOOZED incident does not block re-injection.
 */
export function freeTargets(
  failureClass: InjectableClass,
  alerts: Alert[],
  statuses: Record<string, AlertStatus> = {},
  campaignState: Record<string, CampaignState> = {},
): string[] {
  return INJECTION_TARGETS[failureClass].filter(
    (cid) =>
      campaignState[cid] !== "paused" &&
      !alerts.some((a) => a.campaignId === cid && a.failureClass === failureClass && isActive(statuses[a.id])),
  );
}

/** First free target as an injection, or null when none is eligible. */
export function pickInjection(
  failureClass: InjectableClass,
  alerts: Alert[],
  statuses: Record<string, AlertStatus> = {},
  campaignState: Record<string, CampaignState> = {},
): IncidentInjection | null {
  const [campaignId] = freeTargets(failureClass, alerts, statuses, campaignState);
  return campaignId ? { campaignId, failureClass, hours: INJECTION_HOURS[failureClass] } : null;
}

/** Alerts present in `after` whose ids were not in `before`. */
export function newAlerts(before: Alert[], after: Alert[]): Alert[] {
  const seen = new Set(before.map((a) => a.id));
  return after.filter((a) => !seen.has(a.id));
}

export type InjectionPlan =
  | {
      kind: "ok";
      injection: IncidentInjection;
      history: CampaignHistory;
      alerts: Alert[];
      added: Alert;
      /** true when the incident re-fired on a campaign whose earlier one was closed: reopen it */
      recurred: boolean;
    }
  /** every target is paused or already has an active incident of this class */
  | { kind: "blocked"; targets: string[] }
  /** free targets exist, but injecting would not trip the detector on any of them right now */
  | { kind: "noSignal"; targets: string[] };

/**
 * Decide an injection WITHOUT touching live data: try each eligible target in
 * order on a copy and take the first one where the detector fires for this class.
 * That is either a new alert, or (after a fix) the same incident firing again on
 * a campaign whose earlier alert was closed, which the caller reopens.
 * (E.g. a seeded CTR drift on c3 halves its spend, so a spend surge there stays
 * under the threshold; the plan then moves on to c2.)
 */
export function planInjection(
  failureClass: InjectableClass,
  history: CampaignHistory,
  alerts: Alert[],
  rules: RuleConfig[],
  statuses: Record<string, AlertStatus> = {},
  campaignState: Record<string, CampaignState> = {},
): InjectionPlan {
  const targets = freeTargets(failureClass, alerts, statuses, campaignState);
  if (targets.length === 0) return { kind: "blocked", targets: INJECTION_TARGETS[failureClass] };
  const before = new Set(alerts.map((a) => a.id));
  for (const campaignId of targets) {
    const injection = { campaignId, failureClass, hours: INJECTION_HOURS[failureClass] };
    const nextHistory = injectIncident(history, injection);
    const nextAlerts = detectAll(nextHistory, { rules });
    const fired = nextAlerts.find((a) => a.failureClass === failureClass && a.campaignId === campaignId);
    // fired + not active before = a real (new or recurring) incident; the target filter
    // already excluded campaigns with an active alert of this class.
    if (fired) {
      return {
        kind: "ok",
        injection,
        history: nextHistory,
        alerts: nextAlerts,
        added: fired,
        recurred: before.has(fired.id),
      };
    }
  }
  return { kind: "noSignal", targets };
}
