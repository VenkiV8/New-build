import { describe, expect, it } from "vitest";
import { detectAll } from "@/lib/detector";
import { planInjection } from "./injection";
import {
  clearSaved,
  freshSession,
  loadSession,
  persistSession,
  serialize,
  STORAGE_KEY,
  type DemoSession,
  type StorageLike,
} from "./persistence";
import { atRiskNow } from "./protection";

/** In-memory localStorage stand-in. */
function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

/** Storage that throws on every call (Safari private mode / blocked storage). */
const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

/** Drive a realistic session: two injections, decisions, a rule off, a ₹ credit. */
function busySession(): DemoSession {
  let s = freshSession();
  for (const fc of ["TRACKING_BREAK", "DELIVERY_FAILURE"] as const) {
    const plan = planInjection(fc, s.history, s.alerts, s.rules, s.statuses, s.campaignState);
    if (plan.kind !== "ok") throw new Error("expected injection to succeed");
    s = { ...s, history: plan.history, alerts: plan.alerts, injections: [...s.injections, plan.injection] };
  }
  const sr = s.alerts.find((a) => a.campaignId === "c1" && a.failureClass === "SPEND_RUNAWAY")!;
  const tb = s.alerts.find((a) => a.campaignId === "c1" && a.failureClass === "TRACKING_BREAK")!;
  const rules = s.rules.map((r) => (r.failureClass === "DRIFT" ? { ...r, enabled: false } : r));
  return {
    ...s,
    rules,
    alerts: detectAll(s.history, { rules }),
    statuses: { [sr.id]: "RESOLVED", [tb.id]: "ACKED" },
    campaignState: { ...s.campaignState, c1: "paused" },
    protectedInr: 1_254,
  };
}

describe("seeded first load", () => {
  it("is unchanged with no saved state: ₹1,508 at risk across 3 incidents", () => {
    const s = loadSession(memoryStorage());
    expect(s.alerts).toHaveLength(3);
    expect(atRiskNow(s.alerts, s.statuses).totalInr).toBe(1_508);
  });

  it("does not write anything for a pristine session", () => {
    const storage = memoryStorage();
    persistSession(freshSession(), storage);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });
});

describe("(a) serialize → load round trip", () => {
  it("restores the same alerts, statuses, campaign state, rules and protected ₹", () => {
    const before = busySession();
    const storage = memoryStorage();
    persistSession(before, storage);
    const saved = JSON.parse(storage.data.get(STORAGE_KEY)!);
    expect(saved.v).toBe(1);
    expect(saved.injections).toEqual([
      { campaignId: "c1", failureClass: "TRACKING_BREAK", hours: 4 },
      { campaignId: "c4", failureClass: "DELIVERY_FAILURE", hours: 3 },
    ]);

    const after = loadSession(storage);
    expect(after.alerts.map((a) => [a.id, a.headline, a.inrAtRiskTotal])).toEqual(
      before.alerts.map((a) => [a.id, a.headline, a.inrAtRiskTotal]),
    );
    expect(after.statuses).toEqual(before.statuses);
    expect(after.campaignState).toEqual(before.campaignState);
    expect(after.protectedInr).toBe(1_254);
    expect(after.rules.find((r) => r.failureClass === "DRIFT")?.enabled).toBe(false);
    expect(serialize(after)).toEqual(serialize(before));
  });

  it("drops status entries whose alert no longer exists", () => {
    const before = busySession();
    const storage = memoryStorage();
    persistSession({ ...before, statuses: { ...before.statuses, "c9-GHOST-1": "RESOLVED" } }, storage);
    expect(loadSession(storage).statuses).toEqual(before.statuses);
  });
});

describe("(b) bad saved state → fresh start, key removed", () => {
  it.each([
    ["corrupt JSON", "{not json"],
    ["wrong version", JSON.stringify({ ...serialize(freshSession()), v: 2 })],
    ["unknown field", JSON.stringify({ ...serialize(freshSession()), extra: true })],
    [
      "unknown campaign in an injection",
      JSON.stringify({ ...serialize(freshSession()), injections: [{ campaignId: "c9", failureClass: "SPEND_RUNAWAY", hours: 2 }] }),
    ],
    ["bad status value", JSON.stringify({ ...serialize(freshSession()), statuses: { x: "DONE" } })],
  ])("%s → seeded demo with ₹1,508 at risk", (_, raw) => {
    const storage = memoryStorage({ [STORAGE_KEY]: raw });
    const s = loadSession(storage);
    expect(s.alerts).toHaveLength(3);
    expect(atRiskNow(s.alerts, s.statuses).totalInr).toBe(1_508);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });

  it("blocked storage never throws: load is fresh, save and clear are no-ops", () => {
    expect(() => loadSession(throwingStorage)).not.toThrow();
    expect(atRiskNow(loadSession(throwingStorage).alerts, {}).totalInr).toBe(1_508);
    expect(() => persistSession(busySession(), throwingStorage)).not.toThrow();
    expect(() => clearSaved(throwingStorage)).not.toThrow();
    expect(() => loadSession(null)).not.toThrow();
  });
});

describe("(c) Reset demo", () => {
  it("leaves no key behind: clear + the pristine save after it", () => {
    const storage = memoryStorage();
    persistSession(busySession(), storage);
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
    // what resetDemo does: clear the key, then the state-change save runs with a fresh session
    clearSaved(storage);
    persistSession(freshSession(), storage);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
    expect(atRiskNow(loadSession(storage).alerts, {}).totalInr).toBe(1_508);
  });
});

describe("tour progress persistence", () => {
  it("round-trips tour progress; tour alone makes the session worth saving", () => {
    const storage = memoryStorage();
    const s = { ...freshSession(), tour: { injected: false, openedIncident: true, sawRootCause: false, visitedRules: true } };
    persistSession(s, storage);
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
    expect(loadSession(storage).tour).toEqual(s.tour);
  });

  it("older saves without a tour field still load (no steps done)", () => {
    const { tour: _omit, ...legacy } = serialize(busySession());
    void _omit;
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(legacy) });
    const s = loadSession(storage);
    expect(s.injections).toHaveLength(2);
    expect(Object.values(s.tour).every((v) => v === false)).toBe(true);
  });

  it("a bad tour value → fresh start", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ ...serialize(busySession()), tour: { injected: "yes" } }) });
    expect(loadSession(storage).injections).toHaveLength(0);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });
});

describe("actions taken (incident success strip)", () => {
  it("round-trips the action that closed each alert; drops ones whose alert is no longer closed", () => {
    const s = busySession();
    const resolvedId = Object.entries(s.statuses).find(([, v]) => v === "RESOLVED")![0];
    const storage = memoryStorage();
    persistSession({ ...s, actionsTaken: { [resolvedId]: "Cap today's budget", "c9-GHOST-1": "Pause campaign" } }, storage);
    expect(loadSession(storage).actionsTaken).toEqual({ [resolvedId]: "Cap today's budget" });
  });

  it("a bad action value → fresh start", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ ...serialize(busySession()), actions: { x: 42 } }) });
    expect(loadSession(storage).injections).toHaveLength(0);
  });
});
