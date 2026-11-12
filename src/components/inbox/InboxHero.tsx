import type { ReactNode } from "react";
import { Gauge, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import logo from "@/assets/aura-logo.svg";
import { ALERT_BUDGET } from "@/state/inboxView";
import { formatInr } from "@/utils/format";

interface Props {
  advertiser: string;
  atRiskInr: number;
  activeCount: number;
  protectedInr: number;
  alertsUsed: number;
  /** e.g. "9:00 PM IST" */
  nextCheck: string;
}

function Tile({
  icon: Icon,
  iconClass,
  label,
  value,
  valueClass,
  sub,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: ReactNode;
  valueClass?: string;
  sub: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/20 bg-white/10 p-2 md:p-3">
      <p className="flex items-start gap-1 text-[11px] leading-tight text-slate-200 md:text-xs">
        <Icon className={cn("size-3.5 shrink-0 md:size-4", iconClass)} aria-hidden />
        <span>{label}</span>
      </p>
      <p className={cn("mt-1 text-base font-semibold text-white tabular-nums md:text-2xl", valueClass)}>{value}</p>
      <div className="mt-0.5 text-[11px] leading-tight text-slate-200 md:text-xs">{sub}</div>
    </div>
  );
}

/** Inbox header as a hero band (same gradient + dot texture as the landing hero). */
export function InboxHero({ advertiser, atRiskInr, activeCount, protectedInr, alertsUsed, nextCheck }: Props) {
  return (
    <section className="bp-hero flex flex-col gap-4 overflow-hidden rounded-2xl px-4 py-4 text-white md:flex-row md:items-center md:justify-between md:gap-6 md:px-8 md:py-6">
      <div className="min-w-0 space-y-2">
        <p className="text-xs font-medium tracking-wide text-slate-200 uppercase">Incident inbox</p>
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Aura & Co. Skincare logo (fictional brand)"
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-[10px]"
          />
          <h1 className="min-w-0 text-xl font-semibold tracking-tight text-white md:text-3xl">{advertiser}</h1>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white">
          <span className="bp-live-dot relative inline-flex size-2 rounded-full bg-green-400" aria-hidden />
          Monitoring · next check {nextCheck}
        </p>
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2 md:w-[30rem] md:gap-3">
        <Tile
          icon={TriangleAlert}
          iconClass="text-red-300"
          label="At risk now"
          value={formatInr(atRiskInr)}
          // red-300 only at 24px (WCAG large text); red-200 for the small mobile size (≥ 4.5:1)
          valueClass="text-red-200 md:text-red-300"
          sub={`across ${activeCount} active incident${activeCount === 1 ? "" : "s"}`}
        />
        <Tile
          icon={ShieldCheck}
          iconClass="text-green-300"
          label="Protected this session"
          value={formatInr(protectedInr)}
          valueClass="text-green-300"
          sub="exposure stopped for the rest of today"
        />
        <Tile
          icon={Gauge}
          iconClass="text-blue-300"
          label="Alert budget"
          value={`${alertsUsed} of ${ALERT_BUDGET}`}
          sub={
            <>
              <span className="mt-1 flex items-center gap-0.5" aria-hidden>
                {Array.from({ length: ALERT_BUDGET }, (_, i) => (
                  <span
                    key={i}
                    className={cn("h-1.5 w-full max-w-4 rounded-full", i < alertsUsed ? "bg-blue-300" : "bg-white/25")}
                  />
                ))}
              </span>
              <span className="sr-only">
                {alertsUsed} of {ALERT_BUDGET} daily alerts used
              </span>
            </>
          }
        />
      </div>
    </section>
  );
}
