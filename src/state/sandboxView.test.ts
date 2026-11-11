import { describe, expect, it } from "vitest";
import { backtestRule } from "@/lib/backtest";
import { DEMO_NOW_TS, generateHistory, istParts } from "@/lib/dataGenerator";
import { DEFAULT_RULES } from "@/lib/detector";
import { firingsByDay, istMidnight } from "./sandboxView";

const HOUR = 3_600_000;
/** epoch ms for an IST wall-clock time in Nov 2026 (IST = UTC+05:30) */
const ist = (day: number, hour: number, minute = 0) => Date.UTC(2026, 10, day, hour, minute) - 5.5 * HOUR;

describe("istMidnight", () => {
  it("snaps to 00:00 IST regardless of the viewer's zone", () => {
    const m = istMidnight(DEMO_NOW_TS); // Tue 10 Nov 2026, 8:00 PM IST
    expect(m).toBe(ist(10, 0));
    expect(istParts(m)).toMatchObject({ date: 10, hours: 0 });
    // 00:30 IST is 19:00 UTC the previous day: still the IST day it belongs to
    expect(istMidnight(ist(11, 0, 30))).toBe(ist(11, 0));
  });
});

describe("firingsByDay", () => {
  it("returns 30 consecutive IST days ending on the demo day, including zero days", () => {
    const b = firingsByDay([], DEMO_NOW_TS);
    expect(b).toHaveLength(30);
    expect(b.every((x) => x.count === 0)).toBe(true);
    expect(istParts(b[29].ts).date).toBe(10); // 10 Nov
    expect(istParts(b[0].ts)).toMatchObject({ month: 9, date: 12 }); // 12 Oct
  });

  it("buckets by IST calendar day", () => {
    const f = (d: number, h: number) => ({ ts: ist(d, h), campaignId: "c1" });
    // 10 Nov 00:30 IST is 9 Nov in UTC: must still count on 10 Nov
    const b = firingsByDay([f(10, 1), f(10, 19), { ts: ist(10, 0, 30), campaignId: "c1" }, f(9, 23), f(1, 5)], DEMO_NOW_TS);
    expect(b[29].count).toBe(3);
    expect(b[28].count).toBe(1);
    expect(b.reduce((s, x) => s + x.count, 0)).toBe(5);
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
