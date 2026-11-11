import { STATUS_LABELS } from "@/components/alerts/alertMeta";
import { SeverityChip } from "@/components/alerts/SeverityChip";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import type { Digest } from "@/state/notificationView";
import { formatDate, formatInr } from "@/utils/format";

interface Props {
  advertiser: string;
  date: number;
  digest: Digest;
}

const campaignName = (id: string) => CAMPAIGNS.find((c) => c.id === id)?.name ?? id;

export function DigestEmailMock({ advertiser, date, digest }: Props) {
  const n = digest.rows.length;
  const subject =
    n === 0
      ? `Daily digest: all ${CAMPAIGNS.length} campaigns healthy`
      : `Daily digest: ${n} incident${n === 1 ? "" : "s"}, ${formatInr(digest.totalAtRiskInr)} at risk`;

  return (
    <section aria-label="Daily digest email preview" className="space-y-3">
      <h2 className="text-base font-semibold text-slate-900">
        Daily digest email <span className="text-sm font-normal text-slate-500">(mock)</span>
      </h2>
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="space-y-0.5 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <p>
            <span className="inline-block w-14">From</span>
            <span className="text-slate-700">BudgetPager</span>
          </p>
          <p>
            <span className="inline-block w-14">To</span>
            <span className="text-slate-700">{advertiser}</span>
          </p>
          <p>
            <span className="inline-block w-14">Subject</span>
            <span className="font-medium text-slate-900">{subject}</span>
          </p>
          <p>
            <span className="inline-block w-14">Date</span>
            <span className="text-slate-700">{formatDate(date)}, 9:00 PM IST</span>
          </p>
        </header>

        <div className="space-y-4 px-4 py-4 text-sm">
          {n === 0 ? (
            <p className="font-semibold text-slate-900">All {CAMPAIGNS.length} campaigns healthy ✓</p>
          ) : (
            <>
              <p className="text-slate-700">
                Today: <span className="font-semibold text-slate-900 tabular-nums">{n}</span> incident
                {n === 1 ? "" : "s"}, <span className="font-semibold text-slate-900 tabular-nums">{formatInr(digest.totalAtRiskInr)}</span>{" "}
                at risk, {digest.openCount} still open.
              </p>
              <ul className="divide-y divide-slate-100 border-y border-slate-100">
                {digest.rows.map(({ alert, status, sentVia }) => (
                  <li key={alert.id} className="space-y-1 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <SeverityChip severity={alert.severity} />
                        <span className="truncate font-medium text-slate-900">{campaignName(alert.campaignId)}</span>
                      </div>
                      <span className="shrink-0 font-semibold text-slate-900 tabular-nums">
                        {formatInr(alert.inrAtRiskTotal)}
                      </span>
                    </div>
                    <p className="text-slate-600">{alert.headline}</p>
                    <p className="text-xs text-slate-500">
                      {STATUS_LABELS[status]} · Sent via: {sentVia}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-slate-500">
            SEV3 incidents, and anything over your 5-alerts-a-day budget, arrive only in this digest.
          </p>
        </div>
      </article>
    </section>
  );
}
