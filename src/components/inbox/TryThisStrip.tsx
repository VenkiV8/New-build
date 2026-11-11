import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

// In-memory only (SPEC: no persistence beyond alert statuses). Survives route
// changes within the session, resets on a full page reload.
let dismissedThisSession = false;

export function TryThisStrip({ onInjectTrackingBreak }: { onInjectTrackingBreak: () => void }) {
  const [dismissed, setDismissed] = useState(dismissedThisSession);
  if (dismissed) return null;

  const dismiss = () => {
    dismissedThisSession = true;
    setDismissed(true);
  };

  return (
    <section
      aria-label="Try this in 60 seconds"
      className="relative rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm"
    >
      <p className="mb-2 font-semibold text-slate-900">Try this in 60 seconds</p>
      <ol className="grid gap-1.5 text-slate-600 sm:grid-cols-4 sm:gap-4">
        <li>
          <span className="mr-1.5 font-semibold text-slate-400 tabular-nums">1</span>
          <button
            type="button"
            onClick={onInjectTrackingBreak}
            className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
          >
            Inject a tracking break
          </button>
        </li>
        <li>
          <span className="mr-1.5 font-semibold text-slate-400 tabular-nums">2</span>Open the incident
        </li>
        <li>
          <span className="mr-1.5 font-semibold text-slate-400 tabular-nums">3</span>See the ₹ math
        </li>
        <li>
          <span className="mr-1.5 font-semibold text-slate-400 tabular-nums">4</span>
          <Link
            to="/rules"
            className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
          >
            Tune the rule in Sandbox
          </Link>
        </li>
      </ol>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="size-4" />
      </button>
    </section>
  );
}
