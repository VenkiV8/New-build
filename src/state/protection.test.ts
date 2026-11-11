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
    expect(statusForAction("Open tracking checklist")).toBe("RESOLVED");
    expect(statusForAction("Fix billing / review status")).toBe("RESOLVED");
    expect(statusForAction("Snooze 24h")).toBe("SNOOZED");
    expect(statusForAction("Mark expected (sale day)")).toBe("EXPECTED");
    expect(statusForAction("Mark expected")).toBe("EXPECTED");
    expect(statusForAction("Ignore today")).toBe("EXPECTED");
  });

  it("classifies every action the detector suggests", () => {
    const actions = detectAll(generateSeededDemo()).flatMap((a) => a.suggestedActions);
    expect(actions.length).toBeGreaterThan(0);
    for (const a of actions) expect(["RESOLVED", "SNOOZED", "EXPECTED"]).toContain(statusForAction(a));
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
  it("is ₹/h at risk × 24", () => {
    expect(exposureStopped(fake("a", 0, 418))).toBe(10_032);
  });
});

describe("atRiskNow", () => {
  it("sums only OPEN alerts; missing status counts as OPEN", () => {
    const alerts = [fake("a", 800), fake("b", 300), fake("c", 100)];
    expect(atRiskNow(alerts, { b: "RESOLVED" })).toEqual({ totalInr: 900, openCount: 2 });
    expect(atRiskNow(alerts, {})).toEqual({ totalInr: 1200, openCount: 3 });
  });
});
