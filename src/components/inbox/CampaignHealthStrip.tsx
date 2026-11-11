import { useMemo } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "cn";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { evaluateEligibility } from "@/lib/eligibility";
import type { CampaignHistory } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CampaignHealthStrip({ history }: { history: CampaignHistory }) {
  const rows = useMemo(() => {
    const all = CAMPAIGNS.map((c) => {
      const eligibility = evaluateEligibility(c, history[c.id] ?? []);
      return { campaign: c, eligibility, hasFallback: eligibility.gates.some((g) => g.status === "fallback") };
    });
    // Fallback campaigns first (stable sort keeps campaign order otherwise).
    return all.sort((a, b) => Number(b.hasFallback) - Number(a.hasFallback));
  }, [history]);

  return (
    <section aria-label="Campaign health">
      <ul className="flex flex-wrap gap-2">
        {rows.map(({ campaign, eligibility, hasFallback }) => (
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
                  {hasFallback ? (
                    <CircleAlert className="size-4 shrink-0 text-sev2" aria-hidden />
                  ) : (
                    <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden />
                  )}
                  <span>
                    <span className="font-medium">{campaign.name}:</span>{" "}
                    <span className="text-slate-500">{eligibility.summary}</span>
                  </span>
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
              </PopoverContent>
            </Popover>
          </li>
        ))}
      </ul>
    </section>
  );
}
