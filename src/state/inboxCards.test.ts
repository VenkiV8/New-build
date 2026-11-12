import { describe, expect, it } from "vitest";
import { generateSeededDemo } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import { formatClockTime } from "@/utils/format";
import { alertSparkSeries, alertTimeline } from "./inboxCards";

const seeded = () => {
  const history = generateSeededDemo();
  const alerts = detectAll(history);
  const by = (fc: string) => alerts.find((a) => a.failureClass === fc)!;
  return { history, by };
};

describe("alertSparkSeries", () => {
  it("spend runaway: last 24h of spend, the 2 incident hours flagged", () => {
    const { history, by } = seeded();
    const sr = by("SPEND_RUNAWAY");
    const s = alertSparkSeries(history, sr);
    expect(s.points).toHaveLength(24);
    expect(s.hasExpected).toBe(false);
    expect(s.points.at(-1)!.value).toBe(history.c1.at(-1)!.spendInr);
    expect(s.points.filter((p) => p.inIncident)).toHaveLength(2);
    expect(s.points.at(-3)!.inIncident).toBe(false);
  });

  it("tracking break: conversions with expected-from-clicks; 4 incident hours at 0", () => {
    const { history, by } = seeded();
    const s = alertSparkSeries(history, by("TRACKING_BREAK"));
    expect(s.hasExpected).toBe(true);
    const inc = s.points.filter((p) => p.inIncident);
    expect(inc).toHaveLength(4);
    for (const p of inc) {
      expect(p.value).toBe(0);
      expect(p.expected).toBeGreaterThan(0);
    }
  });

  it("drift shows CTR in percent; delivery failure shows impressions", () => {
    const { history, by } = seeded();
    const d = alertSparkSeries(history, by("DRIFT"));
    expect(d.metric).toBe("CTR");
    expect(Math.max(...d.points.map((p) => p.value))).toBeLessThan(10); // percent, not a fraction ×100 twice
    const df = alertSparkSeries(history, { ...by("DRIFT"), failureClass: "DELIVERY_FAILURE" });
    expect(df.points.at(-1)!.value).toBe(history.c3.at(-1)!.impressions);
  });
});

describe("alertTimeline", () => {
  it("onset → paged (+ rule minHours) → now (end of the 8–9 PM IST hour)", () => {
    const { by } = seeded();
    const t = alertTimeline(by("TRACKING_BREAK"));
    expect([t.onset, t.paged, t.now].map(formatClockTime)).toEqual(["5:00 PM", "8:00 PM", "9:00 PM"]);
    const sr = alertTimeline(by("SPEND_RUNAWAY"));
    expect([sr.onset, sr.paged].map(formatClockTime)).toEqual(["7:00 PM", "8:00 PM"]);
  });
});
