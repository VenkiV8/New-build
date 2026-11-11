import { useMemo, useState } from "react";
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
import { CausalTreePanel } from "@/components/incident/CausalTreePanel";
import { MetricBandChart } from "@/components/incident/MetricBandChart";
import { TrackingBreakChart } from "@/components/incident/TrackingBreakChart";
import { TrackingChecklistDialog } from "@/components/incident/TrackingChecklistDialog";
import { buildCausalTree, diagnoseTree } from "@/lib/causalTree";
import { alertWindowHours, bandSeries, trackingSeries } from "@/lib/chartData";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { useApp } from "@/state/appContext";
import { dataEnd, timeAgo } from "@/state/inboxView";
import {
  actionsFor,
  exposureStopped,
  MARK_FIXED_ACTION,
  TRACKING_CHECKLIST_ACTION,
} from "@/state/protection";
import { formatDateTime, formatInr } from "@/utils/format";

function BackLink() {
  return (
    <Link to="/" className="inline-flex min-h-10 items-center gap-1 text-sm text-slate-500 hover:text-slate-900 md:min-h-0">
      <ArrowLeft className="size-4" aria-hidden /> Inbox
    </Link>
  );
}

export default function IncidentPage() {
  const { id } = useParams();
  const { history, alerts, statuses, applyAction } = useApp();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const alert = alerts.find((a) => a.id === id);
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
          <p className="font-semibold text-slate-900">This incident is no longer active</p>
          <p className="mt-1 text-sm text-slate-500">It may have been cleared by a demo reset.</p>
        </div>
      </div>
    );
  }

  const status = statuses[alert.id] ?? "OPEN";
  const campaign = CAMPAIGNS.find((c) => c.id === alert.campaignId)?.name ?? alert.campaignId;

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
        <dl className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <dt className="text-xs text-slate-500">At risk / hour</dt>
            <dd className="text-lg font-semibold text-slate-900 tabular-nums">{formatInr(alert.inrAtRiskPerHour)}</dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <dt className="text-xs text-slate-500">At risk so far</dt>
            <dd className="text-lg font-semibold text-slate-900 tabular-nums">{formatInr(alert.inrAtRiskTotal)}</dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <dt className="text-xs text-slate-500">Started</dt>
            <dd className="text-sm font-semibold text-slate-900">{timeAgo(alert.startedAt, dataEnd(history))}</dd>
            <dd className="text-xs text-slate-500">{formatDateTime(alert.startedAt)}</dd>
            <dd className="text-xs text-slate-500">{caughtAfterOnset(alert.failureClass)}</dd>
          </div>
        </dl>
        <p className="text-sm text-slate-600">{alert.explanation}</p>
      </header>

      <ActionRow
        actions={actionsFor(alert)}
        status={status}
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
