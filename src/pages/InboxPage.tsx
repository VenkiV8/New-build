import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { CAMPAIGNS, demoNow } from "@/lib/dataGenerator";
import { AlertCard } from "@/components/inbox/AlertCard";
import { CampaignHealthStrip } from "@/components/inbox/CampaignHealthStrip";
import { DemoToolbar } from "@/components/inbox/DemoToolbar";
import { InboxHero } from "@/components/inbox/InboxHero";
import { TryThisStrip } from "@/components/inbox/TryThisStrip";
// reuse the landing page's hero gradient, rise and pulse keyframes (all motion-safe)
import "@/components/landing/landing.css";
import { useFreshIds } from "@/hooks/useFreshIds";
import { ADVERTISER } from "@/state/account";
import { useApp } from "@/state/appContext";
import { alertSparkSeries } from "@/state/inboxCards";
import { mostRecentOpen, sortForInbox, splitByAlertBudget, startedAgo } from "@/state/inboxView";
import { atRiskNow } from "@/state/protection";
import { formatClockTime } from "@/utils/format";

const HOUR = 3_600_000;

/** Section wrapper: fade + rise 8px on first mount, 60ms stagger (motion-safe only). */
const rise = (i: number) => ({ className: "bp-rise", style: { animationDelay: `${i * 60}ms` } });

export default function InboxPage() {
  const { history, rules, alerts, statuses, protectedInr, campaignState, tour, inject, lastInjectedId, resetDemo } =
    useApp();
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
  const sparks = useMemo(() => new Map(alerts.map((a) => [a.id, alertSparkSeries(history, a)])), [alerts, history]);
  const fresh = useFreshIds(alerts);

  const card = (a: (typeof alerts)[number], muted = false) => (
    <li key={a.id}>
      <AlertCard
        alert={a}
        status={statuses[a.id] ?? "OPEN"}
        startedAgo={startedAgo(a.startedAt)}
        spark={sparks.get(a.id)!}
        fresh={fresh.has(a.id)}
        muted={muted}
      />
    </li>
  );

  return (
    // Room for the fixed demo controls is reserved by AppLayout (below the footer).
    <div className="space-y-5">
      <div {...rise(0)}>
        <InboxHero
          advertiser={ADVERTISER}
          atRiskInr={risk.totalInr}
          activeCount={risk.activeCount}
          protectedInr={protectedInr}
          alertsUsed={paged.length}
          nextCheck={`${formatClockTime(demoNow() + HOUR)} IST`}
        />
      </div>

      <div {...rise(1)}>
        <TryThisStrip
          onInjectTrackingBreak={() => inject("TRACKING_BREAK")}
          incidentId={tryTarget?.id ?? null}
          tour={tour}
        />
      </div>

      <div {...rise(2)}>
        <CampaignHealthStrip history={history} rules={rules} campaignState={campaignState} />
      </div>

      <div {...rise(3)}>
        {alerts.length === 0 ? (
          <section className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <ShieldCheck className="size-8 text-ok" aria-hidden />
            <p className="text-base font-semibold text-slate-900">All {CAMPAIGNS.length} campaigns healthy ✓</p>
            <p className="text-sm text-slate-600">No money at risk right now.</p>
          </section>
        ) : (
          <section aria-label="Incidents" className="space-y-2">
            <h2 className="text-sm font-medium text-slate-600">
              {paged.length} incident{paged.length === 1 ? "" : "s"}, sorted by ₹ at risk
            </h2>
            <ul className="space-y-2">{paged.map((a) => card(a))}</ul>
          </section>
        )}
      </div>

      {digest.length > 0 && (
        <section aria-label="Folded into daily digest" className="space-y-2">
          <h2 className="text-sm font-medium text-slate-600">
            Folded into today's digest ({digest.length}): alert budget reached, lowest ₹ at risk
          </h2>
          <ul className="space-y-2">{digest.map((a) => card(a, true))}</ul>
        </section>
      )}

      {/* Not wrapped in .bp-rise: a transformed ancestor would re-anchor the fixed bar while animating. */}
      <DemoToolbar onInject={inject} onReset={resetDemo} />
    </div>
  );
}
