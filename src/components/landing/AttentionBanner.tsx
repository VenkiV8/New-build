import { Link } from "react-router-dom";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { formatInr } from "@/utils/format";

interface Props {
  /** campaigns with OPEN or ACKED incidents */
  campaignsNeedingAttention: number;
  atRiskInr: number;
}

const CTA =
  "inline-flex min-h-11 shrink-0 items-center rounded-lg px-5 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none";

/** Nudge under the campaign table, carrying the primary "Open alerts inbox →" button. */
export function AttentionBanner({ campaignsNeedingAttention: n, atRiskInr }: Props) {
  const healthy = n === 0;
  return (
    <section
      aria-label="Attention"
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between",
        healthy
          ? "border-slate-200"
          : "border-sev1/30 shadow-[inset_3px_0_0_var(--bp-sev1)]",
      )}
    >
      <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
        {healthy ? (
          <>
            <ShieldCheck className="size-5 shrink-0 text-ok" aria-hidden />
            All campaigns healthy
          </>
        ) : (
          <>
            <TriangleAlert className="size-5 shrink-0 text-sev1" aria-hidden />
            <span>
              {n} campaign{n === 1 ? " needs" : "s need"} attention ·{" "}
              <span className="tabular-nums">{formatInr(atRiskInr)}</span> at risk now
            </span>
          </>
        )}
      </p>
      <Link
        to="/inbox"
        className={cn(
          CTA,
          healthy
            ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            : "bg-brand text-white shadow-sm hover:bg-brand-ink",
        )}
      >
        Open alerts inbox →
      </Link>
    </section>
  );
}
