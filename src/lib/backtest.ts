// Rule sandbox: replay a rule over 30 days of CLEAN history (every firing = a false alarm)
// and plant known incidents to measure recall. Together: the precision/recall trade-off.

import type { BacktestResult, CampaignHistory, CampaignHistory as H, FailureClass, HourPoint, RuleConfig } from "./types";
import { detectAll, DEFAULT_RULES, type BaselineMode } from "./detector";
import { generateHistory, istParts } from "./dataGenerator";

/**
 * Slide a 24h-step window across CLEAN history (no injected incidents) and count
 * how often this rule would have fired at the given threshold.
 * Uses clean data so the slider demonstrates false-positive tuning honestly.
 */
export function backtestRule(
  rule: RuleConfig,
  opts: { seed?: number; history?: CampaignHistory; baselineMode?: BaselineMode } = {},
): BacktestResult {
  const history = opts.history ?? generateHistory(opts.seed ?? 42);
  const anyCampaign = Object.values(history)[0];
  const n = anyCampaign.length;

  const rules = DEFAULT_RULES.map((r) =>
    r.failureClass === rule.failureClass ? { ...rule, enabled: true } : { ...r, enabled: false },
  );

  const firings: BacktestResult["firings"] = [];
  const seen = new Set<string>();

  // step 6h through the last 28 days; evaluate a 12h trailing window ending at each step
  for (let end = 24 * 7 + 12; end <= n; end += 6) {
    const slice: CampaignHistory = {};
    for (const [cid, pts] of Object.entries(history)) slice[cid] = pts.slice(0, end);
    const alerts = detectAll(slice, { rules, windowHours: 12, baselineMode: opts.baselineMode });
    for (const a of alerts) {
      const dayKey = `${a.campaignId}-${new Date(a.startedAt + 5.5 * 3600_000).toISOString().slice(0, 10)}`;
      if (!seen.has(dayKey)) {
        seen.add(dayKey);
        firings.push({ ts: a.startedAt, campaignId: a.campaignId });
      }
    }
  }

  // group per day for the bar chart
  const byDay = new Map<string, number>();
  for (const f of firings) {
    const d = new Date(f.ts);
    const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
    byDay.set(label, (byDay.get(label) ?? 0) + 1);
  }
  const perDay = [...byDay.entries()].map(([day, count]) => ({ day, count }));

  // note: how many firings fall on weekend evenings (the classic false-positive trap)
  const weekendish = firings.filter((f) => {
    const dow = istParts(f.ts).dow; // 0 = Mon … 6 = Sun
    return dow >= 5;
  }).length;

  const note =
    firings.length === 0
      ? "No firings on 30 days of clean history at this threshold — safe, but verify it still catches real incidents (try injecting one)."
      : weekendish / firings.length > 0.5
        ? `${weekendish} of ${firings.length} firings fall on weekends — likely seasonal noise. Hour-of-week baselining or a higher threshold would absorb these.`
        : `${firings.length} firing(s) in 30 days of clean history. Each would have been a false alarm — tune the threshold until this number matches your tolerance (~1/week is typical).`;

  return { firings, perDay, note };
}

/**
 * Side-by-side: how often would this rule have fired on 30 days of CLEAN data with
 * a naive flat baseline vs the seasonal (hour-of-week) baseline? Every firing on
 * clean data is a false alarm, so the gap is "false alarms prevented".
 */
export function compareBaselines(rule: RuleConfig, opts: { seed?: number } = {}) {
  const history = generateHistory(opts.seed ?? 42);
  const seasonal = backtestRule(rule, { history, baselineMode: "seasonal" });
  const flat = backtestRule(rule, { history, baselineMode: "flat" });
  return {
    seasonal,
    flat,
    falseAlarmsPrevented: Math.max(0, flat.firings.length - seasonal.firings.length),
  };
}

// ---------------- Recall: does the rule still catch real incidents? ----------------
// Plant incidents of several strengths at several past moments (all at 8 PM, the
// demo's evening anchor) and count how many this rule configuration catches.
// Together with the false-alarm count this is the precision/recall trade-off.


interface Plant { label: string; campaignId: string; hours: number; mutate: (p: HourPoint) => void }

const PLANTS: Partial<Record<FailureClass, Plant[]>> = {
  TRACKING_BREAK: [
    { label: "Pixel down on Diwali Sale", campaignId: "c1", hours: 4, mutate: (p) => { p.conversions = 0; } },
    { label: "Pixel down on Retargeting", campaignId: "c2", hours: 4, mutate: (p) => { p.conversions = 0; } },
  ],
  SPEND_RUNAWAY: [
    { label: "2.6× overspend", campaignId: "c1", hours: 2, mutate: (p) => { p.impressions *= 2.6; p.clicks = Math.round(p.clicks * 2.6); p.spendInr = Math.round(p.spendInr * 2.6); } },
    { label: "1.8× overspend", campaignId: "c1", hours: 2, mutate: (p) => { p.impressions *= 1.8; p.clicks = Math.round(p.clicks * 1.8); p.spendInr = Math.round(p.spendInr * 1.8); } },
    { label: "1.4× overspend", campaignId: "c3", hours: 2, mutate: (p) => { p.impressions *= 1.4; p.clicks = Math.round(p.clicks * 1.4); p.spendInr = Math.round(p.spendInr * 1.4); } },
  ],
  DRIFT: [
    { label: "CTR −55%", campaignId: "c3", hours: 3, mutate: (p) => { p.clicks = Math.round(p.clicks * 0.45); } },
    { label: "CTR −35%", campaignId: "c3", hours: 3, mutate: (p) => { p.clicks = Math.round(p.clicks * 0.65); } },
    { label: "CTR −20%", campaignId: "c3", hours: 3, mutate: (p) => { p.clicks = Math.round(p.clicks * 0.8); } },
  ],
  DELIVERY_FAILURE: [
    { label: "Ads disapproved (delivery ~0)", campaignId: "c1", hours: 3, mutate: (p) => { p.impressions = Math.round(p.impressions * 0.02); p.clicks = 0; p.conversions = 0; p.spendInr = 0; } },
    { label: "Bids below floor (delivery −70%)", campaignId: "c3", hours: 3, mutate: (p) => { p.impressions = Math.round(p.impressions * 0.3); p.clicks = Math.round(p.clicks * 0.3); p.conversions = Math.round(p.conversions * 0.3); p.spendInr = Math.round(p.spendInr * 0.3); } },
  ],
};

const RECALL_DAYS_BACK = [1, 2, 3, 5, 7]; // whole days → each moment is 8 PM, with ≥3 weeks of baseline behind it

export interface RecallResult {
  caught: number;
  planted: number;
  /** per incident type: caught / planted, for a small table */
  byType: { label: string; caught: number; planted: number }[];
}

/** null when the class has no plantable incident (BUDGET_EXHAUST). */
export function measureRecall(rule: RuleConfig, opts: { seed?: number } = {}): RecallResult | null {
  const plants = PLANTS[rule.failureClass];
  if (!plants) return null;
  const base = generateHistory(opts.seed ?? 42);
  const rules = DEFAULT_RULES.map((r) =>
    r.failureClass === rule.failureClass ? { ...rule, enabled: true } : { ...r, enabled: false },
  );
  const byType = plants.map((pl) => ({ label: pl.label, caught: 0, planted: 0 }));
  plants.forEach((pl, idx) => {
    for (const d of RECALL_DAYS_BACK) {
      const end = base[pl.campaignId].length - d * 24;
      const slice: H = {};
      for (const [cid, pts] of Object.entries(base)) {
        slice[cid] = pts.slice(0, end).map((p) => ({ ...p }));
      }
      const s = slice[pl.campaignId];
      for (let i = s.length - pl.hours; i < s.length; i++) {
        pl.mutate(s[i]);
        s[i].impressions = Math.round(s[i].impressions);
      }
      const hit = detectAll(slice, { rules, windowHours: 12 }).some(
        (a) => a.failureClass === rule.failureClass && a.campaignId === pl.campaignId,
      );
      byType[idx].planted++;
      if (hit) byType[idx].caught++;
    }
  });
  return {
    caught: byType.reduce((s, b) => s + b.caught, 0),
    planted: byType.reduce((s, b) => s + b.planted, 0),
    byType,
  };
}

/** Apply a slider value to a rule according to its slider metadata. */
export function withSliderValue(rule: RuleConfig, v: number): RuleConfig {
  return rule.slider.param === "madK" ? { ...rule, madK: v } : { ...rule, threshold: v };
}
