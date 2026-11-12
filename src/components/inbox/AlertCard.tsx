import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import type { Alert, AlertStatus, Severity } from "@/lib/types";
import {
  caughtAfterOnset,
  failureClassLabel,
  SEVERITY_TEXT,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/components/alerts/alertMeta";
import { FailureClassIcon } from "@/components/alerts/FailureClassIcon";
import { SeverityChip } from "@/components/alerts/SeverityChip";
import { alertTimeline, type CardSpark } from "@/state/inboxCards";
import { isActive } from "@/state/protection";
import { formatClockTime, formatInr } from "@/utils/format";
import { AlertSparkline } from "./AlertSparkline";

// Inbox-only card styling (the shared alertMeta styles are left untouched).
/** whole-card severity tint */
const SEVERITY_TINT: Record<Severity, string> = {
  SEV1: "bg-[#FEF2F2]",
  SEV2: "bg-[#FFFBEB]",
  SEV3: "bg-[#F8FAFC]",
};
/** 3px severity edge (inset, no size change) + resting / hover lift shadow */
const SEVERITY_EDGE: Record<Severity, string> = {
  SEV1: "shadow-[inset_3px_0_0_var(--bp-sev1),0_1px_2px_0_rgb(0_0_0/0.05)] hover:shadow-[inset_3px_0_0_var(--bp-sev1),0_8px_20px_-6px_rgb(15_23_42/0.18)]",
  SEV2: "shadow-[inset_3px_0_0_var(--bp-sev2),0_1px_2px_0_rgb(0_0_0/0.05)] hover:shadow-[inset_3px_0_0_var(--bp-sev2),0_8px_20px_-6px_rgb(15_23_42/0.18)]",
  SEV3: "shadow-[inset_3px_0_0_var(--bp-sev3),0_1px_2px_0_rgb(0_0_0/0.05)] hover:shadow-[inset_3px_0_0_var(--bp-sev3),0_8px_20px_-6px_rgb(15_23_42/0.18)]",
};

interface Props {
  alert: Alert;
  status: AlertStatus;
  startedAgo: string;
  /** the alert's metric over the last 24h (series from src/state/inboxCards.ts) */
  spark: CardSpark;
  /** just injected: animate in and highlight */
  fresh?: boolean;
  /** folded into the daily digest by the alert budget */
  muted?: boolean;
}

function Timeline({ alert }: { alert: Alert }) {
  const t = alertTimeline(alert);
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-600 tabular-nums">
      <span>Onset {formatClockTime(t.onset)}</span>
      <span aria-hidden>→</span>
      <span>Paged {formatClockTime(t.paged)}</span>
      <span aria-hidden>→</span>
      <span>Now {formatClockTime(t.now)}</span>
    </p>
  );
}

export function AlertCard({ alert, status, startedAgo, spark, fresh, muted }: Props) {
  const campaign = CAMPAIGNS.find((c) => c.id === alert.campaignId)?.name ?? alert.campaignId;
  // Acknowledged is not fixed: only Resolved / Expected / Snoozed render as closed (muted).
  const closed = !isActive(status);

  return (
    <Link
      to={`/incident/${encodeURIComponent(alert.id)}`}
      className={cn(
        "group block rounded-xl border border-slate-200 p-4 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none motion-safe:transition-[box-shadow,border-color] motion-safe:duration-300",
        SEVERITY_EDGE[alert.severity],
        muted || closed ? "bg-slate-50/60" : SEVERITY_TINT[alert.severity],
        fresh && "animate-in fade-in slide-in-from-top-3 border-red-300 ring-2 ring-red-200 duration-500",
      )}
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
            <span className={cn("inline-flex rounded", alert.severity === "SEV1" && !closed && "bp-pulse-ring")}>
              <SeverityChip severity={alert.severity} />
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <FailureClassIcon
                failureClass={alert.failureClass}
                className={cn("size-4", SEVERITY_TEXT[alert.severity])}
                aria-hidden
              />
              {failureClassLabel(alert.failureClass)}
            </span>
            <span className="text-slate-400" aria-hidden>
              ·
            </span>
            <span>started {startedAgo}</span>
            <span className="text-slate-400" aria-hidden>
              ·
            </span>
            <span>{caughtAfterOnset(alert.failureClass)}</span>
          </div>
          <p className="truncate text-sm font-semibold text-slate-900">{campaign}</p>
          <p className="text-sm text-slate-600">{alert.headline}</p>
          {/* Mobile: sparkline full-width under the headline */}
          <div className="pt-1 md:hidden">
            <AlertSparkline spark={spark} fluid />
          </div>
          <Timeline alert={alert} />
        </div>

        {/* Desktop: 140×36 sparkline beside the text */}
        <div className="hidden shrink-0 self-center md:block">
          <AlertSparkline spark={spark} />
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
          <span className={cn("text-2xl font-bold tabular-nums", closed ? "text-slate-500" : "text-slate-900")}>
            {formatInr(alert.inrAtRiskTotal)}
          </span>
          <span className="text-xs text-slate-600 tabular-nums">{formatInr(alert.inrAtRiskPerHour)}/h at risk</span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        <ChevronRight className="mt-1 hidden size-4 shrink-0 text-slate-400 group-hover:text-slate-600 sm:block" aria-hidden />
      </div>
    </Link>
  );
}
