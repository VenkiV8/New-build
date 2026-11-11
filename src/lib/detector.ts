// Deterministic detection engine. Statistics detect; templates explain.
// Baseline = median ± MAD of the SAME hour-of-week over the prior weeks.

import type {
  Alert, Baseline, CampaignHistory, CauseItem, FailureClass, HourPoint, RuleConfig, Severity,
} from "./types";
import { CAMPAIGNS, hourOfWeek, mulberry32 } from "./dataGenerator";

// ---------- small stats helpers ----------
export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function mad(xs: number[], med = median(xs)): number {
  if (xs.length === 0) return 0;
  return median(xs.map((x) => Math.abs(x - med)));
}

/**
 * "seasonal" = same hour-of-week (±1h) across prior weeks — what the product uses.
 * "flat"     = all hours of the trailing 7 days, ignoring time of day — the naive
 *              static-threshold approach, kept only so the Rule Sandbox can show
 *              how many false alarms seasonality-blind alerting would produce.
 */
export type BaselineMode = "seasonal" | "flat";

/** Baseline for a metric at a given hour index, from PRIOR hours only. */
export function baselineAt(
  series: HourPoint[],
  idx: number,
  metric: (p: HourPoint) => number,
  mode: BaselineMode = "seasonal",
): Baseline {
  const targetHow = hourOfWeek(series[idx].ts);
  const vals: number[] = [];
  if (mode === "flat") {
    for (let i = Math.max(0, idx - 24 * 7); i < idx; i++) vals.push(metric(series[i]));
  } else {
    // walk backwards in whole weeks; also accept ±1 hour to fatten the sample
    for (let i = 0; i < idx; i++) {
      const how = hourOfWeek(series[i].ts);
      if (how === targetHow || Math.abs(how - targetHow) === 1) vals.push(metric(series[i]));
    }
  }
  const med = median(vals);
  // Floor MAD at 8% of the median (relative floor only — an absolute floor would
  // break ratio metrics like CTR, where values live around 0.01).
  const m = Math.max(mad(vals, med), med * 0.08, 1e-9);
  return { median: med, mad: m, sampleSize: vals.length };
}

// ---------- default rules ----------
export const DEFAULT_RULES: RuleConfig[] = [
  {
    failureClass: "SPEND_RUNAWAY", enabled: true, threshold: 1.5, minHours: 1,
    label: "Spend runaway",
    thresholdLabel: (t) => `Spend > ${Math.round(t * 100)}% of expected for 1h`,
  },
  {
    failureClass: "TRACKING_BREAK", enabled: true, threshold: 4, minHours: 3,
    label: "Tracking break",
    thresholdLabel: (t) => `0 conversions for 3h while ≥ ${t} were expected from billed clicks`,
  },
  {
    failureClass: "DRIFT", enabled: true, threshold: 0.3, minHours: 2,
    label: "Performance drift",
    thresholdLabel: (t) => `CTR/CPA deviates > ${Math.round(t * 100)}% vs same hour-of-week, 2h in a row`,
  },
  {
    failureClass: "DELIVERY_FAILURE", enabled: true, threshold: 0.05, minHours: 2,
    label: "Delivery failure",
    thresholdLabel: (t) => `Impressions < ${Math.round(t * 100)}% of expected for 2h`,
  },
  {
    failureClass: "BUDGET_EXHAUST", enabled: true, threshold: 0.4, minHours: 1,
    label: "Budget exhausted early",
    thresholdLabel: (t) => `Daily budget spent before ${Math.round(t * 100)}% of the day`,
  },
];

const MIN_IMPRESSIONS_GATE = 150; // sparse-data gate for DRIFT (small budgets → daily granularity instead)

/**
 * Severity = money at risk per hour, relative to the campaign's expected hourly pace
 * (dailyBudget / 24). Using hourly pace, not daily budget, keeps severity meaningful
 * at any time of day: bleeding 1.5× your hourly pace is an emergency regardless of
 * whether it is 9am or 11pm.
 */
function severityFor(inrAtRiskPerHour: number, dailyBudgetInr: number): Severity {
  const hourlyPace = dailyBudgetInr / 24;
  if (inrAtRiskPerHour >= hourlyPace * 1.5) return "SEV1";
  if (inrAtRiskPerHour >= hourlyPace * 0.6) return "SEV2";
  return "SEV3";
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Deterministic synthetic cause breakdown so the "diagnosis" is stable per alert. */
function causesFor(fc: FailureClass, campaignId: string): CauseItem[] {
  const rnd = mulberry32(fc.length * 97 + campaignId.charCodeAt(1) * 13);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const a = 0.45 + rnd() * 0.3;
  const b = (1 - a) * (0.55 + rnd() * 0.2);
  const c = 1 - a - b;
  switch (fc) {
    case "TRACKING_BREAK":
      return [
        { label: "Checkout page: conversion pixel not firing after a site deploy", share: a },
        { label: pick(["Mobile Safari sessions", "Payment-gateway redirect flow"]), share: b },
        { label: "All other segments", share: c },
      ];
    case "SPEND_RUNAWAY":
      return [
        { label: pick(["Broad-match expansion onto high-CPC queries", "New placement cluster: video inventory"]), share: a },
        { label: "Mobile evening traffic surge", share: b },
        { label: "All other segments", share: c },
      ];
    case "DRIFT":
      return [
        { label: pick(["Creative fatigue: hero banner (21 days live)", "Competitor Diwali-sale pressure on same contexts"]), share: a },
        { label: "Placement: tier-2 news sites", share: b },
        { label: "All other segments", share: c },
      ];
    case "DELIVERY_FAILURE":
      return [
        { label: pick(["Ad disapproved: policy review pending", "Billing: card authorisation failed"]), share: a },
        { label: "Bid below floor on top placements", share: b },
        { label: "All other segments", share: c },
      ];
    case "BUDGET_EXHAUST":
      return [
        { label: "Morning CPC spike absorbed budget", share: a },
        { label: "No pacing cap set", share: b },
        { label: "All other segments", share: c },
      ];
  }
}

const ACTIONS: Record<FailureClass, string[]> = {
  TRACKING_BREAK: ["Open tracking checklist", "Pause campaign", "Snooze 24h"],
  SPEND_RUNAWAY: ["Cap today's budget", "Pause campaign", "Mark expected (sale day)"],
  DRIFT: ["Rotate creative", "Review placements", "Mark expected"],
  DELIVERY_FAILURE: ["Fix billing / review status", "Raise bid cap", "Snooze 24h"],
  BUDGET_EXHAUST: ["Spread budget with pacing", "Raise daily budget", "Ignore today"],
};

interface DetectOpts {
  rules?: RuleConfig[];
  /** how many trailing hours to scan for live alerts */
  windowHours?: number;
  /** baseline strategy; "flat" exists only for the naive-vs-seasonal comparison */
  baselineMode?: BaselineMode;
}

/** Run all rules over the trailing window; return deduped alerts (latest per class+campaign). */
export function detectAll(history: CampaignHistory, opts: DetectOpts = {}): Alert[] {
  const rules = opts.rules ?? DEFAULT_RULES;
  const windowHours = opts.windowHours ?? 48;
  const mode: BaselineMode = opts.baselineMode ?? "seasonal";
  const alerts: Alert[] = [];

  for (const c of CAMPAIGNS) {
    const series = history[c.id];
    if (!series || series.length < 24 * 8) continue; // need ≥1 week of baseline
    const n = series.length;
    const start = Math.max(24 * 7, n - windowHours);

    const ruleOn = (fc: FailureClass) => rules.find((r) => r.failureClass === fc && r.enabled);

    // --- TRACKING_BREAK: trailing run of zero-conversion hours with clicks ---
    const tb = ruleOn("TRACKING_BREAK");
    if (tb) {
      let run = 0, clicksInRun = 0, spendInRun = 0;
      for (let i = n - 1; i >= start; i--) {
        const p = series[i];
        if (p.conversions === 0 && p.clicks > 0) { run++; clicksInRun += p.clicks; spendInRun += p.spendInr; }
        else break;
      }
      // Gate on EXPECTED conversions, not clicks: a campaign that expects 0.5
      // conversions/hour will show zero-runs naturally — that is sparse data,
      // not a tracking break. threshold = min expected conversions missed.
      const expectedConv = clicksInRun * c.baseCvr;
      if (run >= tb.minHours && expectedConv >= tb.threshold) {
        const atRiskPerHour = spendInRun / run;
        alerts.push(mkAlert(c.id, "TRACKING_BREAK", "conversions", {
          expected: Math.round((c.baseCvr * clicksInRun) || 1), actual: 0,
          startedAt: series[n - run].ts, atRiskPerHour, atRiskTotal: spendInRun,
          headline: `Conversions = 0 for ${run}h while ${clicksInRun} clicks billed — ${inr(spendInRun)} spent with no measurable return`,
          explanation: `Clicks and spend are flowing normally but zero conversions were recorded for ${run} consecutive hours. This pattern usually means the conversion pixel broke (often after a site deploy), not that buyers vanished. Expected ~${Math.max(1, Math.round(c.baseCvr * clicksInRun))} conversions from ${clicksInRun} clicks at this campaign's baseline rate.`,
          dailyBudget: c.dailyBudgetInr,
        }));
      }
    }

    // --- SPEND_RUNAWAY ---
    const sr = ruleOn("SPEND_RUNAWAY");
    if (sr) {
      let run = 0, excess = 0, firstTs = 0, lastExp = 0, lastAct = 0;
      for (let i = n - 1; i >= start; i--) {
        const b = baselineAt(series, i, (p) => p.spendInr, mode);
        const actual = series[i].spendInr;
        if (b.sampleSize >= 6 && actual > b.median * sr.threshold && actual - b.median > 15) {
          run++; excess += actual - b.median; firstTs = series[i].ts; lastExp = b.median; lastAct = actual;
        } else break;
      }
      if (run >= sr.minHours) {
        const atRiskPerHour = excess / run;
        alerts.push(mkAlert(c.id, "SPEND_RUNAWAY", "spend", {
          expected: Math.round(lastExp), actual: Math.round(lastAct),
          startedAt: firstTs, atRiskPerHour, atRiskTotal: excess,
          headline: `Spending ${Math.round((lastAct / Math.max(1, lastExp)) * 100)}% of expected — ${inr(excess)} over baseline in ${run}h`,
          explanation: `Hourly spend is running at ${Math.round((lastAct / Math.max(1, lastExp)) * 100)}% of the same-hour-of-week baseline (${inr(lastExp)}/h expected, ${inr(lastAct)}/h actual). At this pace the daily budget of ${inr(c.dailyBudgetInr)} will be exhausted early and the overspend adds no proportional conversions.`,
          dailyBudget: c.dailyBudgetInr,
        }));
      }
    }

    // --- DRIFT (CTR, volume-gated) ---
    const dr = ruleOn("DRIFT");
    if (dr) {
      let run = 0, firstTs = 0, lastExp = 0, lastAct = 0, lostConv = 0;
      for (let i = n - 1; i >= start; i--) {
        const p = series[i];
        if (p.impressions < MIN_IMPRESSIONS_GATE) break; // sparse-data gate
        const bCtr = baselineAt(series, i, (q) => (q.impressions ? q.clicks / q.impressions : 0), mode);
        const actualCtr = p.clicks / p.impressions;
        const deviation = bCtr.median > 0 ? (bCtr.median - actualCtr) / bCtr.median : 0;
        const madGate = Math.abs(actualCtr - bCtr.median) > 2 * bCtr.mad;
        if (bCtr.sampleSize >= 6 && deviation > dr.threshold && madGate) {
          run++; firstTs = p.ts; lastExp = bCtr.median; lastAct = actualCtr;
          lostConv += Math.max(0, (bCtr.median - actualCtr) * p.impressions * c.baseCvr);
        } else break;
      }
      if (run >= dr.minHours) {
        const atRiskTotal = lostConv * c.aovInr * 0.3; // margin proxy on AOV
        const atRiskPerHour = atRiskTotal / run;
        alerts.push(mkAlert(c.id, "DRIFT", "ctr", {
          expected: +(lastExp * 100).toFixed(2), actual: +(lastAct * 100).toFixed(2),
          startedAt: firstTs, atRiskPerHour, atRiskTotal,
          headline: `CTR down ${Math.round(((lastExp - lastAct) / lastExp) * 100)}% vs baseline for ${run}h — est. ${inr(atRiskTotal)} in lost outcomes`,
          explanation: `CTR has been below the same-hour-of-week baseline for ${run} consecutive hours (${(lastExp * 100).toFixed(2)}% expected vs ${(lastAct * 100).toFixed(2)}% actual), beyond normal variation (>2×MAD). Sustained drift at healthy volume usually points to creative fatigue or placement-mix shift rather than noise.`,
          dailyBudget: c.dailyBudgetInr,
        }));
      }
    }

    // --- DELIVERY_FAILURE ---
    const df = ruleOn("DELIVERY_FAILURE");
    if (df) {
      let run = 0, firstTs = 0, lastExp = 0, lastAct = 0;
      for (let i = n - 1; i >= start; i--) {
        const b = baselineAt(series, i, (p) => p.impressions, mode);
        const actual = series[i].impressions;
        if (b.sampleSize >= 6 && b.median >= 50 && actual < b.median * df.threshold) {
          run++; firstTs = series[i].ts; lastExp = b.median; lastAct = actual;
        } else break;
      }
      if (run >= df.minHours) {
        const expSpend = (c.dailyBudgetInr / 24) * run;
        alerts.push(mkAlert(c.id, "DELIVERY_FAILURE", "impressions", {
          expected: Math.round(lastExp), actual: Math.round(lastAct),
          startedAt: firstTs, atRiskPerHour: expSpend / run, atRiskTotal: expSpend,
          headline: `Delivery near zero for ${run}h (${Math.round(lastAct)} vs ~${Math.round(lastExp)} expected impressions/h)`,
          explanation: `Impressions collapsed to under ${Math.round(df.threshold * 100)}% of baseline for ${run} consecutive hours. Spend is ₹0 — which is exactly why no dashboard turns red. Most common causes: ad disapproval, billing failure, or bids falling below placement floors. Every silent hour forfeits the campaign's expected results.`,
          dailyBudget: c.dailyBudgetInr,
        }));
      }
    }

    // --- BUDGET_EXHAUST (today) ---
    const be = ruleOn("BUDGET_EXHAUST");
    if (be) {
      const lastTs = series[n - 1].ts;
      const d = new Date(lastTs);
      const hoursToday = d.getHours() + 1;
      const dayFrac = hoursToday / 24;
      if (dayFrac <= be.threshold + 1e-9) {
        let spendToday = 0;
        for (let i = n - 1; i >= 0 && new Date(series[i].ts).getDate() === d.getDate(); i--) {
          spendToday += series[i].spendInr;
        }
        if (spendToday >= c.dailyBudgetInr) {
          const remainingShare = 1 - dayFrac;
          const atRiskTotal = c.dailyBudgetInr * remainingShare; // opportunity proxy
          alerts.push(mkAlert(c.id, "BUDGET_EXHAUST", "budget", {
            expected: c.dailyBudgetInr, actual: Math.round(spendToday),
            startedAt: lastTs, atRiskPerHour: atRiskTotal / Math.max(1, 24 - hoursToday),
            atRiskTotal,
            headline: `Daily budget of ${inr(c.dailyBudgetInr)} exhausted by ${hoursToday}:00 — dark for the remaining ${24 - hoursToday}h`,
            explanation: `The full daily budget was spent within the first ${Math.round(dayFrac * 100)}% of the day, so the campaign goes dark during the evening peak — typically this campaign's best-converting hours. Pacing would spread spend across high-value hours instead.`,
            dailyBudget: c.dailyBudgetInr,
          }));
        }
      }
    }
  }

  // Alert budget guardrail: keep top 5 by ₹ at risk; callers may show the rest as digest
  return alerts.sort((a, b) => b.inrAtRiskTotal - a.inrAtRiskTotal);
}

interface MkArgs {
  expected: number; actual: number; startedAt: number;
  atRiskPerHour: number; atRiskTotal: number;
  headline: string; explanation: string; dailyBudget: number;
}

function mkAlert(
  campaignId: string, fc: FailureClass, metric: Alert["metric"], a: MkArgs,
): Alert {
  return {
    id: `${campaignId}-${fc}-${a.startedAt}`,
    campaignId,
    failureClass: fc,
    severity: severityFor(a.atRiskPerHour, a.dailyBudget),
    inrAtRiskPerHour: Math.round(a.atRiskPerHour),
    inrAtRiskTotal: Math.round(a.atRiskTotal),
    startedAt: a.startedAt,
    detectedAt: Date.now(),
    metric,
    expected: a.expected,
    actual: a.actual,
    headline: a.headline,
    explanation: a.explanation,
    causes: causesFor(fc, campaignId),
    suggestedActions: ACTIONS[fc],
  };
}
