import type { ReactNode } from "react";
import { Gauge, Inbox, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
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

interface StatProps {
  icon: LucideIcon;
  /** icon colour class (status colour, non-text) */
  iconClass: string;
  label: string;
  value: ReactNode;
  sub: ReactNode;
}

function Stat({ icon: Icon, iconClass, label, value, sub }: StatProps) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
      <dt className="flex items-start gap-1 text-xs leading-tight text-slate-500 sm:justify-end">
        <Icon className={cn("size-4 shrink-0", iconClass)} aria-hidden />
        <span>{label}</span>
      </dt>
      <dd className="text-base font-semibold text-slate-900 tabular-nums sm:text-lg">{value}</dd>
      <dd className="text-xs leading-tight text-slate-500">{sub}</dd>
    </div>
  );
}

export function InboxHeader({ advertiser, atRiskInr, openCount, protectedInr, alertsUsed }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
          <Inbox className="size-4 text-slate-400" aria-hidden />
          Incident inbox
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{advertiser}</h1>
      </div>
      <dl className="grid grid-cols-3 gap-2 sm:flex sm:gap-8">
        <Stat
          icon={TriangleAlert}
          iconClass="text-sev1"
          label="At risk now"
          value={formatInr(atRiskInr)}
          sub={`across ${openCount} open incident${openCount === 1 ? "" : "s"}`}
        />
        <Stat
          icon={ShieldCheck}
          iconClass="text-ok"
          label="Protected this session"
          value={formatInr(protectedInr)}
          sub="exposure stopped for the rest of today"
        />
        <Stat
          icon={Gauge}
          iconClass="text-brand"
          label="Alert budget"
          value={`${alertsUsed} of ${ALERT_BUDGET}`}
          sub={
            <>
              <span className="mt-1 flex items-center gap-0.5 sm:justify-end" aria-hidden>
                {Array.from({ length: ALERT_BUDGET }, (_, i) => (
                  <span
                    key={i}
                    className={cn("h-1.5 w-3 rounded-full sm:w-4", i < alertsUsed ? "bg-brand" : "bg-slate-200")}
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
