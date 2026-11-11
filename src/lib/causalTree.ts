// Causal metric tree: decomposes an incident window into its upstream drivers.
//   CPA = CPC / CVR,   eCPM = CPC × CTR × 1000
// So a CPA or ROAS problem is always one of: auction price (CPC), engagement (CTR),
// or conversion path / tracking (CVR) — and volume (impressions) for delivery.
// Pure TS. Compares the incident window to the SAME hours-of-week in prior weeks.

import type { HourPoint } from "./types";
import { hourOfWeek } from "./dataGenerator";

export type NodeKey = "spend" | "impressions" | "cpm" | "ctr" | "cvr" | "cpc" | "cpa";
export type NodeStatus = "normal" | "up" | "down";

export interface TreeNode {
  key: NodeKey;
  label: string;
  formula: string;
  actual: number;
  expected: number;
  deltaPct: number; // (actual - expected) / expected × 100
  status: NodeStatus;
  /** true for the single upstream node that best explains the incident */
  isDriver: boolean;
  /** true when too few events were expected for this node's % change to be meaningful */
  lowVolume?: boolean;
  unit: "inr" | "pct" | "count";
}

interface Totals { spend: number; impressions: number; clicks: number; conversions: number }

function sum(points: HourPoint[]): Totals {
  return points.reduce(
    (t, p) => ({
      spend: t.spend + p.spendInr,
      impressions: t.impressions + p.impressions,
      clicks: t.clicks + p.clicks,
      conversions: t.conversions + p.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
  );
}

function ratios(t: Totals) {
  const safe = (a: number, b: number) => (b > 0 ? a / b : 0);
  return {
    spend: t.spend,
    impressions: t.impressions,
    cpm: safe(t.spend, t.impressions) * 1000,
    ctr: safe(t.clicks, t.impressions),
    cvr: safe(t.conversions, t.clicks),
    cpc: safe(t.spend, t.clicks),
    // CPA is undefined with zero conversions: report spend (infinite CPA) as-is
    cpa: t.conversions > 0 ? t.spend / t.conversions : Infinity,
  };
}

const NOISE_BAND = 15; // ±15% treated as normal variation at node level
// Poisson: P(0 conversions | 3.5 expected) = e^-3.5 ≈ 3%, so a zero is a real signal;
// at 2 expected it is 14%, i.e. routine. Below this, CVR is shown but never blamed.
const MIN_EXPECTED_CONVERSIONS = 3.5;

/**
 * Build the tree for the last `windowHours` hours of a campaign series.
 * Expected values are averaged over the same hours-of-week in up to 4 prior weeks.
 */
export function buildCausalTree(series: HourPoint[], windowHours: number): TreeNode[] {
  const n = series.length;
  const w = Math.max(1, Math.min(windowHours, n));
  const window = series.slice(n - w);

  // collect the same hours-of-week from prior weeks (by exact 168h offsets)
  const priorWeeks: Totals[] = [];
  for (let k = 1; k <= 4; k++) {
    const start = n - w - 168 * k;
    if (start < 0) break;
    priorWeeks.push(sum(series.slice(start, start + w)));
  }
  const act = ratios(sum(window));
  const exp =
    priorWeeks.length === 0
      ? act
      : ratios({
          spend: priorWeeks.reduce((s, t) => s + t.spend, 0) / priorWeeks.length,
          impressions: priorWeeks.reduce((s, t) => s + t.impressions, 0) / priorWeeks.length,
          clicks: priorWeeks.reduce((s, t) => s + t.clicks, 0) / priorWeeks.length,
          conversions: priorWeeks.reduce((s, t) => s + t.conversions, 0) / priorWeeks.length,
        });

  const defs: { key: NodeKey; label: string; formula: string; unit: TreeNode["unit"] }[] = [
    { key: "cpa", label: "CPA", formula: "CPC ÷ CVR", unit: "inr" },
    { key: "cpc", label: "CPC (auction price)", formula: "spend ÷ clicks", unit: "inr" },
    { key: "cvr", label: "Conversion rate", formula: "conversions ÷ clicks", unit: "pct" },
    { key: "cpm", label: "Effective CPM (context)", formula: "CPC × CTR × 1000", unit: "inr" },
    { key: "ctr", label: "CTR (engagement)", formula: "clicks ÷ impressions", unit: "pct" },
    { key: "impressions", label: "Impressions (delivery)", formula: "volume served", unit: "count" },
    { key: "spend", label: "Spend", formula: "impressions × CPM ÷ 1000", unit: "inr" },
  ];

  const nodes: TreeNode[] = defs.map((d) => {
    const a = act[d.key];
    const e = exp[d.key];
    let deltaPct: number;
    if (!isFinite(a) && isFinite(e)) deltaPct = 999; // CPA blew up (zero conversions)
    else if (e === 0) deltaPct = a === 0 ? 0 : 999;
    else deltaPct = ((a - e) / e) * 100;
    const status: NodeStatus = Math.abs(deltaPct) <= NOISE_BAND ? "normal" : deltaPct > 0 ? "up" : "down";
    return { ...d, actual: a, expected: e, deltaPct: Math.round(deltaPct), status, isDriver: false };
  });

  // These campaigns are CPC-billed, so the auction-price lever is CPC: effective CPM
  // (= CPC × CTR × 1000) moves mechanically with CTR and would be a misleading driver.
  // CPM stays in the tree as context, not as a candidate.
  const imp = nodes.find((x) => x.key === "impressions")!;
  if (imp.status === "down" && imp.deltaPct <= -80) {
    // Near-zero delivery: every downstream ratio is undefined, so delivery IS the cause.
    imp.isDriver = true;
    return nodes;
  }
  // Small-numbers gate: CVR can only be the driver if enough conversions were
  // expected in the window. 1 → 0 conversions is "-100%" but it is noise.
  const expectedConv = exp.cvr * (exp.impressions * exp.ctr);
  const cvrMeaningful = expectedConv >= MIN_EXPECTED_CONVERSIONS;
  const cvrNode = nodes.find((x) => x.key === "cvr")!;
  if (!cvrMeaningful) cvrNode.lowVolume = true;
  const leaves = nodes.filter(
    (x) => ["cpc", "ctr", "cvr", "impressions"].includes(x.key) && x.status !== "normal" && !(x.key === "cvr" && !cvrMeaningful),
  );
  if (leaves.length) {
    leaves.sort((x, y) => Math.abs(y.deltaPct) - Math.abs(x.deltaPct));
    leaves[0].isDriver = true;
  }
  return nodes;
}

/** One-line plain-English read of the tree, for the incident detail screen. */
export function diagnoseTree(nodes: TreeNode[]): string {
  const driver = nodes.find((x) => x.isDriver);
  if (!driver) return "No upstream driver outside normal variation; the change is within noise at node level.";
  const pct = driver.deltaPct >= 999 ? "collapsed" : `${driver.deltaPct > 0 ? "+" : ""}${driver.deltaPct}%`;
  switch (driver.key) {
    case "cvr":
      return `Conversion rate ${pct} while auction price (CPC) and CTR are near normal: the ads are working, the conversion path or its tracking is not. Check the pixel first, then the checkout page.`;
    case "ctr":
      return `CTR ${pct} at normal auction cost: engagement problem. Creative fatigue or a placement-mix shift is the likely cause.`;
    case "cpc":
      return `CPC ${pct} with engagement and conversion steady: auction pressure (e.g. competitors' sale-season bids). Adjust bid caps or shift budget to cheaper contexts.`;
    case "impressions":
      return driver.deltaPct > 0
        ? `Delivery ${pct} at normal CPM and CTR: a volume surge (broad targeting expansion or a new placement cluster) is absorbing budget faster than it converts. Cap today's budget, then narrow targeting.`
        : `Delivery ${pct}: the campaign is not being served. Check approval status, billing, and bids versus placement floors.`;
    default:
      return `${driver.label} ${pct} is the largest deviation.`;
  }
}

/** Hours-of-week helper re-exported for chart labelling convenience. */
export { hourOfWeek };
