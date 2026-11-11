import { cn } from "cn";
import { ALERT_BUDGET } from "@/state/inboxView";
import { formatInr } from "@/utils/format";

interface Props {
  advertiser: string;
  protectedInr: number;
  incidentCount: number;
  alertsUsed: number;
}

export function InboxHeader({ advertiser, protectedInr, incidentCount, alertsUsed }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Incident inbox</p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{advertiser}</h1>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:flex sm:gap-6">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
          <dt className="text-xs text-slate-500">₹ protected this week</dt>
          <dd className="text-lg font-semibold text-slate-900 tabular-nums">{formatInr(protectedInr)}</dd>
          <dd className="text-xs text-slate-500">
            across {incidentCount} incident{incidentCount === 1 ? "" : "s"}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
          <dt className="text-xs text-slate-500">Alert budget</dt>
          <dd className="text-lg font-semibold text-slate-900 tabular-nums">
            {alertsUsed} of {ALERT_BUDGET}
          </dd>
          <dd className="flex items-center gap-0.5 sm:justify-end" aria-hidden>
            {Array.from({ length: ALERT_BUDGET }, (_, i) => (
              <span key={i} className={cn("h-1.5 w-4 rounded-full", i < alertsUsed ? "bg-slate-700" : "bg-slate-200")} />
            ))}
          </dd>
          <dd className="sr-only">
            {alertsUsed} of {ALERT_BUDGET} daily alerts used
          </dd>
        </div>
      </dl>
    </div>
  );
}
