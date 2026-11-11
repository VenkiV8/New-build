import type { FailureClass, RuleConfig } from "@/lib/types";

/** Typical channel per rule; actual routing follows severity (see Notifications). */
export const RULE_CHANNEL: Record<FailureClass, string> = {
  SPEND_RUNAWAY: "WhatsApp + push",
  TRACKING_BREAK: "WhatsApp + push",
  DRIFT: "Push + in-app",
  DELIVERY_FAILURE: "Push + in-app",
  BUDGET_EXHAUST: "Push + in-app",
};

/** Current value of the knob a rule's slider controls. */
export function sliderValueOf(rule: RuleConfig): number {
  return rule.slider.param === "madK" ? (rule.madK ?? 2) : rule.threshold;
}
