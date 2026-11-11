interface Props {
  ruleLabel: string;
  flat: number;
  seasonal: number;
  prevented: number;
}

export function BaselineComparisonCard({ ruleLabel, flat, seasonal, prevented }: Props) {
  return (
    <section aria-label="Why seasonal baselines" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Why seasonal baselines</h2>
        <p className="text-xs text-slate-500">{ruleLabel} rule at its default threshold</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Seasonality-blind rule</p>
          <p className="text-3xl font-semibold text-slate-900 tabular-nums">{flat}</p>
          <p className="text-xs text-slate-500">false alarms</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">BudgetPager</p>
          <p className="text-3xl font-semibold text-slate-900 tabular-nums">{seasonal}</p>
          <p className="text-xs text-slate-500">false alarms</p>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-900">
        {prevented} false alarm{prevented === 1 ? "" : "s"} prevented
      </p>
      <p className="text-xs text-slate-500">Both counted on 30 days of healthy campaigns.</p>
    </section>
  );
}
