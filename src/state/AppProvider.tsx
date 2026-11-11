import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CAMPAIGNS, generateSeededDemo, injectIncident } from "@/lib/dataGenerator";
import { DEFAULT_RULES, detectAll } from "@/lib/detector";
import type { Alert, AlertStatus, CampaignHistory, FailureClass } from "@/lib/types";
import { formatDate, formatInr } from "@/utils/format";
import { AppContext, type AppState } from "./appContext";
import { newAlerts, pickInjection, type InjectableClass } from "./injection";
import { exposureStopped, statusForAction } from "./protection";

interface Data {
  history: CampaignHistory;
  alerts: Alert[];
}

function seededData(): Data {
  const history = generateSeededDemo();
  return { history, alerts: detectAll(history) };
}

const campaignName = (id: string) => CAMPAIGNS.find((c) => c.id === id)?.name ?? id;
const classLabel = (fc: FailureClass) => DEFAULT_RULES.find((r) => r.failureClass === fc)?.label ?? fc;

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(seededData);
  const [statuses, setStatuses] = useState<Record<string, AlertStatus>>({});
  const [protectedInr, setProtectedInr] = useState(0);

  const applyAction = useCallback(
    (alertId: string, action: string) => {
      const alert = data.alerts.find((a) => a.id === alertId);
      if (!alert) return;
      const next = statusForAction(action);
      const wasResolved = statuses[alertId] === "RESOLVED";
      setStatuses((s) => ({ ...s, [alertId]: next }));
      if (next === "RESOLVED" && !wasResolved) {
        const stopped = exposureStopped(alert);
        setProtectedInr((p) => p + stopped);
        toast.success(`${formatInr(stopped)}/day exposure stopped`, {
          description: `${action}: ${campaignName(alert.campaignId)}`,
        });
      } else if (next === "SNOOZED") {
        toast(`Snoozed for 24h: ${campaignName(alert.campaignId)}`, {
          description: "You'll be paged again only if severity escalates.",
        });
      } else if (next === "EXPECTED") {
        toast(`Marked expected: ${campaignName(alert.campaignId)}`, {
          description: `${formatDate(alert.startedAt)} added to this campaign's expected-events calendar, so the baseline learns.`,
        });
      }
    },
    [data.alerts, statuses],
  );

  const inject = useCallback(
    (failureClass: InjectableClass) => {
      const injection = pickInjection(failureClass, data.alerts);
      const history = injectIncident(data.history, injection);
      const alerts = detectAll(history);
      setData({ history, alerts });

      const added = newAlerts(data.alerts, alerts).find(
        (a) => a.failureClass === failureClass && a.campaignId === injection.campaignId,
      );
      if (added) {
        toast.error(`${added.severity} · ${classLabel(added.failureClass)}: ${campaignName(added.campaignId)}`, {
          description: `${formatInr(added.inrAtRiskPerHour)}/h at risk. ${added.headline}`,
        });
      } else {
        toast(`${classLabel(failureClass)} already open on ${campaignName(injection.campaignId)}`, {
          description: "Reset the demo to inject it again.",
        });
      }
    },
    [data],
  );

  const resetDemo = useCallback(() => {
    setData(seededData());
    setStatuses({});
    setProtectedInr(0);
    toast.success("Demo reset", { description: "Back to the 3 seeded incidents." });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      history: data.history,
      alerts: data.alerts,
      statuses,
      protectedInr,
      applyAction,
      inject,
      resetDemo,
    }),
    [data, statuses, protectedInr, applyAction, inject, resetDemo],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
