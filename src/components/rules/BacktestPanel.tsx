import { cn } from "cn";
import { Slider } from "@/components/ui/slider";
import type { RecallResult } from "@/lib/backtest";
import type { BacktestResult, RuleConfig } from "@/lib/types";
import type { DayBucket } from "@/state/sandboxView";
import { FiringsBarChart } from "./FiringsBarChart";

interface Props {
  /** the rule at its default settings (slider metadata + label) */
  rule: RuleConfig;
  defaultValue: number;
  value: number;
  onValueChange: (v: number) => void;
  falseAlarms: BacktestResult;
  /** null for classes with no plantable incident (BUDGET_EXHAUST) */
  recall: RecallResult | null;
  days: DayBucket[];
  pending: boolean;
}

export function BacktestPanel({
  rule,
  defaultValue,
  value,
  onValueChange,
  falseAlarms,
  recall,
  days,
  pending,
}: Props) {
  const { slider } = rule;
  const defaultPct = ((defaultValue - slider.min) / (slider.max - slider.min)) * 100;
  const atDefault = Math.abs(value - defaultValue) < 1e-9;

  return (
    <section aria-label="Backtest" className="space-y-5 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{rule.label}: sensitivity</h2>
        <p className="text-xs text-slate-500">{rule.thresholdLabel(rule.threshold)}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span id="slider-label" className="text-slate-600">
            {slider.param === "madK" ? "Noise gate (k)" : "Fires at"}
          </span>
          <span className="shrink-0 font-semibold text-slate-900 tabular-nums">{slider.format(value)}</span>
        </div>
        <div className="relative pb-7">
          <Slider
            aria-labelledby="slider-label"
            aria-valuetext={slider.format(value)}
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={[value]}
            onValueChange={([v]) => onValueChange(+v.toFixed(4))}
            className="min-h-10 py-3"
          />
          {/* default position marker */}
          <div
            className={cn(
              "pointer-events-none absolute top-8 flex flex-col",
              defaultPct < 8 ? "items-start" : defaultPct > 92 ? "-translate-x-full items-end" : "-translate-x-1/2 items-center",
            )}
            style={{ left: `${defaultPct}%` }}
            aria-hidden
          >
            <span className="h-1.5 w-px bg-slate-400" />
            <span className="text-[11px] whitespace-nowrap text-slate-500">Default</span>
          </div>
          {/* End labels: desktop only (formats can be long), and not when "Default" sits at that end */}
          {defaultPct > 25 && (
            <span className="absolute top-8 left-0 hidden text-[11px] text-slate-500 tabular-nums md:block">
              {slider.format(slider.min)}
            </span>
          )}
          {defaultPct < 75 && (
            <span className="absolute top-8 right-0 hidden text-[11px] text-slate-500 tabular-nums md:block">
              {slider.format(slider.max)}
            </span>
          )}
        </div>
        <div className="flex justify-end">
          {!atDefault && (
            <button
              type="button"
              onClick={() => onValueChange(defaultValue)}
              className="min-h-10 text-xs text-brand underline underline-offset-2 hover:text-brand-ink md:min-h-0"
            >
              Reset to default ({slider.format(defaultValue)})
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">{slider.help}</p>
      </div>

      <div className={cn("space-y-4 transition-opacity", pending && "opacity-60")} aria-live="polite">
        <dl className={cn("grid gap-3", recall ? "grid-cols-2" : "grid-cols-1")}>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">False alarms (30 days)</dt>
            <dd className="text-3xl font-semibold text-slate-900 tabular-nums">{falseAlarms.firings.length}</dd>
            <dd className="text-xs text-slate-500">on clean, healthy history</dd>
          </div>
          {recall && (
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Real incidents caught</dt>
              <dd className="text-3xl font-semibold text-slate-900 tabular-nums">
                {recall.caught}
                <span className="text-lg text-slate-500"> / {recall.planted}</span>
              </dd>
              <dd className="text-xs text-slate-500">planted incidents</dd>
            </div>
          )}
        </dl>

        {recall && (
          <table className="w-full text-sm">
            <caption className="sr-only">Planted incidents caught, by type</caption>
            <tbody className="divide-y divide-slate-100">
              {recall.byType.map((t) => (
                <tr key={t.label}>
                  <th scope="row" className="py-1.5 text-left font-normal text-slate-700">
                    {t.label}
                  </th>
                  <td className="py-1.5 text-right text-slate-900 tabular-nums">
                    <span className="font-semibold">
                      {t.caught}/{t.planted}
                    </span>{" "}
                    <span className="text-slate-500">caught</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <FiringsBarChart days={days} />
        <p className="text-sm text-slate-600">{falseAlarms.note}</p>
      </div>
    </section>
  );
}
