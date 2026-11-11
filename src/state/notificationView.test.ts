import { describe, expect, it } from "vitest";
import { generateSeededDemo } from "@/lib/dataGenerator";
import { detectAll } from "@/lib/detector";
import type { Alert, Severity } from "@/lib/types";
import { buildDigest, caughtAt, SEVERITY_CHANNELS, whatsAppAlert } from "./notificationView";

const HOUR = 3_600_000;
const fake = (id: string, severity: Severity, inr: number): Alert =>
  ({ id, severity, inrAtRiskTotal: inr, failureClass: "SPEND_RUNAWAY", startedAt: 0 }) as Alert;

describe("SEVERITY_CHANNELS", () => {
  it("matches the SPEC matrix", () => {
    expect(SEVERITY_CHANNELS.SEV1).toEqual(["WhatsApp", "Push"]);
    expect(SEVERITY_CHANNELS.SEV2).toEqual(["Push", "In-app"]);
    expect(SEVERITY_CHANNELS.SEV3).toEqual(["Daily digest"]);
  });
});

describe("whatsAppAlert", () => {
  it("picks the highest-₹ open SEV1", () => {
    const alerts = [fake("a", "SEV2", 900), fake("b", "SEV1", 500), fake("c", "SEV1", 300)];
    expect(whatsAppAlert(alerts, {})?.id).toBe("b");
    expect(whatsAppAlert(alerts, { b: "RESOLVED" })?.id).toBe("c");
    expect(whatsAppAlert(alerts, { b: "ACKED", c: "SNOOZED" })).toBeNull();
  });

  it("finds the seeded SEV1 spend runaway", () => {
    const a = whatsAppAlert(detectAll(generateSeededDemo()), {});
    expect(a?.failureClass).toBe("SPEND_RUNAWAY");
  });
});

describe("caughtAt", () => {
  it("is onset + rule minHours", () => {
    expect(caughtAt({ ...fake("a", "SEV1", 1), failureClass: "TRACKING_BREAK" })).toBe(3 * HOUR);
    expect(caughtAt(fake("a", "SEV1", 1))).toBe(1 * HOUR);
  });
});

describe("buildDigest", () => {
  it("lists every alert with its routing; over-budget ones are digest-only", () => {
    const alerts = [1, 2, 3, 4, 5, 6].map((i) => fake(`a${i}`, i === 1 ? "SEV1" : i === 2 ? "SEV3" : "SEV2", 100 * (7 - i)));
    const d = buildDigest(alerts, { a3: "RESOLVED" });
    expect(d.rows).toHaveLength(6);
    expect(d.rows[0].sentVia).toBe("WhatsApp + Push");
    expect(d.rows[1].sentVia).toBe("Digest only");
    expect(d.rows[2].sentVia).toBe("Push + In-app");
    expect(d.rows[5].sentVia).toBe("Digest only (alert budget)");
    expect(d.totalAtRiskInr).toBe(2100);
    expect(d.openCount).toBe(5);
  });
});
