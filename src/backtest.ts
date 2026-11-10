// Rule sandbox: replay one rule over the stored 30-day history at a chosen threshold.
// "Would have fired 14× in the last 30 days — 9 on Sunday nights."

import type { BacktestResult, CampaignHistory, RuleConfig } from "./types";
import { detectAll, DEFAULT_RULES } from "./detector";
import { generateHistory } from "./dataGenerator";

/**
 * Slide a 24h-step window across CLEAN history (no injected incidents) and count
 * how often this rule would have fired at the given threshold.
 * Uses clean data so the slider demonstrates false-positive tuning honestly.
 */
export function backtestRule(
  rule: RuleConfig,
  opts: { seed?: number; history?: CampaignHistory } = {},
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
    const alerts = detectAll(slice, { rules, windowHours: 12 });
    for (const a of alerts) {
      const dayKey = `${a.campaignId}-${new Date(a.startedAt).toDateString()}`;
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
    const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    byDay.set(label, (byDay.get(label) ?? 0) + 1);
  }
  const perDay = [...byDay.entries()].map(([day, count]) => ({ day, count }));

  // note: how many firings fall on weekend evenings (the classic false-positive trap)
  const weekendish = firings.filter((f) => {
    const d = new Date(f.ts);
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  }).length;

  const note =
    firings.length === 0
      ? "No firings on 30 days of clean history at this threshold — safe, but verify it still catches real incidents (try injecting one)."
      : weekendish / firings.length > 0.5
        ? `${weekendish} of ${firings.length} firings fall on weekends — likely seasonal noise. Hour-of-week baselining or a higher threshold would absorb these.`
        : `${firings.length} firing(s) in 30 days of clean history. Each would have been a false alarm — tune the threshold until this number matches your tolerance (~1/week is typical).`;

  return { firings, perDay, note };
}
