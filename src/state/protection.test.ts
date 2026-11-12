import { describe, expect, it } from "vitest";
import { generateSeededDemo } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import type { Alert } from "@/lib/types";
import {
  actionsFor,
  allCampaignsActive,
  atRiskNow,
  campaignStateForAction,
  exposureStopped,
  hoursLeftToday,
  isActive,
  statusForAction,
} from "./protection";

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

describe("hoursLeftToday", () => {
  it("is 3: data runs to the end of the 8–9 PM IST hour (24 − 21), derived from demoNow()", () => {
    expect(hoursLeftToday()).toBe(3);
  });
});

describe("exposureStopped", () => {
  it("pausing the c1 spend runaway credits ₹1,254 (418 × 3h), not ₹3,000", () => {
    const sr = detectAll(generateSeededDemo()).find(
      (a) => a.campaignId === "c1" && a.failureClass === "SPEND_RUNAWAY",
    )!;
    expect(sr.inrAtRiskPerHour).toBe(418);
    expect(exposureStopped(sr)).toBe(1_254);
  });

  it("is ₹/h × hours left today, capped at the campaign's daily budget", () => {
    expect(exposureStopped({ ...fake("a", 0, 86), campaignId: "c2" })).toBe(258); // 86 × 3
    expect(exposureStopped({ ...fake("a", 0, 1_000), campaignId: "c4" })).toBe(400); // ₹3,000 capped at ₹400
  });
});

describe("isActive / atRiskNow", () => {
  it("Acknowledged is not fixed: OPEN and ACKED are active, the rest closed", () => {
    expect(isActive(undefined)).toBe(true);
    expect(isActive("OPEN")).toBe(true);
    expect(isActive("ACKED")).toBe(true);
    for (const s of ["RESOLVED", "EXPECTED", "SNOOZED"] as const) expect(isActive(s)).toBe(false);
  });

  it("At risk now counts OPEN + ACKED; the bell (unacked) counts OPEN only", () => {
    const alerts = [fake("a", 800), fake("b", 300), fake("c", 100), fake("d", 50)];
    expect(atRiskNow(alerts, { b: "ACKED", c: "RESOLVED", d: "SNOOZED" })).toEqual({
      totalInr: 1_100,
      activeCount: 2,
      unackedCount: 1,
    });
    expect(atRiskNow(alerts, {})).toEqual({ totalInr: 1_250, activeCount: 4, unackedCount: 4 });
  });
});

describe("campaignStateForAction", () => {
  it("Pause campaign → paused, Cap today's budget → capped, others → no change", () => {
    expect(campaignStateForAction("Pause campaign")).toBe("paused");
    expect(campaignStateForAction("Cap today's budget")).toBe("capped");
    expect(campaignStateForAction("Snooze 24h")).toBeNull();
    expect(campaignStateForAction("Mark fixed")).toBeNull();
    expect(Object.values(allCampaignsActive())).toEqual(["active", "active", "active", "active"]);
  });
});
