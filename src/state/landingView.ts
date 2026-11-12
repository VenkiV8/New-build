// Pure view helpers for the landing page's "Live campaigns" section. No React here.
import { CAMPAIGNS, demoNow, istParts, sameIstDay } from "@/lib/dataGenerator";
import type { Alert, AlertStatus, Campaign, CampaignHistory, Severity } from "@/lib/types";
import { isActive, type CampaignState } from "./protection";

const SEVERITY_RANK: Record<Severity, number> = { SEV1: 0, SEV2: 1, SEV3: 2 };

export const OBJECTIVE_LABEL: Record<Campaign["objective"], string> = {
  sales: "Sales",
  retargeting: "Retargeting",
  awareness: "Awareness",
};

export const CAMPAIGN_STATE_LABEL: Record<CampaignState, string> = {
  active: "Live",
  paused: "Paused",
  capped: "Budget capped",
};

export interface CampaignRow {
  campaign: Campaign;
  /** ₹ spent during the IST calendar day of demoNow() */
  spentToday: number;
  /** spentToday as a % of the daily budget (rounded) */
  pctOfBudget: number;
  overBudget: boolean;
  conversionsToday: number;
  state: CampaignState;
  /** OPEN or ACKED alerts on this campaign */
  activeAlerts: Alert[];
  /** worst active alert: highest severity, then highest ₹ at risk */
  worst: Alert | null;
}

export interface SparkPoint {
  ts: number;
  /** IST hour of day, 0–23 (x position) */
  hour: number;
  spendInr: number;
  /** inside an OPEN/ACKED alert window for this campaign */
  inIncident: boolean;
}

/**
 * "Today" sparkline: hourly spend for the IST calendar day of demoNow() (≤ 24
 * points). Hours from an active alert's startedAt onward are flagged.
 */
export function todaySpendSeries(
  history: CampaignHistory,
  campaignId: string,
  activeAlerts: Alert[],
): SparkPoint[] {
  const now = demoNow();
  const starts = activeAlerts.filter((a) => a.campaignId === campaignId).map((a) => a.startedAt);
  return (history[campaignId] ?? [])
    .filter((p) => sameIstDay(p.ts, now))
    .map((p) => ({
      ts: p.ts,
      hour: istParts(p.ts).hours,
      spendInr: p.spendInr,
      inIncident: starts.some((s) => p.ts >= s),
    }));
}

/** One row per campaign, from live app state. */
export function campaignOverview(
  history: CampaignHistory,
  alerts: Alert[],
  statuses: Record<string, AlertStatus>,
  campaignState: Record<string, CampaignState>,
): CampaignRow[] {
  const now = demoNow();
  return CAMPAIGNS.map((c) => {
    const today = (history[c.id] ?? []).filter((p) => sameIstDay(p.ts, now));
    const spentToday = today.reduce((s, p) => s + p.spendInr, 0);
    const activeAlerts = alerts
      .filter((a) => a.campaignId === c.id && isActive(statuses[a.id]))
      .sort(
        (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.inrAtRiskTotal - a.inrAtRiskTotal,
      );
    return {
      campaign: c,
      spentToday,
      pctOfBudget: Math.round((spentToday / c.dailyBudgetInr) * 100),
      overBudget: spentToday > c.dailyBudgetInr,
      conversionsToday: today.reduce((s, p) => s + p.conversions, 0),
      state: campaignState[c.id] ?? "active",
      activeAlerts,
      worst: activeAlerts[0] ?? null,
    };
  });
}
