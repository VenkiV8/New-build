// Pure helpers for the demo "Inject" controls. No React here.
import type { Alert, IncidentInjection } from "@/lib/types";

export type InjectableClass = "TRACKING_BREAK" | "SPEND_RUNAWAY" | "DELIVERY_FAILURE";

/** Hours of data to corrupt per class (matches the calibrated cases in detector.test.ts). */
const INJECTION_HOURS: Record<InjectableClass, number> = {
  TRACKING_BREAK: 4,
  SPEND_RUNAWAY: 2,
  DELIVERY_FAILURE: 3,
};

/**
 * Which campaign an injection hits:
 * TRACKING_BREAK → c2 unless c2 already has a tracking break, then c1;
 * SPEND_RUNAWAY → c1; DELIVERY_FAILURE → c4.
 */
export function pickInjection(failureClass: InjectableClass, alerts: Alert[]): IncidentInjection {
  let campaignId: string;
  switch (failureClass) {
    case "TRACKING_BREAK": {
      const c2Broken = alerts.some((a) => a.campaignId === "c2" && a.failureClass === "TRACKING_BREAK");
      campaignId = c2Broken ? "c1" : "c2";
      break;
    }
    case "SPEND_RUNAWAY":
      campaignId = "c1";
      break;
    case "DELIVERY_FAILURE":
      campaignId = "c4";
      break;
  }
  return { campaignId, failureClass, hours: INJECTION_HOURS[failureClass] };
}

/** Alerts present in `after` whose ids were not in `before`. */
export function newAlerts(before: Alert[], after: Alert[]): Alert[] {
  const seen = new Set(before.map((a) => a.id));
  return after.filter((a) => !seen.has(a.id));
}
