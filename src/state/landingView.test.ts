import { describe, expect, it } from "vitest";
import { generateSeededDemo } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import { campaignOverview, todaySpendSeries } from "./landingView";

const seeded = () => {
  const history = generateSeededDemo();
  return { history, alerts: detectAll(history) };
};

describe("campaignOverview (seeded demo)", () => {
  it("spent today is summed over the IST day of demoNow()", () => {
    const { history, alerts } = seeded();
    const rows = campaignOverview(history, alerts, {}, {});
    expect(rows.map((r) => [r.campaign.id, r.spentToday, r.campaign.dailyBudgetInr, r.pctOfBudget])).toEqual([
      ["c1", 3_202, 3_000, 107],
      ["c2", 1_296, 1_600, 81],
      ["c3", 1_311, 2_000, 66],
      ["c4", 283, 400, 71],
    ]);
    expect(rows.map((r) => r.overBudget)).toEqual([true, false, false, false]);
    expect(rows.map((r) => r.conversionsToday)).toEqual([21, 11, 6, 0]);
  });

  it("health uses OPEN/ACKED alerts only and picks the worst severity", () => {
    const { history, alerts } = seeded();
    const sr = alerts.find((a) => a.campaignId === "c1")!;
    let rows = campaignOverview(history, alerts, {}, {});
    expect(rows[0].worst?.severity).toBe("SEV1");
    expect(rows[3].worst).toBeNull(); // Brand awareness: healthy
    rows = campaignOverview(history, alerts, { [sr.id]: "ACKED" }, {});
    expect(rows[0].activeAlerts).toHaveLength(1);
    rows = campaignOverview(history, alerts, { [sr.id]: "RESOLVED" }, {});
    expect(rows[0].worst).toBeNull();
  });

  it("status follows campaign state", () => {
    const { history, alerts } = seeded();
    const rows = campaignOverview(history, alerts, {}, { c1: "paused", c3: "capped" });
    expect(rows.map((r) => r.state)).toEqual(["paused", "active", "capped", "active"]);
  });
});

describe("todaySpendSeries (sparkline)", () => {
  it("has ≤ 24 hourly points for the IST demo day, ending at 8 PM", () => {
    const { history, alerts } = seeded();
    const pts = todaySpendSeries(history, "c1", alerts);
    expect(pts.length).toBeGreaterThan(0);
    expect(pts.length).toBeLessThanOrEqual(24);
    expect(pts[0].hour).toBe(0);
    expect(pts[pts.length - 1].hour).toBe(20);
  });

  it("flags c1's last hours (the seeded 2h spend runaway) as incident hours", () => {
    const { history, alerts } = seeded();
    const pts = todaySpendSeries(history, "c1", alerts);
    const flagged = pts.filter((p) => p.inIncident).map((p) => p.hour);
    expect(flagged).toEqual([19, 20]);
    expect(pts[pts.length - 1].inIncident).toBe(true);
    // resolved alert → no longer active → nothing flagged
    expect(todaySpendSeries(history, "c1", []).some((p) => p.inIncident)).toBe(false);
    // healthy campaign: nothing flagged
    expect(todaySpendSeries(history, "c4", alerts).some((p) => p.inIncident)).toBe(false);
  });
});
