import { describe, expect, it } from "vitest";
import { generateHistory, injectIncident, generateSeededDemo } from "./dataGenerator";
import { detectAll, median, mad, baselineAt } from "./detector";
import { backtestRule, } from "./backtest";
import { DEFAULT_RULES } from "./detector";

describe("stats", () => {
  it("median & mad", () => {
    expect(median([1, 2, 3, 4, 5])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(mad([1, 1, 2, 2, 4, 6, 9])).toBe(1);
  });
});

describe("generator", () => {
  it("is deterministic for a seed", () => {
    const a = generateHistory(42, 1_760_000_000_000);
    const b = generateHistory(42, 1_760_000_000_000);
    expect(a.c1[100]).toEqual(b.c1[100]);
  });
  it("produces 30 days of hourly points", () => {
    const h = generateHistory(42);
    expect(h.c1.length).toBe(720);
  });
});

describe("detector", () => {
  it("fires few/no alerts on clean history", () => {
    const h = generateHistory(42);
    const alerts = detectAll(h);
    expect(alerts.length).toBeLessThanOrEqual(2); // tolerate rare statistical flukes
  });

  it("catches an injected tracking break", () => {
    const h = injectIncident(generateHistory(42), {
      campaignId: "c2", failureClass: "TRACKING_BREAK", hours: 4,
    });
    const alerts = detectAll(h);
    const tb = alerts.find((a) => a.failureClass === "TRACKING_BREAK" && a.campaignId === "c2");
    expect(tb).toBeTruthy();
    expect(tb!.inrAtRiskTotal).toBeGreaterThan(0);
    expect(tb!.headline).toContain("Conversions = 0");
  });

  it("catches an injected spend runaway with sensible severity", () => {
    const h = injectIncident(generateHistory(42), {
      campaignId: "c1", failureClass: "SPEND_RUNAWAY", hours: 2,
    });
    const a = detectAll(h).find((x) => x.failureClass === "SPEND_RUNAWAY" && x.campaignId === "c1");
    expect(a).toBeTruthy();
    expect(["SEV1", "SEV2"]).toContain(a!.severity);
  });

  it("catches delivery failure and drift", () => {
    let h = injectIncident(generateHistory(42), {
      campaignId: "c4", failureClass: "DELIVERY_FAILURE", hours: 3,
    });
    h = injectIncident(h, { campaignId: "c3", failureClass: "DRIFT", hours: 3 });
    const alerts = detectAll(h);
    expect(alerts.some((a) => a.failureClass === "DELIVERY_FAILURE" && a.campaignId === "c4")).toBe(true);
    expect(alerts.some((a) => a.failureClass === "DRIFT" && a.campaignId === "c3")).toBe(true);
  });

  it("seeded demo yields a populated inbox (≥3 alerts)", () => {
    const alerts = detectAll(generateSeededDemo());
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    const classes = new Set(alerts.map((a) => a.failureClass));
    expect(classes.has("TRACKING_BREAK")).toBe(true);
  });

  it("baseline has enough samples after a week", () => {
    const h = generateHistory(42);
    const b = baselineAt(h.c1, 24 * 20, (p) => p.spendInr);
    expect(b.sampleSize).toBeGreaterThanOrEqual(6);
    expect(b.median).toBeGreaterThan(0);
  });
});

describe("backtest", () => {
  it("stricter threshold fires no more often than looser", () => {
    const drift = DEFAULT_RULES.find((r) => r.failureClass === "DRIFT")!;
    const loose = backtestRule({ ...drift, threshold: 0.15 });
    const strict = backtestRule({ ...drift, threshold: 0.45 });
    expect(strict.firings.length).toBeLessThanOrEqual(loose.firings.length);
    expect(typeof loose.note).toBe("string");
  });
});

// ---------- research-driven additions ----------
import { compareBaselines } from "./backtest";
import { buildCausalTree, diagnoseTree } from "./causalTree";
import { evaluateEligibility } from "./eligibility";
import { CAMPAIGNS } from "./dataGenerator";

describe("seasonal vs flat baseline", () => {
  it("flat (seasonality-blind) baseline produces more false alarms than seasonal", () => {
    const drift = DEFAULT_RULES.find((r) => r.failureClass === "DRIFT")!;
    const spend = DEFAULT_RULES.find((r) => r.failureClass === "SPEND_RUNAWAY")!;
    const d = compareBaselines(drift);
    const s = compareBaselines(spend);
    expect(d.flat.firings.length + s.flat.firings.length)
      .toBeGreaterThan(d.seasonal.firings.length + s.seasonal.firings.length);
  });
});

describe("causal tree", () => {
  it("tracking break → CVR is the driver", () => {
    const h = injectIncident(generateHistory(42), { campaignId: "c2", failureClass: "TRACKING_BREAK", hours: 4 });
    const t = buildCausalTree(h.c2, 4);
    expect(t.find((x) => x.isDriver)?.key).toBe("cvr");
    expect(diagnoseTree(t)).toContain("conversion path");
  });
  it("CTR drift → CTR is the driver", () => {
    const h = injectIncident(generateHistory(42), { campaignId: "c3", failureClass: "DRIFT", hours: 3 });
    expect(buildCausalTree(h.c3, 3).find((x) => x.isDriver)?.key).toBe("ctr");
  });
  it("spend runaway → impressions (volume) is the driver", () => {
    const h = injectIncident(generateHistory(42), { campaignId: "c1", failureClass: "SPEND_RUNAWAY", hours: 2 });
    expect(buildCausalTree(h.c1, 2).find((x) => x.isDriver)?.key).toBe("impressions");
  });
  it("delivery failure → impressions down is the driver", () => {
    const h = injectIncident(generateHistory(42), { campaignId: "c4", failureClass: "DELIVERY_FAILURE", hours: 3 });
    const d = buildCausalTree(h.c4, 3).find((x) => x.isDriver)!;
    expect(d.key).toBe("impressions");
    expect(d.status).toBe("down");
  });
});

describe("eligibility gates", () => {
  it("low-volume brand campaign falls back on conversion rules; others pass", () => {
    const h = generateHistory(42);
    const e4 = evaluateEligibility(CAMPAIGNS[3], h.c4);
    expect(e4.gates.find((g) => g.id === "conversionVolume")!.status).toBe("fallback");
    const e1 = evaluateEligibility(CAMPAIGNS[0], h.c1);
    expect(e1.summary).toBe("All rules active");
  });
});

// ---------- Rule Sandbox: sliders must show a real precision/recall trade-off ----------
import { measureRecall, withSliderValue, backtestRule as bt } from "./backtest";

describe("rule sandbox trade-offs", () => {
  const rule = (fc: string) => DEFAULT_RULES.find((r) => r.failureClass === fc)!;

  it("every rule's slider moves the false-alarm count somewhere in its range", () => {
    for (const r of DEFAULT_RULES) {
      const lo = bt(withSliderValue(r, r.slider.min)).firings.length;
      const hi = bt(withSliderValue(r, r.slider.max)).firings.length;
      expect(lo).not.toBe(hi);
    }
  }, 120000);

  it("defaults: tracking break catches every planted outage with ≤1 false alarm", () => {
    const r = rule("TRACKING_BREAK");
    expect(bt(r).firings.length).toBeLessThanOrEqual(1);
    const rc = measureRecall(r)!;
    expect(rc.caught).toBe(rc.planted);
  }, 120000);

  it("drift: lowering k catches more planted drift but raises false alarms", () => {
    const r = rule("DRIFT");
    const loose = withSliderValue(r, 0.5);
    expect(measureRecall(loose)!.caught).toBeGreaterThan(measureRecall(r)!.caught);
    expect(bt(loose).firings.length).toBeGreaterThan(bt(r).firings.length);
  }, 120000);

  it("delivery default catches partial outages with zero false alarms", () => {
    const r = rule("DELIVERY_FAILURE");
    expect(bt(r).firings.length).toBe(0);
    expect(measureRecall(r)!.caught).toBe(measureRecall(r)!.planted);
  }, 120000);

  it("budget exhaust has no plantable incident", () => {
    expect(measureRecall(rule("BUDGET_EXHAUST"))).toBeNull();
  });
});
