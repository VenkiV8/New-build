// Pure helpers for the demo "Inject" controls. No React here.
import { injectIncident } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import type { Alert, CampaignHistory, IncidentInjection, RuleConfig } from "@/lib/types";

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

/** Targets (in preference order) that do not already have an incident of this class. */
export function freeTargets(failureClass: InjectableClass, alerts: Alert[]): string[] {
  return INJECTION_TARGETS[failureClass].filter(
    (cid) => !alerts.some((a) => a.campaignId === cid && a.failureClass === failureClass),
  );
}

/** First free target as an injection, or null when every target already has one. */
export function pickInjection(failureClass: InjectableClass, alerts: Alert[]): IncidentInjection | null {
  const [campaignId] = freeTargets(failureClass, alerts);
  return campaignId ? { campaignId, failureClass, hours: INJECTION_HOURS[failureClass] } : null;
}

/** Alerts present in `after` whose ids were not in `before`. */
export function newAlerts(before: Alert[], after: Alert[]): Alert[] {
  const seen = new Set(before.map((a) => a.id));
  return after.filter((a) => !seen.has(a.id));
}

export type InjectionPlan =
  | { kind: "ok"; injection: IncidentInjection; history: CampaignHistory; alerts: Alert[]; added: Alert }
  /** every target already has an incident of this class */
  | { kind: "allOpen"; targets: string[] }
  /** free targets exist, but injecting would not trip the detector on any of them right now */
  | { kind: "noSignal"; targets: string[] };

/**
 * Decide an injection WITHOUT touching live data: try each free target in order
 * on a copy and take the first one that produces a new alert of this class.
 * (E.g. a seeded CTR drift on c3 halves its spend, so a spend surge there stays
 * under the threshold; the plan then moves on to c2.)
 */
export function planInjection(
  failureClass: InjectableClass,
  history: CampaignHistory,
  alerts: Alert[],
  rules: RuleConfig[],
): InjectionPlan {
  const targets = freeTargets(failureClass, alerts);
  if (targets.length === 0) return { kind: "allOpen", targets: INJECTION_TARGETS[failureClass] };
  for (const campaignId of targets) {
    const injection = { campaignId, failureClass, hours: INJECTION_HOURS[failureClass] };
    const nextHistory = injectIncident(history, injection);
    const nextAlerts = detectAll(nextHistory, { rules });
    const added = newAlerts(alerts, nextAlerts).find(
      (a) => a.failureClass === failureClass && a.campaignId === campaignId,
    );
    if (added) return { kind: "ok", injection, history: nextHistory, alerts: nextAlerts, added };
  }
  return { kind: "noSignal", targets };
}
