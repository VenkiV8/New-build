import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "cn";
import {
  caughtAfterOnset,
  failureClassLabel,
  SEVERITY_TEXT,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/components/alerts/alertMeta";
import { FailureClassIcon } from "@/components/alerts/FailureClassIcon";
import { SeverityChip } from "@/components/alerts/SeverityChip";
import { ActionRow } from "@/components/incident/ActionRow";
import "@/components/incident/incident.css";
import { CausalTreePanel } from "@/components/incident/CausalTreePanel";
import { MetricBandChart } from "@/components/incident/MetricBandChart";
import { TrackingBreakChart } from "@/components/incident/TrackingBreakChart";
import { TrackingChecklistDialog } from "@/components/incident/TrackingChecklistDialog";
import { buildCausalTree, diagnoseTree } from "@/lib/causalTree";
import { alertWindowHours, bandSeries, trackingSeries } from "@/lib/chartData";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import type { AlertStatus } from "@/lib/types";
import { useApp } from "@/state/appContext";
import { startedAgo } from "@/state/inboxView";
import { exposureStopped, MARK_FIXED_ACTION, TRACKING_CHECKLIST_ACTION } from "@/state/protection";
import { recommendationFor } from "@/state/recommendation";
import { formatDateTime, formatInr } from "@/utils/format";

/** Status line above the tiles, and the tiles' glow class, per status. */
const STATUS_LINE: Partial<Record<AlertStatus, { text: string; cls: string; dot: string }>> = {
  OPEN: { text: "Money at risk — no one has acted yet", cls: "text-red-700", dot: "bg-red-600" },
  ACKED: { text: "Acknowledged — still costing money until fixed", cls: "text-amber-800", dot: "bg-amber-500" },
  RESOLVED: { text: "Resolved", cls: "text-green-800", dot: "bg-green-600" },
};
const GLOW: Partial<Record<AlertStatus, string>> = {
  OPEN: "bp-glow-open",
  ACKED: "bp-glow-acked",
  RESOLVED: "bp-glow-resolved",
};

/** true for ~1.5s after this alert's status changes to RESOLVED (not when it loads resolved). */
function useResolvedFlash(alertId: string | undefined, status: AlertStatus): boolean {
  const prev = useRef<{ id: string | undefined; status: AlertStatus }>({ id: alertId, status });
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const was = prev.current;
    prev.current = { id: alertId, status };
    if (was.id !== alertId || was.status === status || status !== "RESOLVED") return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1500);
    return () => clearTimeout(t);
  }, [alertId, status]);
  return flash;
}

function BackLink() {
  return (
    <Link to="/inbox" className="inline-flex min-h-10 items-center gap-1 text-sm text-slate-500 hover:text-slate-900 md:min-h-0">
      <ArrowLeft className="size-4" aria-hidden /> Inbox
    </Link>
  );
}

export default function IncidentPage() {
  const { id } = useParams();
  const { history, alerts, statuses, actionsTaken, applyAction } = useApp();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const alert = alerts.find((a) => a.id === id);
  const flash = useResolvedFlash(alert?.id, (alert && statuses[alert.id]) || "OPEN");
  const series = alert ? history[alert.campaignId] : undefined;

  const view = useMemo(() => {
    if (!alert || !series) return null;
    const windowHours = alertWindowHours(series, alert.startedAt);
    const nodes = buildCausalTree(series, windowHours);
    const baseCvr = CAMPAIGNS.find((c) => c.id === alert.campaignId)?.baseCvr ?? 0;
    return {
      windowHours,
      nodes,
      diagnosis: diagnoseTree(nodes),
      chart:
        alert.failureClass === "TRACKING_BREAK"
          ? ({ kind: "tracking", points: trackingSeries(series, baseCvr, alert.startedAt) } as const)
          : ({ kind: "band", points: bandSeries(series, alert.metric, alert.startedAt) } as const),
    };
  }, [alert, series]);

  if (!alert || !view) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="font-semibold text-slate-900">This demo incident isn't in your current session.</p>
          <p className="mt-1 text-sm text-slate-500">Re-create it from the inbox demo controls.</p>
        </div>
      </div>
    );
  }

  const status = statuses[alert.id] ?? "OPEN";
  const campaign = CAMPAIGNS.find((c) => c.id === alert.campaignId)?.name ?? alert.campaignId;
  const line = STATUS_LINE[status];
  const glow = cn(GLOW[status], status === "RESOLVED" && flash && "bp-glow-flash");
  const tile = cn("rounded-lg border border-slate-200 bg-white px-3 py-2", glow);

  return (
    <div className="space-y-5">
      <BackLink />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <SeverityChip severity={alert.severity} />
          <span className="inline-flex items-center gap-1 font-medium">
            <FailureClassIcon
              failureClass={alert.failureClass}
              className={cn("size-4", SEVERITY_TEXT[alert.severity])}
              aria-hidden
            />
            {failureClassLabel(alert.failureClass)}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 font-medium", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{alert.headline}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Affected campaign: <span className="font-medium text-slate-700">{campaign}</span>
          </p>
        </div>
        {line && (
          <p role="status" className={cn("flex items-center gap-2 text-sm font-medium", line.cls)}>
            <span className={cn("size-2 shrink-0 rounded-full", line.dot)} aria-hidden />
            {line.text}
          </p>
        )}
        <dl className="grid grid-cols-3 gap-2">
          <div className={tile}>
            <dt className="text-xs text-slate-500">At risk / hour</dt>
            <dd className="text-lg font-semibold text-slate-900 tabular-nums">{formatInr(alert.inrAtRiskPerHour)}</dd>
          </div>
          <div className={tile}>
            <dt className="text-xs text-slate-500">At risk so far</dt>
            <dd className="text-lg font-semibold text-slate-900 tabular-nums">{formatInr(alert.inrAtRiskTotal)}</dd>
          </div>
          <div className={tile}>
            <dt className="text-xs text-slate-500">Started</dt>
            <dd className="text-sm font-semibold text-slate-900">{startedAgo(alert.startedAt)}</dd>
            <dd className="text-xs text-slate-500">{formatDateTime(alert.startedAt)}</dd>
            <dd className="text-xs text-slate-500">{caughtAfterOnset(alert.failureClass)}</dd>
          </div>
        </dl>
        <p className="text-sm text-slate-600">{alert.explanation}</p>
      </header>

      <ActionRow
        recommendation={recommendationFor(alert)}
        status={status}
        actionTaken={actionsTaken[alert.id]}
        creditInr={exposureStopped(alert)}
        onAction={(a) => {
          // The checklist acknowledges (no ₹ credit); "Mark fixed" inside it resolves.
          if (a === TRACKING_CHECKLIST_ACTION) setChecklistOpen(true);
          applyAction(alert.id, a);
        }}
      />
      {alert.failureClass === "TRACKING_BREAK" && (
        <TrackingChecklistDialog
          open={checklistOpen}
          onOpenChange={setChecklistOpen}
          onMarkFixed={() => applyAction(alert.id, MARK_FIXED_ACTION)}
          campaign={campaign}
          creditInr={exposureStopped(alert)}
        />
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        {view.chart.kind === "tracking" ? (
          <TrackingBreakChart points={view.chart.points} />
        ) : (
          <MetricBandChart points={view.chart.points} metric={alert.metric} />
        )}
      </section>

      <CausalTreePanel
        nodes={view.nodes}
        diagnosis={view.diagnosis}
        causes={alert.causes}
        windowHours={view.windowHours}
      />
    </div>
  );
}
