// Pure helpers for the Notification Preview. No React here.
import { DEFAULT_RULES } from "@/lib/detector";
import type { Alert, AlertStatus, Severity } from "@/lib/types";
import { splitByAlertBudget } from "./inboxView";
import { isActive } from "./protection";

const HOUR = 3_600_000;

export type Channel = "WhatsApp" | "Push" | "In-app" | "Daily digest";
export const CHANNELS: Channel[] = ["WhatsApp", "Push", "In-app", "Daily digest"];

/** SPEC: SEV1 → WhatsApp + push, SEV2 → push + in-app, SEV3 → daily digest. */
export const SEVERITY_CHANNELS: Record<Severity, Channel[]> = {
  SEV1: ["WhatsApp", "Push"],
  SEV2: ["Push", "In-app"],
  SEV3: ["Daily digest"],
};

const statusOf = (a: Alert, statuses: Record<string, AlertStatus>) => statuses[a.id] ?? "OPEN";

/** The alert the WhatsApp mock shows: highest-₹ OPEN SEV1 within the alert budget, or null. */
export function whatsAppAlert(alerts: Alert[], statuses: Record<string, AlertStatus>): Alert | null {
  const { paged } = splitByAlertBudget(alerts);
  return paged.find((a) => a.severity === "SEV1" && statusOf(a, statuses) === "OPEN") ?? null;
}

/** When the rule fired: onset + the rule's minHours. */
export function caughtAt(alert: Alert): number {
  const hours = DEFAULT_RULES.find((r) => r.failureClass === alert.failureClass)?.minHours ?? 1;
  return alert.startedAt + hours * HOUR;
}

export interface DigestRow {
  alert: Alert;
  status: AlertStatus;
  /** how this alert reached the advertiser before the digest */
  sentVia: string;
}

export interface Digest {
  rows: DigestRow[];
  totalAtRiskInr: number;
  openCount: number;
}

/** Daily digest: every alert today, highest ₹ first, with the channel it was routed to. */
export function buildDigest(alerts: Alert[], statuses: Record<string, AlertStatus>): Digest {
  const { paged, digest } = splitByAlertBudget(alerts);
  const rows: DigestRow[] = [
    ...paged.map((a) => ({
      alert: a,
      status: statusOf(a, statuses),
      sentVia: a.severity === "SEV3" ? "Digest only" : SEVERITY_CHANNELS[a.severity].join(" + "),
    })),
    ...digest.map((a) => ({ alert: a, status: statusOf(a, statuses), sentVia: "Digest only (alert budget)" })),
  ];
  return {
    rows,
    totalAtRiskInr: alerts.reduce((s, a) => s + a.inrAtRiskTotal, 0),
    // active = OPEN or ACKED (acknowledged is not fixed)
    openCount: rows.filter((r) => isActive(r.status)).length,
  };
}
