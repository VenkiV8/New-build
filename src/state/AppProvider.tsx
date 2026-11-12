import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { DEFAULT_RULES, detectAll } from "@/lib/detector";
import type { Alert, AlertStatus, CampaignHistory, FailureClass, IncidentInjection, RuleConfig } from "@/lib/types";
import { formatInr } from "@/utils/format";
import { AppContext, type AppState } from "./appContext";
import { planInjection, type InjectableClass } from "./injection";
import { clearSaved, freshSession, loadSession, persistSession, type DemoSession } from "./persistence";
import {
  campaignStateForAction,
  exposureStopped,
  hoursLeftToday,
  statusForAction,
  type CampaignState,
} from "./protection";

interface Data {
  history: CampaignHistory;
  rules: RuleConfig[];
  alerts: Alert[];
  /** injections applied so far, in order (persisted; replayed on load) */
  injections: IncidentInjection[];
}

const dataOf = (s: DemoSession): Data => ({
  history: s.history,
  rules: s.rules,
  alerts: s.alerts,
  injections: s.injections,
});

const campaignName = (id: string) => CAMPAIGNS.find((c) => c.id === id)?.name ?? id;
const classLabel = (fc: FailureClass) => DEFAULT_RULES.find((r) => r.failureClass === fc)?.label ?? fc;

export function AppProvider({ children }: { children: ReactNode }) {
  // Saved session from localStorage if valid, else the seeded demo (identical first load).
  const [boot] = useState(loadSession);
  const [data, setData] = useState<Data>(() => dataOf(boot));
  const [statuses, setStatuses] = useState<Record<string, AlertStatus>>(boot.statuses);
  const [protectedInr, setProtectedInr] = useState(boot.protectedInr);
  const [lastInjectedId, setLastInjectedId] = useState<string | null>(null);
  const [campaignState, setCampaignState] = useState<Record<string, CampaignState>>(boot.campaignState);

  // Save after every state change (inject, action, ack, rule toggle). A pristine
  // session is not stored, so after Reset the key is gone.
  useEffect(() => {
    persistSession({ ...data, statuses, campaignState, protectedInr });
  }, [data, statuses, campaignState, protectedInr]);

  const applyAction = useCallback(
    (alertId: string, action: string) => {
      const alert = data.alerts.find((a) => a.id === alertId);
      if (!alert) return;
      const next = statusForAction(action);
      const wasResolved = statuses[alertId] === "RESOLVED";
      setStatuses((s) => ({ ...s, [alertId]: next }));
      // Pause campaign → paused, Cap today's budget → capped (shown on the inbox health chip)
      const effect = campaignStateForAction(action);
      if (effect) setCampaignState((c) => ({ ...c, [alert.campaignId]: effect }));
      if (next === "RESOLVED" && !wasResolved) {
        const stopped = exposureStopped(alert);
        setProtectedInr((p) => p + stopped);
        toast.success(`≈ ${formatInr(stopped)} of exposure stopped for the rest of today (${hoursLeftToday()} h)`, {
          description: `${action}: ${campaignName(alert.campaignId)}`,
        });
      } else if (next === "SNOOZED") {
        toast(`Snoozed for 24h: ${campaignName(alert.campaignId)}`, {
          description: "You'll be paged again only if severity escalates.",
        });
      } else if (next === "EXPECTED") {
        toast("Marked expected.", {
          description: "In production this date joins the campaign's event calendar so the baseline learns.",
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
      const plan = planInjection(failureClass, data.history, data.alerts, data.rules, statuses, campaignState);
      if (plan.kind === "blocked") {
        toast("All eligible campaigns are paused or already have this incident", {
          description: `${classLabel(failureClass)} targets: ${plan.targets.map(campaignName).join(", ")}. Reset the demo to start over.`,
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
      setData({ ...data, history: plan.history, alerts: plan.alerts, injections: [...data.injections, plan.injection] });
      // Same incident firing again after it was closed: reopen it.
      if (plan.recurred) {
        setStatuses((s) => {
          const next = { ...s };
          delete next[added.id];
          return next;
        });
      }
      setLastInjectedId(added.id);
      toast.error(`${added.severity} · ${classLabel(added.failureClass)}: ${campaignName(added.campaignId)}`, {
        description: `${formatInr(added.inrAtRiskPerHour)}/h at risk. ${added.headline}`,
      });
    },
    [data, statuses, campaignState],
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
    const fresh = freshSession();
    clearSaved();
    setData(dataOf(fresh));
    setStatuses(fresh.statuses);
    setProtectedInr(fresh.protectedInr);
    setLastInjectedId(null);
    setCampaignState(fresh.campaignState);
    toast.success("Demo reset", { description: "Back to the 3 seeded incidents, all rules on, all campaigns active." });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      history: data.history,
      rules: data.rules,
      alerts: data.alerts,
      statuses,
      protectedInr,
      campaignState,
      applyAction,
      inject,
      lastInjectedId,
      setRuleEnabled,
      resetDemo,
    }),
    [data, statuses, protectedInr, campaignState, applyAction, inject, lastInjectedId, setRuleEnabled, resetDemo],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
