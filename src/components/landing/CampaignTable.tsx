import { Link } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import { cn } from "cn";
import { SeverityChip } from "@/components/alerts/SeverityChip";
import { CAMPAIGN_STATE_LABEL, OBJECTIVE_LABEL, type CampaignRow } from "@/state/landingView";
import type { CampaignState } from "@/state/protection";
import { formatInr } from "@/utils/format";

const STATE_STYLES: Record<CampaignState, string> = {
  active: "bg-ok/10 text-ok-ink",
  paused: "bg-slate-100 text-slate-700",
  capped: "bg-brand/10 text-brand-ink",
};

function StatusPill({ state }: { state: CampaignState }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STATE_STYLES[state])}>
      {CAMPAIGN_STATE_LABEL[state]}
    </span>
  );
}

function Pacing({ row }: { row: CampaignRow }) {
  return (
    <div className="min-w-0">
      <p className="text-sm tabular-nums">
        <span className="font-semibold text-slate-900">{formatInr(row.spentToday)}</span>
        <span className={cn("ml-1", row.overBudget ? "font-medium text-sev1-ink" : "text-slate-500")}>
          {row.pctOfBudget}%{row.overBudget && " · over budget"}
        </span>
      </p>
      <div
        className="mt-1 h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${row.pctOfBudget}% of daily budget spent`}
      >
        <div
          className={cn("h-full rounded-full", row.overBudget ? "bg-sev1" : "bg-brand")}
          style={{ width: `${Math.min(row.pctOfBudget, 100)}%` }}
        />
      </div>
    </div>
  );
}

function Health({ row }: { row: CampaignRow }) {
  if (!row.worst) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-ok-ink">
        <CircleCheck className="size-4 text-ok" aria-hidden />
        Healthy
      </span>
    );
  }
  const n = row.activeAlerts.length;
  return (
    <Link
      to={`/incident/${encodeURIComponent(row.worst.id)}`}
      className="inline-flex min-h-10 items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 md:min-h-0"
    >
      <SeverityChip severity={row.worst.severity} />
      <span className="underline decoration-slate-300 underline-offset-2">
        {n} incident{n === 1 ? "" : "s"}
      </span>
    </Link>
  );
}

/** Live campaigns: table from md, one card per campaign below. */
export function CampaignTable({ rows }: { rows: CampaignRow[] }) {
  return (
    <section aria-labelledby="live-campaigns" className="space-y-3">
      <h2 id="live-campaigns" className="text-base font-semibold text-slate-900">
        Live campaigns
      </h2>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Campaign</th>
              <th scope="col" className="px-3 py-2 font-medium">Objective</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Daily budget</th>
              <th scope="col" className="px-3 py-2 font-medium">Spent today</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Conversions today</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-4 py-2 font-medium">Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.campaign.id} className="align-middle">
                <th scope="row" className="px-4 py-3 font-medium text-slate-900">
                  {row.campaign.name}
                </th>
                <td className="px-3 py-3 text-slate-600">{OBJECTIVE_LABEL[row.campaign.objective]}</td>
                <td className="px-3 py-3 text-right text-slate-700 tabular-nums">
                  {formatInr(row.campaign.dailyBudgetInr)}
                </td>
                <td className="px-3 py-3">
                  <Pacing row={row} />
                </td>
                <td className="px-3 py-3 text-right text-slate-900 tabular-nums">{row.conversionsToday}</td>
                <td className="px-3 py-3">
                  <StatusPill state={row.state} />
                </td>
                <td className="px-4 py-3">
                  <Health row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => (
          <li key={row.campaign.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-medium text-slate-900">{row.campaign.name}</p>
              <StatusPill state={row.state} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Objective</dt>
                <dd className="text-slate-700">{OBJECTIVE_LABEL[row.campaign.objective]}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Daily budget</dt>
                <dd className="text-slate-700 tabular-nums">{formatInr(row.campaign.dailyBudgetInr)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Spent today</dt>
                <dd>
                  <Pacing row={row} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Conversions today</dt>
                <dd className="text-slate-900 tabular-nums">{row.conversionsToday}</dd>
              </div>
            </dl>
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Health row={row} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
