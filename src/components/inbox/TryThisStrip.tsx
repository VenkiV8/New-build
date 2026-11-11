import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

// In-memory only (SPEC: no persistence beyond alert statuses). Survives route
// changes within the session, resets on a full page reload.
let dismissedThisSession = false;

const LINK =
  "inline-flex min-h-10 items-center font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900 md:min-h-0";

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
  if (dismissed) return null;

  const dismiss = () => {
    dismissedThisSession = true;
    setDismissed(true);
  };
  const href = incidentId ? `/incident/${encodeURIComponent(incidentId)}` : null;

  return (
    <section
      aria-label="Try this in 60 seconds"
      className="relative rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm"
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
  );
}
