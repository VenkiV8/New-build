import { Fragment, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { cn } from "cn";
import type { TourProgress, TourStep } from "@/state/tour";

// Dismissal is in-memory only: survives route changes, resets on a full reload.
// (Step completion is in app state and persisted with the demo session.)
let dismissedThisSession = false;

const LINK =
  "inline-flex min-h-10 items-center font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand md:min-h-0";

interface Props {
  onInjectTrackingBreak: () => void;
  /** most recent open incident, for steps 2 and 3; null when none is open */
  incidentId: string | null;
  tour: TourProgress;
}

function Circle({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        done ? "bg-ok text-white" : "border border-slate-300 bg-white text-slate-600",
      )}
      aria-hidden
    >
      {done ? <Check className="size-4" /> : n}
    </span>
  );
}

export function TryThisStrip({ onInjectTrackingBreak, incidentId, tour }: Props) {
  const [dismissed, setDismissed] = useState(dismissedThisSession);
  // Mobile only: starts as a one-line banner; desktop always shows the full stepper.
  const [expanded, setExpanded] = useState(false);
  if (dismissed) return null;

  const dismiss = () => {
    dismissedThisSession = true;
    setDismissed(true);
  };
  const href = incidentId ? `/incident/${encodeURIComponent(incidentId)}` : null;

  const steps: { key: TourStep; label: ReactNode }[] = [
    {
      key: "injected",
      label: (
        <button type="button" onClick={onInjectTrackingBreak} className={LINK}>
          Inject a tracking break
        </button>
      ),
    },
    {
      key: "openedIncident",
      label: href ? (
        <Link to={href} className={LINK}>
          Open the incident
        </Link>
      ) : (
        "Open the incident"
      ),
    },
    {
      key: "sawRootCause",
      label: href ? (
        <Link to={`${href}#root-cause`} className={LINK}>
          See the ₹ math
        </Link>
      ) : (
        "See the ₹ math"
      ),
    },
    {
      key: "visitedRules",
      label: (
        <Link to="/rules" className={LINK}>
          Tune the rule in Sandbox
        </Link>
      ),
    },
  ];
  const doneCount = steps.filter((s) => tour[s.key]).length;

  return (
    <>
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          aria-controls="try-this-strip"
          className="flex min-h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-left text-sm font-medium text-brand md:hidden"
        >
          New here? Try the 60-second tour
          <span aria-hidden>▸</span>
        </button>
      )}
      <section
        id="try-this-strip"
        aria-label="Try this in 60 seconds"
        className={cn(
          "relative rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm",
          !expanded && "hidden md:block",
        )}
      >
        <p className="mb-3 font-semibold text-slate-900">
          Try this in 60 seconds
          <span className="ml-2 text-xs font-normal text-slate-600 tabular-nums">
            {doneCount} of {steps.length} done
          </span>
        </p>
        {/* vertical stepper on mobile, horizontal with joining lines from md */}
        <ol className="flex flex-col text-slate-700 md:flex-row md:items-center">
          {steps.map((s, i) => {
            const done = tour[s.key];
            return (
              <Fragment key={s.key}>
                {i > 0 && (
                  <li aria-hidden className="flex md:flex-1">
                    {/* vertical joiner (mobile) / horizontal joiner (desktop) */}
                    <span className={cn("ml-3.5 h-3 w-px md:hidden", tour[steps[i - 1].key] ? "bg-ok" : "bg-slate-200")} />
                    <span
                      className={cn(
                        "mx-3 hidden h-px w-full md:block",
                        tour[steps[i - 1].key] ? "bg-ok" : "bg-slate-200",
                      )}
                    />
                  </li>
                )}
                <li className="flex min-h-10 items-center gap-2 md:min-h-0 md:shrink-0">
                  <Circle n={i + 1} done={done} />
                  <span>
                    {s.label}
                    <span className="sr-only">{done ? " (done)" : " (not done yet)"}</span>
                  </span>
                </li>
              </Fragment>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-4" />
        </button>
      </section>
    </>
  );
}
