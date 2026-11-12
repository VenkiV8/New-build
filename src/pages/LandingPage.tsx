import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AttentionBanner } from "@/components/landing/AttentionBanner";
import { CampaignTable } from "@/components/landing/CampaignTable";
import { CapabilityRows } from "@/components/landing/CapabilityRows";
import { ADVERTISER } from "@/state/account";
import { useApp } from "@/state/appContext";
import { campaignOverview } from "@/state/landingView";
import { atRiskNow } from "@/state/protection";

export default function LandingPage() {
  const { history, alerts, statuses, campaignState } = useApp();
  // Live: recomputed on every inject / action / reset.
  const rows = useMemo(
    () => campaignOverview(history, alerts, statuses, campaignState),
    [history, alerts, statuses, campaignState],
  );
  const risk = useMemo(() => atRiskNow(alerts, statuses), [alerts, statuses]);
  const needAttention = rows.filter((r) => r.activeAlerts.length > 0).length;

  return (
    <div className="space-y-6 py-2 md:py-6">
      <section className="max-w-2xl space-y-3">
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
        {/* Mobile only: compact duplicate of the banner's primary button */}
        <Link
          to="/inbox"
          className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none md:hidden"
        >
          Open alerts inbox →
        </Link>
      </section>

      <CampaignTable rows={rows} />

      <AttentionBanner campaignsNeedingAttention={needAttention} atRiskInr={risk.totalInr} />

      <CapabilityRows />
    </div>
  );
}
