import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { BacktestPanel } from "@/components/rules/BacktestPanel";
import { BaselineComparisonCard } from "@/components/rules/BaselineComparisonCard";
import { RulesTable } from "@/components/rules/RulesTable";
import { sliderValueOf } from "@/components/rules/ruleMeta";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { backtestRule, compareBaselines, measureRecall, withSliderValue } from "@/lib/backtest";
import { generateHistory } from "@/lib/dataGenerator";
import { DEFAULT_RULES } from "@/lib/detector";
import type { FailureClass } from "@/lib/types";
import { useApp } from "@/state/appContext";
import { firingsByDay } from "@/state/sandboxView";

const byClass = (fc: FailureClass) => DEFAULT_RULES.find((r) => r.failureClass === fc)!;

const DEFAULT_VALUES = Object.fromEntries(DEFAULT_RULES.map((r) => [r.failureClass, sliderValueOf(r)])) as Record<
  FailureClass,
  number
>;

export default function RulesPage() {
  const { rules, setRuleEnabled } = useApp();
  const [selected, setSelected] = useState<FailureClass>("SPEND_RUNAWAY");
  // Sandbox slider values: local only, never touch the live rule set.
  const [values, setValues] = useState<Record<FailureClass, number>>(DEFAULT_VALUES);

  // False alarms are counted on clean (incident-free) history, never the live demo data.
  const cleanHistory = useMemo(() => generateHistory(), []);
  const endTs = useMemo(() => {
    const s = cleanHistory.c1;
    return s[s.length - 1].ts;
  }, [cleanHistory]);

  const value = values[selected];
  // Debounce a primitive key (an object would be a new value every render).
  const key = `${selected}|${value}`;
  const debouncedKey = useDebouncedValue(key, 250);
  const pending = debouncedKey !== key;

  const sandbox = useMemo(() => {
    const [fc, v] = debouncedKey.split("|");
    const rule = withSliderValue(byClass(fc as FailureClass), Number(v));
    const falseAlarms = backtestRule(rule, { history: cleanHistory });
    return {
      falseAlarms,
      recall: measureRecall(rule),
      days: firingsByDay(falseAlarms.firings, endTs),
    };
  }, [debouncedKey, cleanHistory, endTs]);

  // Always shown, for SPEND_RUNAWAY at its default threshold.
  const comparison = useMemo(() => compareBaselines(byClass("SPEND_RUNAWAY")), []);

  return (
    <div className="space-y-5">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
          <SlidersHorizontal className="size-4 text-slate-400" aria-hidden />
          Rule sandbox
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Tune a rule before it pages anyone</h1>
        <p className="text-sm text-slate-500">
          Pick a rule and move the slider: fewer false alarms, or more real incidents caught.
        </p>
      </div>

      <RulesTable rules={rules} selected={selected} onSelect={setSelected} onToggle={setRuleEnabled} />

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-start">
        <BacktestPanel
          rule={byClass(selected)}
          defaultValue={DEFAULT_VALUES[selected]}
          value={value}
          onValueChange={(v) => setValues((s) => ({ ...s, [selected]: v }))}
          falseAlarms={sandbox.falseAlarms}
          recall={sandbox.recall}
          days={sandbox.days}
          pending={pending}
        />
        <BaselineComparisonCard
          ruleLabel={byClass("SPEND_RUNAWAY").label}
          flat={comparison.flat.firings.length}
          seasonal={comparison.seasonal.firings.length}
          prevented={comparison.falseAlarmsPrevented}
        />
      </div>
    </div>
  );
}
