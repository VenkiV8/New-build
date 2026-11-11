import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { AlertCard } from "@/components/inbox/AlertCard";
import { CampaignHealthStrip } from "@/components/inbox/CampaignHealthStrip";
import { DemoToolbar } from "@/components/inbox/DemoToolbar";
import { InboxHeader } from "@/components/inbox/InboxHeader";
import { TryThisStrip } from "@/components/inbox/TryThisStrip";
import { useFreshIds } from "@/hooks/useFreshIds";
import { useApp } from "@/state/appContext";
import { dataEnd, splitByAlertBudget, timeAgo } from "@/state/inboxView";
import { atRiskNow } from "@/state/protection";

const ADVERTISER = "Arjun's skincare D2C";

export default function InboxPage() {
  const { history, alerts, statuses, protectedInr, inject, resetDemo } = useApp();
  const now = useMemo(() => dataEnd(history), [history]);
  const { paged, digest } = useMemo(() => splitByAlertBudget(alerts), [alerts]);
  const risk = useMemo(() => atRiskNow(alerts, statuses), [alerts, statuses]);
  const fresh = useFreshIds(alerts);

  const card = (a: (typeof alerts)[number], muted = false) => (
    <li key={a.id}>
      <AlertCard
        alert={a}
        status={statuses[a.id] ?? "OPEN"}
        startedAgo={timeAgo(a.startedAt, now)}
        fresh={fresh.has(a.id)}
        muted={muted}
      />
    </li>
  );

  return (
    // Bottom padding reserves room for the fixed demo controls so they never
    // cover the last card: the floating pill on mobile, the full bar from md.
    <div className="space-y-5 pb-16 md:pb-28">
      <InboxHeader
        advertiser={ADVERTISER}
        atRiskInr={risk.totalInr}
        openCount={risk.openCount}
        protectedInr={protectedInr}
        alertsUsed={paged.length}
      />

      <TryThisStrip onInjectTrackingBreak={() => inject("TRACKING_BREAK")} />

      <CampaignHealthStrip history={history} />

      {alerts.length === 0 ? (
        <section className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <ShieldCheck className="size-8 text-emerald-600" aria-hidden />
          <p className="text-base font-semibold text-slate-900">All {CAMPAIGNS.length} campaigns healthy ✓</p>
          <p className="text-sm text-slate-500">No money at risk right now.</p>
        </section>
      ) : (
        <section aria-label="Incidents" className="space-y-2">
          <h2 className="text-sm font-medium text-slate-500">
            {paged.length} incident{paged.length === 1 ? "" : "s"}, sorted by ₹ at risk
          </h2>
          <ul className="space-y-2">{paged.map((a) => card(a))}</ul>
        </section>
      )}

      {digest.length > 0 && (
        <section aria-label="Folded into daily digest" className="space-y-2">
          <h2 className="text-sm font-medium text-slate-500">
            Folded into today's digest ({digest.length}): alert budget reached, lowest ₹ at risk
          </h2>
          <ul className="space-y-2">{digest.map((a) => card(a, true))}</ul>
        </section>
      )}

      <DemoToolbar onInject={inject} onReset={resetDemo} />
    </div>
  );
}
