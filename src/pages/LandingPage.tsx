import { useMemo } from "react";
import { AttentionBanner } from "@/components/landing/AttentionBanner";
import { CampaignTable } from "@/components/landing/CampaignTable";
import { CapabilityRows } from "@/components/landing/CapabilityRows";
import { LandingHero } from "@/components/landing/LandingHero";
import "@/components/landing/landing.css";
import { CAMPAIGNS, demoNow } from "@/lib/dataGenerator";
import { TOTAL_DAILY_BUDGET_INR } from "@/state/account";
import { useApp } from "@/state/appContext";
import { campaignOverview, todaySpendSeries } from "@/state/landingView";
import { atRiskNow } from "@/state/protection";
import { formatClockTime } from "@/utils/format";

/** Section wrapper: fade + rise 8px on first mount, 60ms stagger (motion-safe only, see landing.css). */
const rise = (i: number) => ({ className: "bp-rise", style: { animationDelay: `${i * 60}ms` } });

export default function LandingPage() {
  const { history, alerts, statuses, campaignState, protectedInr } = useApp();
  // Live: recomputed on every inject / action / reset.
  const rows = useMemo(
    () => campaignOverview(history, alerts, statuses, campaignState),
    [history, alerts, statuses, campaignState],
  );
  const spark = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.campaign.id, todaySpendSeries(history, r.campaign.id, r.activeAlerts)])),
    [rows, history],
  );
  const risk = useMemo(() => atRiskNow(alerts, statuses), [alerts, statuses]);
  const needAttention = rows.filter((r) => r.activeAlerts.length > 0).length;
  const spentToday = rows.reduce((s, r) => s + r.spentToday, 0);

  return (
    <div className="bp-page-bg space-y-6 pb-2">
      <div {...rise(0)}>
        <LandingHero
          campaigns={CAMPAIGNS.length}
          asOf={`${formatClockTime(demoNow())} IST`}
          spentToday={spentToday}
          totalBudget={TOTAL_DAILY_BUDGET_INR}
          atRiskInr={risk.totalInr}
          activeIncidents={risk.activeCount}
          protectedInr={protectedInr}
        />
      </div>

      <div {...rise(1)}>
        <CampaignTable rows={rows} spark={spark} />
      </div>

      <div {...rise(2)}>
        <AttentionBanner campaignsNeedingAttention={needAttention} atRiskInr={risk.totalInr} />
      </div>

      <div {...rise(3)}>
        <CapabilityRows />
      </div>
    </div>
  );
}
