import { createContext, useContext } from "react";
import type { Alert, AlertStatus, CampaignHistory, FailureClass, RuleConfig } from "@/lib/types";
import type { InjectableClass } from "./injection";
import type { CampaignState } from "./protection";

export interface AppState {
  history: CampaignHistory;
  alerts: Alert[];
  /** alertId → status; alerts missing from the map are OPEN */
  statuses: Record<string, AlertStatus>;
  /** ₹ exposure stopped for the rest of today by fixes this session (resets with the demo) */
  protectedInr: number;
  /** per campaign: active / paused (Pause campaign) / capped (Cap today's budget); reset restores active */
  campaignState: Record<string, CampaignState>;
  /** apply a suggested action: sets the alert's status; fixes add to protectedInr */
  applyAction: (alertId: string, action: string) => void;
  inject: (failureClass: InjectableClass) => void;
  /** id of the alert the last inject created (null after reset / if none) */
  lastInjectedId: string | null;
  /** live rule set (DEFAULT_RULES with on/off applied); detection runs with these */
  rules: RuleConfig[];
  /** turn a rule family on/off for live detection; re-runs detectAll */
  setRuleEnabled: (failureClass: FailureClass, enabled: boolean) => void;
  resetDemo: () => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
