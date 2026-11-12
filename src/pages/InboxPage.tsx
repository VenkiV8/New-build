import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { AlertCard } from "@/components/inbox/AlertCard";
import { CampaignHealthStrip } from "@/components/inbox/CampaignHealthStrip";
import { DemoToolbar } from "@/components/inbox/DemoToolbar";
import { InboxHeader } from "@/components/inbox/InboxHeader";
import { TryThisStrip } from "@/components/inbox/TryThisStrip";
import { useFreshIds } from "@/hooks/useFreshIds";
import { ADVERTISER } from "@/state/account";
import { useApp } from "@/state/appContext";
import { mostRecentOpen, sortForInbox, splitByAlertBudget, startedAgo } from "@/state/inboxView";
import { atRiskNow } from "@/state/protection";

export default function InboxPage() {
  const { history, rules, alerts, statuses, protectedInr, campaignState, inject, lastInjectedId, resetDemo } = useApp();
  const tryTarget = useMemo(
    () => mostRecentOpen(alerts, statuses, lastInjectedId),
    [alerts, statuses, lastInjectedId],
  );
  // Alert budget picks the top 5 by ₹; display then sinks settled alerts below open ones.
  const { paged, digest } = useMemo(() => {
    const split = splitByAlertBudget(alerts);
    return { paged: sortForInbox(split.paged, statuses), digest: sortForInbox(split.digest, statuses) };
  }, [alerts, statuses]);
  const risk = useMemo(() => atRiskNow(alerts, statuses), [alerts, statuses]);
  const fresh = useFreshIds(alerts);

  const card = (a: (typeof alerts)[number], muted = false) => (
    <li key={a.id}>
      <AlertCard
        alert={a}
        status={statuses[a.id] ?? "OPEN"}
        startedAgo={startedAgo(a.startedAt)}
        fresh={fresh.has(a.id)}
        muted={muted}
      />
    </li>
  );

  return (
    // Room for the fixed demo controls is reserved by AppLayout (below the footer).
    <div className="space-y-5">
      <InboxHeader
        advertiser={ADVERTISER}
        atRiskInr={risk.totalInr}
        openCount={risk.activeCount}
        protectedInr={protectedInr}
        alertsUsed={paged.length}
      />

      <TryThisStrip onInjectTrackingBreak={() => inject("TRACKING_BREAK")} incidentId={tryTarget?.id ?? null} />

      <CampaignHealthStrip history={history} rules={rules} campaignState={campaignState} />

      {alerts.length === 0 ? (
        <section className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <ShieldCheck className="size-8 text-ok" aria-hidden />
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
