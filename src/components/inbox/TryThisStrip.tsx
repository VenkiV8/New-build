import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "cn";

// In-memory only (SPEC: no persistence beyond alert statuses). Survives route
// changes within the session, resets on a full page reload.
let dismissedThisSession = false;

const LINK =
  "inline-flex min-h-10 items-center font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand md:min-h-0";

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex min-h-10 items-center md:min-h-0">
      <span className="mr-1.5 font-semibold text-slate-400 tabular-nums">{n}</span>
      {children}
    </li>
  );
}

interface Props {
  onInjectTrackingBreak: () => void;
  /** most recent open incident, for steps 2 and 3; null when none is open */
  incidentId: string | null;
}

export function TryThisStrip({ onInjectTrackingBreak, incidentId }: Props) {
  const [dismissed, setDismissed] = useState(dismissedThisSession);
  // Mobile only: starts as a one-line banner; desktop always shows the full strip.
  const [expanded, setExpanded] = useState(false);
  if (dismissed) return null;

  const dismiss = () => {
    dismissedThisSession = true;
    setDismissed(true);
  };
  const href = incidentId ? `/incident/${encodeURIComponent(incidentId)}` : null;

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
      <p className="mb-2 font-semibold text-slate-900">Try this in 60 seconds</p>
      <ol className="grid gap-x-4 text-slate-600 md:grid-cols-4 md:gap-y-1.5">
        <Step n={1}>
          <button type="button" onClick={onInjectTrackingBreak} className={LINK}>
            Inject a tracking break
          </button>
        </Step>
        <Step n={2}>
          {href ? (
            <Link to={href} className={LINK}>
              Open the incident
            </Link>
          ) : (
            "Open the incident"
          )}
        </Step>
        <Step n={3}>
          {href ? (
            <Link to={`${href}#root-cause`} className={LINK}>
              See the ₹ math
            </Link>
          ) : (
            "See the ₹ math"
          )}
        </Step>
        <Step n={4}>
          <Link to="/rules" className={LINK}>
            Tune the rule in Sandbox
          </Link>
        </Step>
      </ol>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="size-4" />
      </button>
    </section>
    </>
  );
}
