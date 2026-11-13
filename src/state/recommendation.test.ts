import { describe, expect, it } from "vitest";
import { generateSeededDemo } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import { creditForAction, MARK_FIXED_ACTION, statusForAction } from "./protection";
import { pastTenseFor, RECOMMENDATION_REASON, recommendationFor } from "./recommendation";

const seeded = () => {
  const alerts = detectAll(generateSeededDemo());
  return (fc: string) => alerts.find((a) => a.failureClass === fc)!;
};

describe("recommendationFor", () => {
  it("is driven by suggestedActions[0], so it differs by class", () => {
    const by = seeded();
    expect(recommendationFor(by("SPEND_RUNAWAY")).action).toBe("Cap today's budget");
    expect(recommendationFor(by("TRACKING_BREAK")).action).toBe("Open tracking checklist");
    expect(recommendationFor(by("DRIFT")).action).toBe("Rotate creative");
    expect(recommendationFor(by("DRIFT")).reason).toBe(RECOMMENDATION_REASON.DRIFT);
    expect(recommendationFor(by("SPEND_RUNAWAY")).others).toEqual(["Pause campaign", "Mark expected (sale day)", "Snooze 24h"]);
  });
});

describe("predicted saving = Protected credit", () => {
  it("c1 spend runaway: ₹1,254 shown before the click, ₹1,254 credited after", () => {
    const sr = seeded()("SPEND_RUNAWAY");
    const rec = recommendationFor(sr);
    expect(rec.savingInr).toBe(1_254);
    const credited = creditForAction(sr, rec.action, undefined /* OPEN */);
    expect(credited).toBe(rec.savingInr);
  });

  it("holds for every class whose fix resolves (tracking break resolves via Mark fixed)", () => {
    const by = seeded();
    for (const fc of ["SPEND_RUNAWAY", "DRIFT", "TRACKING_BREAK"]) {
      const a = by(fc);
      const rec = recommendationFor(a);
      const fix = statusForAction(rec.action) === "RESOLVED" ? rec.action : MARK_FIXED_ACTION;
      expect(creditForAction(a, fix, "OPEN")).toBe(rec.savingInr);
    }
  });

  it("no double credit; snooze / mark expected credit nothing", () => {
    const sr = seeded()("SPEND_RUNAWAY");
    expect(creditForAction(sr, "Pause campaign", "RESOLVED")).toBe(0);
    expect(creditForAction(sr, "Snooze 24h", "OPEN")).toBe(0);
    expect(creditForAction(sr, "Mark expected (sale day)", "OPEN")).toBe(0);
    expect(creditForAction(sr, "Open tracking checklist", "OPEN")).toBe(0);
  });
});

describe("pastTenseFor (success strip copy)", () => {
  it("phrases each action in the past tense", () => {
    expect(pastTenseFor("Cap today's budget")).toBe("Budget capped");
    expect(pastTenseFor("Pause campaign")).toBe("Campaign paused");
    expect(pastTenseFor("Mark fixed")).toBe("Tracking marked fixed");
    expect(pastTenseFor("Rotate creative")).toBe("Creative rotation started");
    expect(pastTenseFor("Fix billing / review status")).toBe("Billing/review flagged as fixed");
    expect(pastTenseFor("Raise bid cap")).toBe("Bid cap raised");
    expect(pastTenseFor("Spread budget with pacing")).toBe("Pacing enabled");
    expect(pastTenseFor("Raise daily budget")).toBe("Daily budget raised");
    expect(pastTenseFor("Snooze 24h")).toBe("Snoozed for 24 h");
    expect(pastTenseFor("Mark expected (sale day)")).toBe("Marked as expected");
    expect(pastTenseFor("Mark expected")).toBe("Marked as expected");
    expect(pastTenseFor(undefined)).toBe("Resolved");
  });

  it("covers every action the detector suggests (no raw button labels leak through)", () => {
    const actions = detectAll(generateSeededDemo()).flatMap((a) => a.suggestedActions);
    for (const a of [...actions, "Review placements", "Ignore today", "Raise bid cap", "Spread budget with pacing", "Raise daily budget"]) {
      if (a === "Open tracking checklist") continue; // acks, never closes → no strip
      expect(pastTenseFor(a)).not.toBe("Resolved");
    }
  });
});
