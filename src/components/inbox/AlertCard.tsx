import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import type { Alert, AlertStatus } from "@/lib/types";
import {
  caughtAfterOnset,
  failureClassLabel,
  SEVERITY_EDGE,
  SEVERITY_TEXT,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/components/alerts/alertMeta";
import { FailureClassIcon } from "@/components/alerts/FailureClassIcon";
import { SeverityChip } from "@/components/alerts/SeverityChip";
import { isActive } from "@/state/protection";
import { formatInr } from "@/utils/format";

interface Props {
  alert: Alert;
  status: AlertStatus;
  startedAgo: string;
  /** just injected: animate in and highlight */
  fresh?: boolean;
  /** folded into the daily digest by the alert budget */
  muted?: boolean;
}

export function AlertCard({ alert, status, startedAgo, fresh, muted }: Props) {
  const campaign = CAMPAIGNS.find((c) => c.id === alert.campaignId)?.name ?? alert.campaignId;
  // Acknowledged is not fixed: only Resolved / Expected / Snoozed render as closed (greyed).
  const closed = !isActive(status);

  return (
    <Link
      to={`/incident/${encodeURIComponent(alert.id)}`}
      className={cn(
        "group block rounded-xl border border-slate-200 bg-white p-4 transition-[box-shadow,border-color] duration-700 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
        SEVERITY_EDGE[alert.severity],
        fresh && "animate-in fade-in slide-in-from-top-3 border-red-300 ring-2 ring-red-200 duration-500",
        (muted || closed) && "bg-slate-50/60",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
            <SeverityChip severity={alert.severity} />
            <span className="inline-flex items-center gap-1 font-medium">
              <FailureClassIcon
                failureClass={alert.failureClass}
                className={cn("size-4", SEVERITY_TEXT[alert.severity])}
                aria-hidden
              />
              {failureClassLabel(alert.failureClass)}
            </span>
            <span className="text-slate-400">·</span>
            <span>started {startedAgo}</span>
            <span className="text-slate-400">·</span>
            <span>{caughtAfterOnset(alert.failureClass)}</span>
          </div>
          <p className="truncate text-sm font-semibold text-slate-900">{campaign}</p>
          <p className={cn("text-sm text-slate-600", closed && "text-slate-500")}>{alert.headline}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
          <span className={cn("text-lg font-semibold tabular-nums", closed ? "text-slate-500" : "text-slate-900")}>
            {formatInr(alert.inrAtRiskTotal)}
          </span>
          <span className="text-xs text-slate-500 tabular-nums">{formatInr(alert.inrAtRiskPerHour)}/h at risk</span>
          <span
            className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status])}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        <ChevronRight className="mt-1 hidden size-4 shrink-0 text-slate-300 group-hover:text-slate-500 sm:block" aria-hidden />
      </div>
    </Link>
  );
}
