import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { ADVERTISER, ADVERTISER_INITIALS, OWNER, TOTAL_DAILY_BUDGET_INR } from "@/state/account";
import { formatInr } from "@/utils/format";

/** Avatar with a read-only account summary. No sign-out / settings: nothing that does nothing. */
export function AccountMenu({ asOf }: { asOf: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Account: ${ADVERTISER}`}
          className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-line focus-visible:outline-none"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {ADVERTISER_INITIALS}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
        <p className="text-sm font-semibold text-slate-900">{ADVERTISER}</p>
        <p className="text-xs text-slate-500">Advertiser account on BudgetPager</p>
        <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-700">
          <div className="flex gap-1">
            <dt>Owner:</dt>
            <dd>{OWNER}</dd>
          </div>
          <div>
            <dt className="sr-only">Campaigns and budget</dt>
            <dd className="tabular-nums">
              {CAMPAIGNS.length} campaigns · {formatInr(TOTAL_DAILY_BUDGET_INR)}/day total budget
            </dd>
          </div>
          <div>
            <dt className="sr-only">Data freshness</dt>
            <dd className="text-slate-500">Data as of {asOf}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}
