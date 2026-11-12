import { useMemo, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "cn";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { evaluateEligibility } from "@/lib/eligibility";
import type { CampaignHistory, RuleConfig } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { healthStripSummary, healthSummary } from "@/state/inboxView";
import type { CampaignState } from "@/state/protection";

const STATE_LABEL: Record<Exclude<CampaignState, "active">, string> = {
  paused: "Paused",
  capped: "Budget capped",
};

interface Props {
  history: CampaignHistory;
  /** live rule set: rules switched off are reflected on every chip */
  rules: RuleConfig[];
  campaignState: Record<string, CampaignState>;
}

export function CampaignHealthStrip({ history, rules, campaignState }: Props) {
  const rows = useMemo(() => {
    const all = CAMPAIGNS.map((c) => {
      const eligibility = evaluateEligibility(c, history[c.id] ?? []);
      return { campaign: c, eligibility, hasFallback: eligibility.gates.some((g) => g.status === "fallback") };
    });
    // Fallback campaigns first (stable sort keeps campaign order otherwise).
    return all.sort((a, b) => Number(b.hasFallback) - Number(a.hasFallback));
  }, [history]);
  const rulesOff = rules.filter((r) => !r.enabled);
  // Mobile only: collapsed into one chip until tapped; desktop always shows every chip.
  const [expanded, setExpanded] = useState(false);
  const onFallback = rows.filter((r) => r.hasFallback).length;

  return (
    <section aria-label="Campaign health">
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          aria-controls="campaign-health-chips"
          className={cn(
            "flex min-h-10 items-center gap-1.5 rounded-full border bg-white px-3 text-left text-xs text-slate-700 shadow-xs md:hidden",
            onFallback > 0 ? "border-sev2/50" : "border-slate-200",
          )}
        >
          {onFallback > 0 || rulesOff.length > 0 ? (
            <CircleAlert className={cn("size-4 shrink-0", onFallback > 0 ? "text-sev2" : "text-slate-500")} aria-hidden />
          ) : (
            <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden />
          )}
          <span className="font-medium">{healthStripSummary(rows.length, onFallback, rulesOff.length)}</span>
          <span aria-hidden>▸</span>
        </button>
      )}
      <ul id="campaign-health-chips" className={cn("flex-wrap gap-2", expanded ? "flex" : "hidden md:flex")}>
        {rows.map(({ campaign, eligibility, hasFallback }) => {
          const state = campaignState[campaign.id] ?? "active";
          const allClear = !hasFallback && rulesOff.length === 0;
          return (
            <li key={campaign.id} className="max-w-full">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-10 max-w-full items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 md:min-h-0 text-left text-xs text-slate-700 shadow-xs focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
                      hasFallback ? "border-sev2/50 hover:border-sev2" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    {allClear ? (
                      <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden />
                    ) : (
                      <CircleAlert
                        className={cn("size-4 shrink-0", hasFallback ? "text-sev2" : "text-slate-500")}
                        aria-hidden
                      />
                    )}
                    <span>
                      <span className="font-medium">{campaign.name}:</span>{" "}
                      <span className="text-slate-500">
                        {healthSummary(eligibility.summary, hasFallback, rulesOff.length)}
                      </span>
                    </span>
                    {state !== "active" && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                        {STATE_LABEL[state]}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
                  <p className="text-sm font-semibold text-slate-900">
                    {campaign.name}
                    {state !== "active" && <span className="font-normal text-slate-500"> · {STATE_LABEL[state]}</span>}
                  </p>
                  <p className="mb-3 text-xs text-slate-500">Eligibility gates checked before any rule runs</p>
                  <ul className="space-y-2.5">
                    {eligibility.gates.map((g) => (
                      <li key={g.id} className="flex gap-2 text-xs">
                        <span
                          className={cn(
                            "mt-px h-fit shrink-0 rounded px-1.5 py-0.5 font-medium",
                            g.status === "pass" ? "bg-ok/10 text-ok-ink" : "bg-sev2/10 text-sev2-ink",
                          )}
                        >
                          {g.status === "pass" ? "Pass" : "Fallback"}
                        </span>
                        <span>
                          <span className="block font-medium text-slate-800">{g.label}</span>
                          <span className="text-slate-500">{g.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {rulesOff.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3 text-xs">
                      <p className="font-medium text-slate-800">Rules turned off</p>
                      <ul className="mt-1 list-disc pl-4 text-slate-600">
                        {rulesOff.map((r) => (
                          <li key={r.failureClass}>{r.label}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                    Gates shown as policy; this prototype evaluates them but does not yet suppress alerts.
                  </p>
                </PopoverContent>
              </Popover>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
