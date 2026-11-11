import { describe, expect, it } from "vitest";
import { generateSeededDemo } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import type { Alert } from "@/lib/types";
import { ALERT_BUDGET, dataEnd, protectedThisWeek, splitByAlertBudget, timeAgo } from "./inboxView";

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

describe("timeAgo", () => {
  it("formats minutes, hours and days", () => {
    expect(timeAgo(0, 30 * 60_000)).toBe("just now");
    expect(timeAgo(0, 3 * HOUR)).toBe("3h ago");
    expect(timeAgo(0, 50 * HOUR)).toBe("2d ago");
  });
});

describe("protectedThisWeek", () => {
  it("sums ₹ at risk for incidents started in the last 7 days only", () => {
    const now = 10 * 24 * HOUR;
    const alerts = [fake("new", 500, now - 2 * HOUR), fake("old", 900, now - 8 * 24 * HOUR)];
    expect(protectedThisWeek(alerts, now)).toBe(500);
  });
});
