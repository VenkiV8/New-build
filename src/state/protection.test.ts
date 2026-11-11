import { describe, expect, it } from "vitest";
import { generateSeededDemo } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import type { Alert } from "@/lib/types";
import { actionsFor, atRiskNow, exposureStopped, statusForAction } from "./protection";

const fake = (id: string, total: number, perHour = 0): Alert =>
  ({ id, inrAtRiskTotal: total, inrAtRiskPerHour: perHour }) as Alert;

describe("statusForAction", () => {
  it("resolves on fixes, defers on snooze / mark expected", () => {
    expect(statusForAction("Pause campaign")).toBe("RESOLVED");
    expect(statusForAction("Cap today's budget")).toBe("RESOLVED");
    expect(statusForAction("Open tracking checklist")).toBe("ACKED");
    expect(statusForAction("Mark fixed")).toBe("RESOLVED");
    expect(statusForAction("Fix billing / review status")).toBe("RESOLVED");
    expect(statusForAction("Snooze 24h")).toBe("SNOOZED");
    expect(statusForAction("Mark expected (sale day)")).toBe("EXPECTED");
    expect(statusForAction("Mark expected")).toBe("EXPECTED");
    expect(statusForAction("Ignore today")).toBe("EXPECTED");
  });

  it("classifies every action the detector suggests", () => {
    const actions = detectAll(generateSeededDemo()).flatMap((a) => a.suggestedActions);
    expect(actions.length).toBeGreaterThan(0);
    for (const a of actions) expect(["RESOLVED", "ACKED", "SNOOZED", "EXPECTED"]).toContain(statusForAction(a));
  });
});

describe("actionsFor", () => {
  const withActions = (suggestedActions: string[]) => ({ suggestedActions }) as Alert;

  it("keeps the class's primary action first and adds snooze / mark expected once", () => {
    expect(actionsFor(withActions(["Open tracking checklist", "Pause campaign", "Snooze 24h"]))).toEqual([
      "Open tracking checklist",
      "Pause campaign",
      "Snooze 24h",
      "Mark expected",
    ]);
    expect(actionsFor(withActions(["Cap today's budget", "Pause campaign", "Mark expected (sale day)"]))).toEqual([
      "Cap today's budget",
      "Pause campaign",
      "Mark expected (sale day)",
      "Snooze 24h",
    ]);
  });
});

describe("exposureStopped", () => {
  it("caps the seeded c1 spend runaway at its ₹3,000 daily budget (not ₹10,032)", () => {
    const sr = detectAll(generateSeededDemo()).find(
      (a) => a.campaignId === "c1" && a.failureClass === "SPEND_RUNAWAY",
    )!;
    expect(sr.inrAtRiskPerHour * 24).toBe(10_032);
    expect(exposureStopped(sr)).toBe(3_000);
  });

  it("is ₹/h at risk × 24 when that is under the daily budget, else the budget", () => {
    expect(exposureStopped({ ...fake("a", 0, 50), campaignId: "c2" })).toBe(1_200); // < ₹1,600
    expect(exposureStopped({ ...fake("a", 0, 86), campaignId: "c2" })).toBe(1_600); // ₹2,064 capped
  });
});

describe("atRiskNow", () => {
  it("sums only OPEN alerts; missing status counts as OPEN", () => {
    const alerts = [fake("a", 800), fake("b", 300), fake("c", 100)];
    expect(atRiskNow(alerts, { b: "RESOLVED" })).toEqual({ totalInr: 900, openCount: 2 });
    expect(atRiskNow(alerts, {})).toEqual({ totalInr: 1200, openCount: 3 });
  });
});
