import { createContext, useContext } from "react";
import type { Alert, AlertStatus, CampaignHistory } from "@/lib/types";
import type { InjectableClass } from "./injection";

export interface AppState {
  history: CampaignHistory;
  alerts: Alert[];
  /** alertId → status; alerts missing from the map are OPEN */
  statuses: Record<string, AlertStatus>;
  inject: (failureClass: InjectableClass) => void;
  resetDemo: () => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
