// Recommended action for an incident (Incident page top section). Pure TS, no React.
import type { Alert, FailureClass } from "@/lib/types";
import { actionsFor, exposureStopped } from "./protection";

/** Why the first suggested action is the right one, per failure class. */
export const RECOMMENDATION_REASON: Record<FailureClass, string> = {
  SPEND_RUNAWAY: "Stops the overspend but keeps sales running — pausing would also stop conversions.",
  TRACKING_BREAK: "Fix tracking first; pausing would hide the problem, not solve it.",
  DRIFT: "Fresh creative is the usual fix for a CTR slide at normal auction prices.",
  DELIVERY_FAILURE: "Delivery is near zero, so the cause is approval, billing or bids — not performance.",
  BUDGET_EXHAUST: "Pacing spreads the remaining budget across the hours that convert.",
};

export interface Recommendation {
  /** alert.suggestedActions[0] */
  action: string;
  /** the remaining actions, in order */
  others: string[];
  reason: string;
  /**
   * Predicted ₹ saved for the rest of today. Same helper as the Protected credit
   * (exposureStopped), so it equals what is credited once the fix lands.
   */
  savingInr: number;
}

export function recommendationFor(alert: Alert): Recommendation {
  const [action, ...others] = actionsFor(alert);
  return {
    action,
    others,
    reason: RECOMMENDATION_REASON[alert.failureClass],
    savingInr: exposureStopped(alert),
  };
}
