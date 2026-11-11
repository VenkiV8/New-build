// Domain types — pure TS, no React imports.

export type FailureClass =
  | "SPEND_RUNAWAY"
  | "TRACKING_BREAK"
  | "DRIFT"
  | "DELIVERY_FAILURE"
  | "BUDGET_EXHAUST";

export type Severity = "SEV1" | "SEV2" | "SEV3";

export type AlertStatus = "OPEN" | "ACKED" | "RESOLVED" | "SNOOZED" | "EXPECTED";

export interface Campaign {
  id: string;
  name: string;
  objective: "sales" | "retargeting" | "awareness";
  dailyBudgetInr: number; // ₹ per day
  avgCpcInr: number; // base cost per click
  baseCtr: number; // e.g. 0.02
  baseCvr: number; // conversions per click, e.g. 0.04
  aovInr: number; // avg order value proxy, for ₹-at-risk math
  /** relative traffic scale (impressions per "unit hour") */
  scale: number;
}

export interface HourPoint {
  /** epoch ms, start of hour */
  ts: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spendInr: number;
}

export type CampaignHistory = Record<string, HourPoint[]>; // campaignId -> hourly series (oldest first)

export interface Baseline {
  /** expected (median) value for this hour-of-week */
  median: number;
  /** median absolute deviation, floored to avoid div-by-zero */
  mad: number;
  sampleSize: number;
}

export interface CauseItem {
  label: string; // e.g. "Mobile devices", "Placement: news-sites-tier2"
  share: number; // 0..1 share of the anomaly attributed
}

export interface Alert {
  id: string;
  campaignId: string;
  failureClass: FailureClass;
  severity: Severity;
  /** estimated money at risk per hour while unresolved */
  inrAtRiskPerHour: number;
  /** total estimated so far */
  inrAtRiskTotal: number;
  startedAt: number; // epoch ms
  detectedAt: number;
  metric: "spend" | "conversions" | "ctr" | "cpa" | "impressions" | "budget";
  expected: number;
  actual: number;
  headline: string; // one-line summary for the inbox card
  explanation: string; // template-generated "why" paragraph
  causes: CauseItem[]; // suspected cause breakdown (synthetic but consistent)
  suggestedActions: string[]; // first is primary
}

export interface RuleConfig {
  failureClass: FailureClass;
  enabled: boolean;
  /** class-specific sensitivity knob, see detector.ts for meaning */
  threshold: number;
  minHours: number; // consecutive hours required
  /** DRIFT only: noise gate, deviation must exceed madK × MAD (robust z-score). Default 2. */
  madK?: number;
  label: string;
  thresholdLabel: (t: number) => string;
  /** Which knob the Rule Sandbox slider controls, and its range. */
  slider: {
    param: "threshold" | "madK";
    min: number;
    max: number;
    step: number;
    /** short label for the current slider value, e.g. "k = 2.0" or "150%" */
    format: (v: number) => string;
    /** one line explaining what moving the slider trades off */
    help: string;
  };
}

export interface IncidentInjection {
  campaignId: string;
  failureClass: Exclude<FailureClass, "BUDGET_EXHAUST" | "DRIFT"> | "DRIFT";
  /** how many recent hours to corrupt */
  hours: number;
}

export interface BacktestResult {
  firings: { ts: number; campaignId: string }[];
  perDay: { day: string; count: number }[]; // "Mon 3 Nov" style label
  note: string; // e.g. "9 of 14 firings fall on Sunday nights — baseline handles this when hour-of-week is on."
}
