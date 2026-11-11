import { cn } from "cn";
import { FailureClassIcon } from "@/components/alerts/FailureClassIcon";
import { Switch } from "@/components/ui/switch";
import type { FailureClass, RuleConfig } from "@/lib/types";
import { RULE_CHANNEL } from "./ruleMeta";

interface Props {
  rules: RuleConfig[];
  selected: FailureClass;
  onSelect: (fc: FailureClass) => void;
  onToggle: (fc: FailureClass, enabled: boolean) => void;
}

const COLS = "md:grid md:grid-cols-[1fr_2.6fr_1fr] md:items-center md:gap-4";

export function RulesTable({ rules, selected, onSelect, onToggle }: Props) {
  return (
    <section aria-label="Default rules" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="hidden items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500 md:flex">
        <div className={cn("flex-1", COLS)}>
          <span>Rule</span>
          <span>Trigger</span>
          <span>Channel</span>
        </div>
        <span className="w-10 text-right">On</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {rules.map((r) => {
          const isSelected = r.failureClass === selected;
          return (
            <li key={r.failureClass} className={cn("flex items-center gap-3 px-4 py-1", isSelected && "bg-slate-50")}>
              <button
                type="button"
                onClick={() => onSelect(r.failureClass)}
                aria-pressed={isSelected}
                className={cn(
                  "min-h-10 flex-1 py-2 text-left text-sm focus-visible:outline-none",
                  COLS,
                  !r.enabled && "opacity-60",
                )}
              >
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  <span
                    className={cn("h-4 w-0.5 rounded-full", isSelected ? "bg-slate-900" : "bg-transparent")}
                    aria-hidden
                  />
                  <FailureClassIcon failureClass={r.failureClass} className="size-4 text-slate-500" aria-hidden />
                  {r.label}
                </span>
                <span className="mt-0.5 block pl-8 text-xs text-slate-500 md:mt-0 md:pl-0 md:text-sm md:text-slate-600">
                  {r.thresholdLabel(r.threshold)}
                  <span className="md:hidden"> · {RULE_CHANNEL[r.failureClass]}</span>
                </span>
                <span className="hidden text-slate-600 md:block">{RULE_CHANNEL[r.failureClass]}</span>
              </button>
              {/* 40×40 hit area around the small switch (label activates it) */}
              <label htmlFor={`rule-switch-${r.failureClass}`} className="flex size-10 cursor-pointer items-center justify-end">
                <Switch
                  id={`rule-switch-${r.failureClass}`}
                  checked={r.enabled}
                  onCheckedChange={(on) => onToggle(r.failureClass, on)}
                  aria-label={`${r.label} rule ${r.enabled ? "on" : "off"}`}
                />
              </label>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        Actual channel follows severity: SEV1 WhatsApp + push, SEV2 push + in-app, SEV3 daily digest. Turning a rule
        off removes its alerts from the inbox.
      </p>
    </section>
  );
}
