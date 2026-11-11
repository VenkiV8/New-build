import type { ReactNode } from "react";
import { cn } from "cn";
import { ALERT_BUDGET } from "@/state/inboxView";
import { formatInr } from "@/utils/format";

interface Props {
  advertiser: string;
  atRiskInr: number;
  openCount: number;
  protectedInr: number;
  alertsUsed: number;
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
      <dt className="text-xs leading-tight text-slate-500">{label}</dt>
      <dd className="text-base font-semibold text-slate-900 tabular-nums sm:text-lg">{value}</dd>
      <dd className="text-xs leading-tight text-slate-500">{sub}</dd>
    </div>
  );
}

export function InboxHeader({ advertiser, atRiskInr, openCount, protectedInr, alertsUsed }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Incident inbox</p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{advertiser}</h1>
      </div>
      <dl className="grid grid-cols-3 gap-2 sm:flex sm:gap-8">
        <Stat
          label="At risk now"
          value={formatInr(atRiskInr)}
          sub={`across ${openCount} open incident${openCount === 1 ? "" : "s"}`}
        />
        <Stat label="Protected this session" value={formatInr(protectedInr)} sub="/day exposure stopped" />
        <Stat
          label="Alert budget"
          value={`${alertsUsed} of ${ALERT_BUDGET}`}
          sub={
            <>
              <span className="mt-1 flex items-center gap-0.5 sm:justify-end" aria-hidden>
                {Array.from({ length: ALERT_BUDGET }, (_, i) => (
                  <span
                    key={i}
                    className={cn("h-1.5 w-3 rounded-full sm:w-4", i < alertsUsed ? "bg-slate-700" : "bg-slate-200")}
                  />
                ))}
              </span>
              <span className="sr-only">
                {alertsUsed} of {ALERT_BUDGET} daily alerts used
              </span>
            </>
          }
        />
      </dl>
    </div>
  );
}
