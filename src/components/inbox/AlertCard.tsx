import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import type { Alert, AlertStatus } from "@/lib/types";
import { failureClassLabel, STATUS_LABELS } from "@/components/alerts/alertMeta";
import { FailureClassIcon } from "@/components/alerts/FailureClassIcon";
import { SeverityChip } from "@/components/alerts/SeverityChip";
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
  const closed = status !== "OPEN";

  return (
    <Link
      to={`/incident/${encodeURIComponent(alert.id)}`}
      className={cn(
        "group block rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-[box-shadow,border-color] duration-700 hover:border-slate-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none",
        fresh && "animate-in fade-in slide-in-from-top-3 border-red-300 ring-2 ring-red-200 duration-500",
        (muted || closed) && "bg-slate-50/60",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
            <SeverityChip severity={alert.severity} />
            <span className="inline-flex items-center gap-1 font-medium">
              <FailureClassIcon failureClass={alert.failureClass} className="size-3.5" aria-hidden />
              {failureClassLabel(alert.failureClass)}
            </span>
            <span className="text-slate-400">·</span>
            <span>started {startedAgo}</span>
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
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              status === "OPEN" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
            )}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        <ChevronRight className="mt-1 hidden size-4 shrink-0 text-slate-300 group-hover:text-slate-500 sm:block" aria-hidden />
      </div>
    </Link>
  );
}
