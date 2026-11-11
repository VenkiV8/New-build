import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Inbox, ShieldCheck, TriangleAlert } from "lucide-react";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { ADVERTISER } from "@/state/account";
import { useApp } from "@/state/appContext";
import { atRiskNow } from "@/state/protection";
import { formatInr } from "@/utils/format";

function StatChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 tabular-nums">
      {icon}
      {children}
    </li>
  );
}

export default function LandingPage() {
  const { alerts, statuses } = useApp();
  const risk = useMemo(() => atRiskNow(alerts, statuses), [alerts, statuses]);

  return (
    <section className="max-w-2xl space-y-6 py-2 md:py-8">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          BudgetPager · on-call for your ad budget
        </p>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">{ADVERTISER}</h1>
          <p className="mt-1 text-sm text-slate-500">(fictional brand · demo account)</p>
        </div>
        <p className="text-base text-slate-600 md:text-lg">
          BudgetPager watches your campaigns around the clock and pages you only when money is at risk, with the
          likely cause and a one-tap fix.
        </p>
      </div>

      <ul aria-label="Account status" className="flex flex-wrap gap-2">
        <StatChip icon={<Inbox className="size-4 text-slate-500" aria-hidden />}>
          <span>
            <span className="font-semibold text-slate-900">{risk.openCount}</span> open incident
            {risk.openCount === 1 ? "" : "s"}
          </span>
        </StatChip>
        <StatChip icon={<TriangleAlert className="size-4 text-sev1" aria-hidden />}>
          <span>
            <span className="font-semibold text-slate-900">{formatInr(risk.totalInr)}</span> at risk now
          </span>
        </StatChip>
        <StatChip icon={<ShieldCheck className="size-4 text-ok" aria-hidden />}>
          <span>
            <span className="font-semibold text-slate-900">{CAMPAIGNS.length}</span> campaigns monitored
          </span>
        </StatChip>
      </ul>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          to="/inbox"
          className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Open alerts inbox →
        </Link>
        <Link
          to="/rules"
          className="inline-flex min-h-10 items-center text-sm font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
        >
          Tune alert rules
        </Link>
      </div>
    </section>
  );
}
