import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CAMPAIGNS, generateSeededDemo, injectIncident } from "@/lib/dataGenerator";
import { DEFAULT_RULES, detectAll } from "@/lib/detector";
import type { Alert, AlertStatus, CampaignHistory, FailureClass } from "@/lib/types";
import { formatInr } from "@/utils/format";
import { AppContext, type AppState } from "./appContext";
import { newAlerts, pickInjection, type InjectableClass } from "./injection";

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
    toast.success("Demo reset", { description: "Back to the 3 seeded incidents." });
  }, []);

  const value = useMemo<AppState>(
    () => ({ history: data.history, alerts: data.alerts, statuses, inject, resetDemo }),
    [data, statuses, inject, resetDemo],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
