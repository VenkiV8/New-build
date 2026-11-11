import { describe, expect, it } from "vitest";
import { generateSeededDemo } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import type { Alert } from "@/lib/types";
import { ALERT_BUDGET, dataEnd, mostRecentOpen, sortForInbox, splitByAlertBudget, timeAgo } from "./inboxView";

const HOUR = 3_600_000;
const fake = (id: string, inr: number, startedAt = 0): Alert =>
  ({ id, inrAtRiskTotal: inr, startedAt }) as Alert;

describe("splitByAlertBudget", () => {
  it("pages the top 5 by ₹ and folds the lowest into the digest", () => {
    const alerts = [10, 70, 30, 60, 20, 50].map((v, i) => fake(`a${i}`, v));
    const { paged, digest } = splitByAlertBudget(alerts);
    expect(paged.map((a) => a.inrAtRiskTotal)).toEqual([70, 60, 50, 30, 20]);
    expect(digest.map((a) => a.inrAtRiskTotal)).toEqual([10]);
  });

  it("pages everything when under budget", () => {
    const { paged, digest } = splitByAlertBudget([fake("a", 1), fake("b", 2)]);
    expect(paged).toHaveLength(2);
    expect(digest).toHaveLength(0);
    expect(ALERT_BUDGET).toBe(5);
  });
});

describe("dataEnd / timeAgo on the seeded demo", () => {
  it("dates a 4h tracking break as 4h ago", () => {
    const history = generateSeededDemo();
    const now = dataEnd(history);
    const tb = detectAll(history).find((a) => a.failureClass === "TRACKING_BREAK");
    expect(tb).toBeDefined();
    expect(timeAgo(tb!.startedAt, now)).toBe("4h ago");
  });
});

describe("sortForInbox", () => {
  it("puts Resolved/Expected/Snoozed below Open and Acked, by ₹ within each group", () => {
    const alerts = [fake("big", 900), fake("mid", 500), fake("small", 100), fake("tiny", 50), fake("acked", 70)];
    const order = sortForInbox(alerts, { big: "RESOLVED", small: "SNOOZED", tiny: "EXPECTED", acked: "ACKED" });
    expect(order.map((a) => a.id)).toEqual(["mid", "acked", "big", "small", "tiny"]);
  });
});

describe("mostRecentOpen", () => {
  const alerts = [fake("old", 1, 1 * HOUR), fake("new", 1, 5 * HOUR), fake("injected", 1, 3 * HOUR)];

  it("prefers the last injected alert while it is open", () => {
    expect(mostRecentOpen(alerts, {}, "injected")?.id).toBe("injected");
  });

  it("falls back to the latest onset among open alerts", () => {
    expect(mostRecentOpen(alerts, { injected: "RESOLVED" }, "injected")?.id).toBe("new");
    expect(mostRecentOpen(alerts, { new: "SNOOZED" }, null)?.id).toBe("injected");
  });

  it("is null when nothing is open", () => {
    expect(mostRecentOpen(alerts, { old: "RESOLVED", new: "ACKED", injected: "EXPECTED" }, null)).toBeNull();
  });
});

describe("timeAgo", () => {
  it("formats minutes, hours and days", () => {
    expect(timeAgo(0, 30 * 60_000)).toBe("just now");
    expect(timeAgo(0, 3 * HOUR)).toBe("3h ago");
    expect(timeAgo(0, 50 * HOUR)).toBe("2d ago");
  });
});
