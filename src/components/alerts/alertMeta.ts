import { DEFAULT_RULES } from "@/lib/detector";
import type { AlertStatus, FailureClass, Severity } from "@/lib/types";

export function failureClassLabel(fc: FailureClass): string {
  return DEFAULT_RULES.find((r) => r.failureClass === fc)?.label ?? fc;
}

/** Detection latency phrase, from the rule's minHours, e.g. "caught 3h after onset". */
export function caughtAfterOnset(fc: FailureClass): string {
  const hours = DEFAULT_RULES.find((r) => r.failureClass === fc)?.minHours ?? 1;
  return `caught ${hours}h after onset`;
}

/** Severity chip: 10% tint of the severity colour, solid AA-contrast ink text. */
export const SEVERITY_STYLES: Record<Severity, string> = {
  SEV1: "bg-sev1/10 text-sev1-ink ring-sev1/30",
  SEV2: "bg-sev2/10 text-sev2-ink ring-sev2/30",
  SEV3: "bg-sev3/10 text-sev3-ink ring-sev3/30",
};

/** Severity colour for icons / marks (non-text, ≥3:1 on white). */
export const SEVERITY_TEXT: Record<Severity, string> = {
  SEV1: "text-sev1",
  SEV2: "text-sev2",
  SEV3: "text-sev3",
};

/**
 * 3px severity edge on the left of an incident card, drawn as an inset shadow
 * so it sits inside the existing border without changing the card's size.
 * Includes the card's resting / hover drop shadow (shadow-xs / shadow-sm).
 */
export const SEVERITY_EDGE: Record<Severity, string> = {
  SEV1: "shadow-[inset_3px_0_0_var(--bp-sev1),0_1px_2px_0_rgb(0_0_0/0.05)] hover:shadow-[inset_3px_0_0_var(--bp-sev1),0_1px_3px_0_rgb(0_0_0/0.1),0_1px_2px_-1px_rgb(0_0_0/0.1)]",
  SEV2: "shadow-[inset_3px_0_0_var(--bp-sev2),0_1px_2px_0_rgb(0_0_0/0.05)] hover:shadow-[inset_3px_0_0_var(--bp-sev2),0_1px_3px_0_rgb(0_0_0/0.1),0_1px_2px_-1px_rgb(0_0_0/0.1)]",
  SEV3: "shadow-[inset_3px_0_0_var(--bp-sev3),0_1px_2px_0_rgb(0_0_0/0.05)] hover:shadow-[inset_3px_0_0_var(--bp-sev3),0_1px_3px_0_rgb(0_0_0/0.1),0_1px_2px_-1px_rgb(0_0_0/0.1)]",
};

/** Status pill colours: Open blue tint, Acked slate, Resolved green tint, Expected/Snoozed slate outline. */
export const STATUS_STYLES: Record<AlertStatus, string> = {
  OPEN: "bg-brand/10 text-brand-ink",
  ACKED: "bg-slate-100 text-slate-700",
  RESOLVED: "bg-ok/10 text-ok-ink",
  EXPECTED: "bg-white text-slate-600 ring-1 ring-inset ring-slate-300",
  SNOOZED: "bg-white text-slate-600 ring-1 ring-inset ring-slate-300",
};

export const STATUS_LABELS: Record<AlertStatus, string> = {
  OPEN: "Open",
  ACKED: "Acked",
  RESOLVED: "Resolved",
  SNOOZED: "Snoozed",
  EXPECTED: "Expected",
};
