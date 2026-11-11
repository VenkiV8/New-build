import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CAMPAIGNS, generateSeededDemo } from "@/lib/dataGenerator";
import { DEFAULT_RULES, detectAll } from "@/lib/detector";
import type { Alert, AlertStatus, CampaignHistory, FailureClass, RuleConfig } from "@/lib/types";
import { formatDate, formatInr } from "@/utils/format";
import { AppContext, type AppState } from "./appContext";
import { planInjection, type InjectableClass } from "./injection";
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
  const [lastInjectedId, setLastInjectedId] = useState<string | null>(null);

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
        toast.success(`Up to ${formatInr(stopped)}/day exposure stopped`, {
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
      // Plan on a copy first: live data changes only if a new alert is confirmed.
      const plan = planInjection(failureClass, data.history, data.alerts, data.rules);
      if (plan.kind === "allOpen") {
        toast(`${classLabel(failureClass)} already open on ${plan.targets.map(campaignName).join(", ")}`, {
          description: "Reset the demo to inject it again.",
        });
        return;
      }
      if (plan.kind === "noSignal") {
        toast(`No campaign would trip ${classLabel(failureClass)} right now`, {
          description: `Open incidents on ${plan.targets.map(campaignName).join(", ")} mask it. Reset the demo to inject it again.`,
        });
        return;
      }
      const { added } = plan;
      setData({ ...data, history: plan.history, alerts: plan.alerts });
      setLastInjectedId(added.id);
      toast.error(`${added.severity} · ${classLabel(added.failureClass)}: ${campaignName(added.campaignId)}`, {
        description: `${formatInr(added.inrAtRiskPerHour)}/h at risk. ${added.headline}`,
      });
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
    setLastInjectedId(null);
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
      lastInjectedId,
      setRuleEnabled,
      resetDemo,
    }),
    [data, statuses, protectedInr, applyAction, inject, lastInjectedId, setRuleEnabled, resetDemo],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
