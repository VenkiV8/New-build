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
