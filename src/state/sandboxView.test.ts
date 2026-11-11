import { describe, expect, it } from "vitest";
import { backtestRule } from "@/lib/backtest";
import { generateHistory } from "@/lib/dataGenerator";
import { DEFAULT_RULES } from "@/lib/detector";
import { firingsByDay } from "./sandboxView";

describe("firingsByDay", () => {
  it("returns 30 consecutive days including zero days", () => {
    const end = new Date(2026, 10, 11, 20).getTime();
    const b = firingsByDay([], end);
    expect(b).toHaveLength(30);
    expect(b.every((x) => x.count === 0)).toBe(true);
    expect(new Date(b[29].ts).getDate()).toBe(11);
    expect(new Date(b[0].ts).getDate()).toBe(13); // 13 Oct
  });

  it("buckets by local calendar day", () => {
    const end = new Date(2026, 10, 11, 20).getTime();
    const f = (d: number, h: number) => ({ ts: new Date(2026, 10, d, h).getTime(), campaignId: "c1" });
    const b = firingsByDay([f(11, 1), f(11, 19), f(10, 23), f(1, 5)], end);
    expect(b[29].count).toBe(2);
    expect(b[28].count).toBe(1);
    expect(b.reduce((s, x) => s + x.count, 0)).toBe(4);
  });

  it("accounts for every spend-runaway backtest firing", () => {
    const history = generateHistory(42);
    const rule = DEFAULT_RULES.find((r) => r.failureClass === "SPEND_RUNAWAY")!;
    const res = backtestRule(rule, { history });
    const end = history.c1[history.c1.length - 1].ts;
    const total = firingsByDay(res.firings, end).reduce((s, x) => s + x.count, 0);
    expect(total).toBe(res.firings.length);
  });
});
