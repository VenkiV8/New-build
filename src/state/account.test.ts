import { describe, expect, it } from "vitest";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { ADVERTISER, TOTAL_DAILY_BUDGET_INR } from "./account";

describe("account", () => {
  it("is the fictional brand with 4 campaigns totalling ₹7,000/day", () => {
    expect(ADVERTISER).toBe("Aura & Co. Skincare");
    expect(CAMPAIGNS).toHaveLength(4);
    expect(TOTAL_DAILY_BUDGET_INR).toBe(7_000);
  });
});
