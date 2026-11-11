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

export const SEVERITY_STYLES: Record<Severity, string> = {
  SEV1: "bg-red-50 text-red-700 ring-red-200",
  SEV2: "bg-amber-50 text-amber-800 ring-amber-200",
  SEV3: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const STATUS_LABELS: Record<AlertStatus, string> = {
  OPEN: "Open",
  ACKED: "Acked",
  RESOLVED: "Resolved",
  SNOOZED: "Snoozed",
  EXPECTED: "Expected",
};
