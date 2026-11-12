import { Link } from "react-router-dom";
import { cn } from "cn";
import { ADVERTISER } from "@/state/account";
import { formatInr } from "@/utils/format";
import { useCountUp } from "./useCountUp";

interface Props {
  campaigns: number;
  asOf: string;
  spentToday: number;
  totalBudget: number;
  atRiskInr: number;
  activeIncidents: number;
  protectedInr: number;
}

function Kpi({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/20 bg-white/10 p-3">
      <p className="text-xs text-slate-200">{label}</p>
      {/* text-2xl semibold = WCAG "large text" (red-300 on the glass tile is ≥ 4.1:1, AA large ≥ 3:1) */}
      <p className={cn("text-2xl font-semibold text-white tabular-nums", valueClass)}>{value}</p>
      {sub && <p className="text-xs text-slate-200 tabular-nums">{sub}</p>}
    </div>
  );
}

export function LandingHero(p: Props) {
  const spent = useCountUp(p.spentToday);
  const atRisk = useCountUp(p.atRiskInr);
  const incidents = useCountUp(p.activeIncidents);
  const saved = useCountUp(p.protectedInr);
  const pct = Math.round((p.spentToday / p.totalBudget) * 100);

  return (
    <section className="bp-hero overflow-hidden rounded-2xl px-5 py-6 text-white md:px-8 md:py-8">
      <div className="max-w-2xl space-y-3">
        <p className="text-xs font-medium tracking-wide text-slate-200 uppercase">
          BudgetPager · on-call for your ad budget
        </p>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{ADVERTISER}</h1>
          <p className="mt-1 text-sm text-slate-300">(fictional brand · demo account)</p>
        </div>
        <p className="text-base text-slate-100 md:text-lg">
          BudgetPager watches your campaigns around the clock and pages you only when money is at risk, with the
          likely cause and a one-tap fix.
        </p>
        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white">
          <span className="bp-live-dot relative inline-flex size-2 rounded-full bg-green-400" aria-hidden />
          Watching {p.campaigns} campaigns · last check {p.asOf}
        </p>
        {/* Mobile only: compact duplicate of the banner's primary button */}
        <div className="md:hidden">
          <Link
            to="/inbox"
            className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-sm font-semibold text-topbar shadow-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-topbar focus-visible:outline-none"
          >
            Open alerts inbox →
          </Link>
        </div>
      </div>

      <div role="group" aria-label="Today at a glance" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Spent today" value={formatInr(spent)} sub={`of ${formatInr(p.totalBudget)} (${pct}%)`} />
        <Kpi label="At risk now" value={formatInr(atRisk)} valueClass="text-red-300" />
        <Kpi label="Open incidents" value={String(Math.round(incidents))} />
        <Kpi label="Protected this session" value={formatInr(saved)} />
      </div>
    </section>
  );
}
