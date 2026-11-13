import {
  BellOff,
  CalendarCheck,
  CircleCheck,
  CreditCard,
  Gauge,
  ListChecks,
  Pause,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AlertStatus } from "@/lib/types";
import { pastTenseFor, type Recommendation } from "@/state/recommendation";
import { formatInr } from "@/utils/format";

/** Icon for the recommended action button. */
function ActionIcon({ action }: { action: string }) {
  const a = action.toLowerCase();
  const cls = "size-5";
  if (a.startsWith("cap")) return <Gauge className={cls} aria-hidden />;
  if (a.startsWith("open tracking")) return <ListChecks className={cls} aria-hidden />;
  if (a.startsWith("rotate")) return <RefreshCw className={cls} aria-hidden />;
  if (a.startsWith("fix billing")) return <CreditCard className={cls} aria-hidden />;
  if (a.startsWith("pause")) return <Pause className={cls} aria-hidden />;
  return <Zap className={cls} aria-hidden />;
}

interface Props {
  recommendation: Recommendation;
  status: AlertStatus;
  /** the action that closed this alert (persisted), if any */
  actionTaken: string | undefined;
  /** ₹ credited when it was resolved (same helper as the prediction) */
  creditInr: number;
  onAction: (action: string) => void;
}

const POLICY =
  "Automation policy: only a SEV1 spend runaway can auto-pause (if no one acknowledges it within 30 min). Every other action needs one human tap, because a wrong auto-pause on a flagship campaign costs more than the anomaly.";

export function ActionRow({ recommendation: rec, status, actionTaken, creditInr, onAction }: Props) {
  // Acked is not closed: the row stays (e.g. reopen the tracking checklist, then Mark fixed).
  const closed = status === "RESOLVED" || status === "SNOOZED" || status === "EXPECTED";

  return (
    <section aria-label="Actions" className="space-y-3">
      {closed ? (
        status === "RESOLVED" ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
          >
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden />
            <span>
              {pastTenseFor(actionTaken)} by you just now ·{" "}
              <span className="tabular-nums">≈ {formatInr(creditInr)}</span> exposure stopped for the rest of today
            </span>
          </p>
        ) : (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
          >
            {status === "SNOOZED" ? (
              <BellOff className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
            ) : (
              <CalendarCheck className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
            )}
            <span>
              {actionTaken ? pastTenseFor(actionTaken) : status === "SNOOZED" ? "Snoozed for 24 h" : "Marked as expected"} just now
            </span>
          </p>
        )
      ) : (
        <>
          <div className="space-y-2">
            <div className="relative inline-flex">
              <Button
                onClick={() => onAction(rec.action)}
                className="bp-cta-shine h-12 gap-2 px-5 text-base font-semibold"
              >
                <ActionIcon action={rec.action} />
                {rec.action}
              </Button>
              <span className="pointer-events-none absolute -top-2.5 left-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-ink ring-1 ring-brand/30">
                Recommended
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {rec.reason} Saves <span className="font-semibold text-slate-900 tabular-nums">≈ {formatInr(rec.savingInr)}</span>{" "}
              for the rest of today.
            </p>
          </div>

          {rec.others.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">Other options</p>
              <div className="flex flex-wrap gap-2">
                {rec.others.map((a) => (
                  <Button key={a} variant="outline" onClick={() => onAction(a)} className="h-10 md:h-8">
                    {a}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <p className="text-xs text-slate-500">{POLICY}</p>
    </section>
  );
}
