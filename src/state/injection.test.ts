import { describe, expect, it } from "vitest";
import { detectAll } from "@/lib/detector";
import { generateHistory, generateSeededDemo, injectIncident } from "@/lib/dataGenerator";
import { newAlerts, pickInjection } from "./injection";

describe("pickInjection", () => {
  it("sends a tracking break to c1 when c2 is already broken (seeded demo)", () => {
    const alerts = detectAll(generateSeededDemo());
    expect(pickInjection("TRACKING_BREAK", alerts).campaignId).toBe("c1");
  });

  it("sends a tracking break to c2 when c2 is healthy", () => {
    const alerts = detectAll(generateHistory(42));
    expect(pickInjection("TRACKING_BREAK", alerts).campaignId).toBe("c2");
  });

  it("maps spend runaway to c1 and delivery failure to c4", () => {
    expect(pickInjection("SPEND_RUNAWAY", []).campaignId).toBe("c1");
    expect(pickInjection("DELIVERY_FAILURE", []).campaignId).toBe("c4");
  });
});

describe("inject on the seeded demo", () => {
  it.each(["TRACKING_BREAK", "DELIVERY_FAILURE"] as const)("%s produces a new alert", (fc) => {
    const history = generateSeededDemo();
    const before = detectAll(history);
    const inj = pickInjection(fc, before);
    const after = detectAll(injectIncident(history, inj));
    const added = newAlerts(before, after);
    expect(added.some((a) => a.failureClass === fc && a.campaignId === inj.campaignId)).toBe(true);
  });
});
