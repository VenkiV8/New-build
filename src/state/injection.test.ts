import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, detectAll } from "@/lib/detector";
import { generateHistory, generateSeededDemo } from "@/lib/dataGenerator";
import type { CampaignHistory } from "@/lib/types";
import { newAlerts, pickInjection, planInjection } from "./injection";

describe("pickInjection", () => {
  it("sends a tracking break to c1 when c2 is already broken (seeded demo)", () => {
    const alerts = detectAll(generateSeededDemo());
    expect(pickInjection("TRACKING_BREAK", alerts)?.campaignId).toBe("c1");
  });

  it("sends a tracking break to c2 when c2 is healthy", () => {
    const alerts = detectAll(generateHistory(42));
    expect(pickInjection("TRACKING_BREAK", alerts)?.campaignId).toBe("c2");
  });

  it("routes spend runaway c1 → c3 → c2 and refuses when all three have one", () => {
    expect(pickInjection("SPEND_RUNAWAY", [])?.campaignId).toBe("c1");
    // seeded demo already has a spend runaway on c1
    expect(pickInjection("SPEND_RUNAWAY", detectAll(generateSeededDemo()))?.campaignId).toBe("c3");
    const sr = (campaignId: string) => ({ campaignId, failureClass: "SPEND_RUNAWAY" }) as never;
    expect(pickInjection("SPEND_RUNAWAY", [sr("c1"), sr("c3")])?.campaignId).toBe("c2");
    expect(pickInjection("SPEND_RUNAWAY", [sr("c1"), sr("c3"), sr("c2")])).toBeNull();
  });

  it("maps delivery failure to c4 and refuses a second one", () => {
    expect(pickInjection("DELIVERY_FAILURE", [])?.campaignId).toBe("c4");
    expect(
      pickInjection("DELIVERY_FAILURE", [{ campaignId: "c4", failureClass: "DELIVERY_FAILURE" } as never]),
    ).toBeNull();
  });
});

describe("planInjection on the seeded demo", () => {
  const seeded = () => {
    const history = generateSeededDemo();
    return { history, alerts: detectAll(history, { rules: DEFAULT_RULES }) };
  };

  it.each([
    ["TRACKING_BREAK", "c1"],
    ["DELIVERY_FAILURE", "c4"],
    ["SPEND_RUNAWAY", "c2"], // c1 already has one; c3's seeded drift masks a spend surge
  ] as const)("%s produces a new alert on %s", (fc, cid) => {
    const { history, alerts } = seeded();
    const plan = planInjection(fc, history, alerts, DEFAULT_RULES);
    expect(plan.kind).toBe("ok");
    if (plan.kind !== "ok") return;
    expect(plan.injection.campaignId).toBe(cid);
    expect(plan.added.failureClass).toBe(fc);
  });

  it("never mutates the input history", () => {
    const { history, alerts } = seeded();
    const before = JSON.stringify(history.c1);
    planInjection("SPEND_RUNAWAY", history, alerts, DEFAULT_RULES);
    planInjection("TRACKING_BREAK", history, alerts, DEFAULT_RULES);
    expect(JSON.stringify(history.c1)).toBe(before);
  });

  it("keeps c1 untouched when it already has a spend runaway (no 406% → 1056%)", () => {
    const { history, alerts } = seeded();
    const plan = planInjection("SPEND_RUNAWAY", history, alerts, DEFAULT_RULES);
    if (plan.kind !== "ok") throw new Error("expected ok");
    expect(plan.history.c1).toBe(history.c1);
    const c1 = plan.alerts.find((a) => a.campaignId === "c1" && a.failureClass === "SPEND_RUNAWAY");
    expect(c1?.headline).toContain("406%");
  });

  it("on clean data, spend runaway goes c1 → c3 → c2, then reports blocked", () => {
    let history: CampaignHistory = generateHistory(42);
    let alerts = detectAll(history, { rules: DEFAULT_RULES });
    const hit: string[] = [];
    for (let i = 0; i < 4; i++) {
      const plan = planInjection("SPEND_RUNAWAY", history, alerts, DEFAULT_RULES);
      if (plan.kind !== "ok") {
        expect(plan.kind).toBe("blocked");
        break;
      }
      expect(newAlerts(alerts, plan.alerts).length).toBeGreaterThan(0);
      hit.push(plan.injection.campaignId);
      ({ history, alerts } = plan);
    }
    expect(hit).toEqual(["c1", "c3", "c2"]);
  });

  it("on the seeded demo, a second spend runaway click reports all open (c3 masked)", () => {
    const { history, alerts } = seeded();
    const first = planInjection("SPEND_RUNAWAY", history, alerts, DEFAULT_RULES);
    if (first.kind !== "ok") throw new Error("expected ok");
    const second = planInjection("SPEND_RUNAWAY", first.history, first.alerts, DEFAULT_RULES);
    expect(second.kind).toBe("noSignal");
  });
});

describe("campaign state and closed incidents", () => {
  const seeded = () => {
    const history = generateSeededDemo();
    return { history, alerts: detectAll(history, { rules: DEFAULT_RULES }) };
  };

  it("skips paused campaigns and reports blocked when every target is paused or active", () => {
    const { history, alerts } = seeded();
    // tracking break: c2 has an active one, c1 paused → nothing eligible
    const plan = planInjection("TRACKING_BREAK", history, alerts, DEFAULT_RULES, {}, { c1: "paused" });
    expect(plan.kind).toBe("blocked");
    // delivery failure on c4: paused → blocked
    expect(planInjection("DELIVERY_FAILURE", history, alerts, DEFAULT_RULES, {}, { c4: "paused" }).kind).toBe("blocked");
    // capped does not block
    expect(planInjection("DELIVERY_FAILURE", history, alerts, DEFAULT_RULES, {}, { c4: "capped" }).kind).toBe("ok");
  });

  it("a RESOLVED incident does not block: re-injecting on that campaign reopens it", () => {
    const { history, alerts } = seeded();
    const c1sr = alerts.find((a) => a.campaignId === "c1" && a.failureClass === "SPEND_RUNAWAY")!;
    // active (OPEN) → c1 skipped, goes to c2
    const whileOpen = planInjection("SPEND_RUNAWAY", history, alerts, DEFAULT_RULES, {});
    expect(whileOpen.kind === "ok" && whileOpen.injection.campaignId).toBe("c2");
    // ACKED still blocks c1
    const whileAcked = planInjection("SPEND_RUNAWAY", history, alerts, DEFAULT_RULES, { [c1sr.id]: "ACKED" });
    expect(whileAcked.kind === "ok" && whileAcked.injection.campaignId).toBe("c2");
    // RESOLVED → c1 eligible again; same incident re-fires and is flagged for reopening
    const afterFix = planInjection("SPEND_RUNAWAY", history, alerts, DEFAULT_RULES, { [c1sr.id]: "RESOLVED" });
    expect(afterFix.kind).toBe("ok");
    if (afterFix.kind !== "ok") return;
    expect(afterFix.injection.campaignId).toBe("c1");
    expect(afterFix.added.failureClass).toBe("SPEND_RUNAWAY");
    expect(afterFix.recurred).toBe(true);
    // ...but not if c1 was paused by the fix
    const paused = planInjection("SPEND_RUNAWAY", history, alerts, DEFAULT_RULES, { [c1sr.id]: "RESOLVED" }, { c1: "paused" });
    expect(paused.kind === "ok" && paused.injection.campaignId).toBe("c2");
  });
});
