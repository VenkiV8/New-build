import { useMemo } from "react";
import { CircleCheck, CircleDashed } from "lucide-react";
import { cn } from "cn";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { evaluateEligibility } from "@/lib/eligibility";
import type { CampaignHistory } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CampaignHealthStrip({ history }: { history: CampaignHistory }) {
  const rows = useMemo(
    () => CAMPAIGNS.map((c) => ({ campaign: c, eligibility: evaluateEligibility(c, history[c.id] ?? []) })),
    [history],
  );

  return (
    <section aria-label="Campaign health" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        {rows.map(({ campaign, eligibility }) => {
          const allActive = eligibility.gates.every((g) => g.status === "pass");
          return (
            <li key={campaign.id} className="shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-xs hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
                  >
                    {allActive ? (
                      <CircleCheck className="size-3.5 text-emerald-600" aria-hidden />
                    ) : (
                      <CircleDashed className="size-3.5 text-slate-500" aria-hidden />
                    )}
                    <span className="font-medium">{campaign.name}:</span>
                    <span className="text-slate-500">{eligibility.summary}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
                  <p className="text-sm font-semibold text-slate-900">{campaign.name}</p>
                  <p className="mb-3 text-xs text-slate-500">Eligibility gates checked before any rule runs</p>
                  <ul className="space-y-2.5">
                    {eligibility.gates.map((g) => (
                      <li key={g.id} className="flex gap-2 text-xs">
                        <span
                          className={cn(
                            "mt-px h-fit shrink-0 rounded px-1.5 py-0.5 font-medium",
                            g.status === "pass" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700",
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
                </PopoverContent>
              </Popover>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
