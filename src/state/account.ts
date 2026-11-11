// The demo advertiser account. Pure TS, no React.
import { CAMPAIGNS } from "@/lib/dataGenerator";

/** Fictional brand used across the UI (landing, inbox, digest mock, account menu). */
export const ADVERTISER = "Aura & Co. Skincare";
export const ADVERTISER_INITIALS = "AC";
export const OWNER = "Arjun Mehta";

/** Sum of the campaigns' daily budgets, in ₹. */
export const TOTAL_DAILY_BUDGET_INR = CAMPAIGNS.reduce((s, c) => s + c.dailyBudgetInr, 0);
