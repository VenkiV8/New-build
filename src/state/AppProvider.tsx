import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CAMPAIGNS, generateSeededDemo, injectIncident } from "@/lib/dataGenerator";
import { DEFAULT_RULES, detectAll } from "@/lib/detector";
import type { Alert, AlertStatus, CampaignHistory, FailureClass, RuleConfig } from "@/lib/types";
import { formatDate, formatInr } from "@/utils/format";
import { AppContext, type AppState } from "./appContext";
import { newAlerts, pickInjection, type InjectableClass } from "./injection";
import { exposureStopped, statusForAction } from "./protection";

interface Data {
  history: CampaignHistory;
  rules: RuleConfig[];
  alerts: Alert[];
}

function seededData(): Data {
  const history = generateSeededDemo();
  return { history, rules: DEFAULT_RULES, alerts: detectAll(history, { rules: DEFAULT_RULES }) };
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
      if (!data.rules.find((r) => r.failureClass === failureClass)?.enabled) {
        toast(`${classLabel(failureClass)} rule is off`, {
          description: "Turn it back on in Rules to see it fire.",
        });
        return;
      }
      const injection = pickInjection(failureClass, data.alerts);
      const history = injectIncident(data.history, injection);
      const alerts = detectAll(history, { rules: data.rules });
      setData({ ...data, history, alerts });

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

  const setRuleEnabled = useCallback((failureClass: FailureClass, enabled: boolean) => {
    setData((d) => {
      const rules = d.rules.map((r) => (r.failureClass === failureClass ? { ...r, enabled } : r));
      return { ...d, rules, alerts: detectAll(d.history, { rules }) };
    });
    toast(`${classLabel(failureClass)} rule ${enabled ? "on" : "off"}`, {
      description: enabled ? "Detection re-run on current data." : "Its alerts are removed from the inbox until it's back on.",
    });
  }, []);

  const resetDemo = useCallback(() => {
    setData(seededData());
    setStatuses({});
    setProtectedInr(0);
    toast.success("Demo reset", { description: "Back to the 3 seeded incidents, all rules on." });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      history: data.history,
      rules: data.rules,
      alerts: data.alerts,
      statuses,
      protectedInr,
      applyAction,
      inject,
      setRuleEnabled,
      resetDemo,
    }),
    [data, statuses, protectedInr, applyAction, inject, setRuleEnabled, resetDemo],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
