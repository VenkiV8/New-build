import { Link } from "react-router-dom";
import { failureClassLabel } from "@/components/alerts/alertMeta";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import type { Alert } from "@/lib/types";
import { caughtAt } from "@/state/notificationView";
import { formatClockTime, formatInr } from "@/utils/format";

interface Props {
  alert: Alert | null;
  /** true once this alert was paused from the phone's quick reply */
  paused: boolean;
  /** Pause quick reply: same action as Pause on the incident page */
  onPause: () => void;
}

/** Mock of a SEV1 chat message (generic chat UI, not a real app's branding). "View" is static. */
export function PhoneMock({ alert, paused, onPause }: Props) {
  const campaign = alert ? (CAMPAIGNS.find((c) => c.id === alert.campaignId)?.name ?? alert.campaignId) : "";

  return (
    <section aria-label="WhatsApp message preview" className="space-y-3">
      <h2 className="text-base font-semibold text-slate-900">
        WhatsApp <span className="text-sm font-normal text-slate-500">(SEV1, mock)</span>
      </h2>
      <div className="mx-auto w-full max-w-[18rem] rounded-[2rem] border-[6px] border-slate-900 bg-slate-900 shadow-xl">
        <div className="overflow-hidden rounded-[1.6rem] bg-slate-100">
          <div className="flex items-center gap-2 bg-slate-800 px-4 pt-5 pb-3 text-white">
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900">
              BP
            </span>
            <span>
              <span className="block text-sm font-semibold">BudgetPager</span>
              <span className="block text-[11px] text-slate-300">Business account</span>
            </span>
          </div>

          <div className="min-h-72 space-y-2 px-3 py-4">
            {alert ? (
              <>
                <div className="rounded-lg rounded-tl-none bg-white p-3 text-[13px] leading-snug text-slate-800 shadow-sm">
                  <p className="font-semibold text-sev1-ink">
                    {alert.severity} · {failureClassLabel(alert.failureClass)}
                  </p>
                  <p className="font-medium">{campaign}</p>
                  <p className="mt-1">{alert.headline}</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatInr(alert.inrAtRiskPerHour)}/h at risk</p>
                  <p className="mt-1 text-right text-[10px] text-slate-400">{formatClockTime(caughtAt(alert))}</p>
                </div>
                <div className="grid grid-cols-2 gap-2" aria-label="Quick replies">
                  {paused ? (
                    <span className="flex min-h-10 items-center justify-center rounded-lg bg-white text-[13px] font-medium text-slate-500 shadow-sm">
                      Paused ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={onPause}
                      className="min-h-10 rounded-lg bg-white text-[13px] font-medium text-brand-ink shadow-sm hover:bg-slate-50 active:bg-slate-100"
                    >
                      Pause
                    </button>
                  )}
                  <span className="flex min-h-10 items-center justify-center rounded-lg bg-white text-[13px] font-medium text-brand-ink shadow-sm">
                    View
                  </span>
                </div>
              </>
            ) : (
              <p className="px-2 pt-16 text-center text-sm text-slate-500">
                No open SEV1 incidents. Nothing would be sent to WhatsApp right now.
              </p>
            )}
          </div>
        </div>
      </div>
      {alert && (
        <p className="text-center text-sm">
          <Link
            to={`/incident/${encodeURIComponent(alert.id)}`}
            className="inline-flex min-h-10 items-center text-brand underline underline-offset-2 hover:text-brand-ink md:min-h-0"
          >
            Open this incident
          </Link>
        </p>
      )}
    </section>
  );
}
