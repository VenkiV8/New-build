import { describe, expect, it } from "vitest";
import { generateSeededDemo } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import { campaignOverview } from "./landingView";

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
