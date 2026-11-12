// Pure helpers for the inbox incident cards (sparkline + mini timeline). No React here.
import { CAMPAIGNS, demoNow } from "@/lib/dataGenerator";
import { DEFAULT_RULES } from "@/lib/detector";
import type { Alert, CampaignHistory, HourPoint } from "@/lib/types";

const HOUR = 3_600_000;

export interface CardSparkPoint {
  ts: number;
  value: number;
  /** TRACKING_BREAK only: conversions expected from billed clicks (clicks × baseCvr) */
  expected?: number;
  /** at or after alert.startedAt */
  inIncident: boolean;
}

export interface CardSpark {
  points: CardSparkPoint[];
  /** what the line shows, for the aria-label */
  metric: string;
  hasExpected: boolean;
}

/** Metric each failure class is about (BUDGET_EXHAUST falls back to spend). */
function valueOf(alert: Alert, p: HourPoint): number {
  switch (alert.failureClass) {
    case "TRACKING_BREAK":
      return p.conversions;
    case "DRIFT":
      return p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
    case "DELIVERY_FAILURE":
      return p.impressions;
    case "SPEND_RUNAWAY":
    case "BUDGET_EXHAUST":
      return p.spendInr;
  }
}

const METRIC_LABEL: Record<Alert["failureClass"], string> = {
  SPEND_RUNAWAY: "hourly spend",
  BUDGET_EXHAUST: "hourly spend",
  TRACKING_BREAK: "conversions vs expected from clicks",
  DRIFT: "CTR",
  DELIVERY_FAILURE: "impressions",
};

/** The alert's metric over the last 24 hours of its campaign's history. */
export function alertSparkSeries(history: CampaignHistory, alert: Alert): CardSpark {
  const series = (history[alert.campaignId] ?? []).slice(-24);
  const baseCvr = CAMPAIGNS.find((c) => c.id === alert.campaignId)?.baseCvr ?? 0;
  const hasExpected = alert.failureClass === "TRACKING_BREAK";
  return {
    metric: METRIC_LABEL[alert.failureClass],
    hasExpected,
    points: series.map((p) => ({
      ts: p.ts,
      value: valueOf(alert, p),
      ...(hasExpected ? { expected: p.clicks * baseCvr } : {}),
      inIncident: p.ts >= alert.startedAt,
    })),
  };
}

/** Onset → Paged → Now: onset = startedAt, paged = onset + rule.minHours, now = end of last data hour. */
export function alertTimeline(alert: Alert): { onset: number; paged: number; now: number } {
  const minHours = DEFAULT_RULES.find((r) => r.failureClass === alert.failureClass)?.minHours ?? 1;
  return { onset: alert.startedAt, paged: alert.startedAt + minHours * HOUR, now: demoNow() + HOUR };
}
