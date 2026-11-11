import { describe, expect, it } from "vitest";
import { alertWindowHours, anomalousRanges, bandSeries, metricAccessor, type BandPoint } from "./chartData";
import { generateSeededDemo } from "./dataGenerator";
import { detectAll } from "./detector";

const HOUR = 3_600_000;
const history = generateSeededDemo();
const alerts = detectAll(history);
const byClass = (fc: string) => alerts.find((a) => a.failureClass === fc)!;

describe("alertWindowHours", () => {
  it("counts start through last point inclusive", () => {
    const tb = byClass("TRACKING_BREAK");
    expect(alertWindowHours(history[tb.campaignId], tb.startedAt)).toBe(4);
    const sr = byClass("SPEND_RUNAWAY");
    expect(alertWindowHours(history[sr.campaignId], sr.startedAt)).toBe(2);
  });

  it("is at least 1", () => {
    const s = history.c1;
    expect(alertWindowHours(s, s[s.length - 1].ts + 5 * HOUR)).toBe(1);
  });
});

describe("bandSeries", () => {
  it("returns 72 hourly points with a valid band", () => {
    const tb = byClass("TRACKING_BREAK");
    const pts = bandSeries(history[tb.campaignId], tb.metric, tb.startedAt);
    expect(pts).toHaveLength(72);
    for (const p of pts) {
      expect(p.band[0]).toBeGreaterThanOrEqual(0);
      expect(p.band[0]).toBeLessThanOrEqual(p.expected);
      expect(p.band[1]).toBeGreaterThanOrEqual(p.expected);
    }
    expect(pts.filter((p) => p.anomalous)).toHaveLength(4);
  });

  it("shows the tracking break as zero conversions while the band expects some", () => {
    const tb = byClass("TRACKING_BREAK");
    const window = bandSeries(history[tb.campaignId], tb.metric, tb.startedAt).filter((p) => p.anomalous);
    for (const p of window) expect(p.actual).toBe(0);
    expect(window.some((p) => p.expected > 0)).toBe(true);
  });

  it("puts spend-runaway actuals above the band", () => {
    const sr = byClass("SPEND_RUNAWAY");
    const window = bandSeries(history[sr.campaignId], sr.metric, sr.startedAt).filter((p) => p.anomalous);
    for (const p of window) expect(p.actual).toBeGreaterThan(p.band[1]);
  });

  it("reports CTR in percent", () => {
    const v = metricAccessor("ctr")({ ts: 0, impressions: 1000, clicks: 12, conversions: 0, spendInr: 0 });
    expect(v).toBeCloseTo(1.2);
  });
});

describe("anomalousRanges", () => {
  it("groups contiguous anomalous hours", () => {
    const mk = (h: number, anomalous: boolean): BandPoint =>
      ({ ts: h * HOUR, actual: 0, expected: 0, band: [0, 0], anomalous });
    const pts = [mk(0, false), mk(1, true), mk(2, true), mk(3, false), mk(4, true)];
    expect(anomalousRanges(pts)).toEqual([
      [1 * HOUR, 2 * HOUR],
      [4 * HOUR, 4 * HOUR],
    ]);
  });
});
