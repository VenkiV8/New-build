import { FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InjectableClass } from "@/state/injection";

const INJECTS: { fc: InjectableClass; label: string }[] = [
  { fc: "TRACKING_BREAK", label: "Tracking break" },
  { fc: "SPEND_RUNAWAY", label: "Spend runaway" },
  { fc: "DELIVERY_FAILURE", label: "Delivery failure" },
];

interface Props {
  onInject: (fc: InjectableClass) => void;
  onReset: () => void;
}

/**
 * Fixed to the viewport bottom. The page reserves matching bottom padding
 * (InboxPage: pb-44 / sm:pb-28) so the last card is never covered.
 */
export function DemoToolbar({ onInject, onReset }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 px-4 pb-3">
      <section
        aria-label="Demo controls"
        className="mx-auto max-w-5xl rounded-xl border border-dashed border-slate-300 bg-white/95 p-3 shadow-lg backdrop-blur"
      >
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <FlaskConical className="size-3.5" aria-hidden />
          Demo controls
          <span className="font-normal tracking-normal normal-case sm:hidden">· inject an incident</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {INJECTS.map(({ fc, label }) => (
            <Button
              key={fc}
              variant="outline"
              size="sm"
              onClick={() => onInject(fc)}
              aria-label={`Inject: ${label}`}
              className="justify-start"
            >
              <span className="hidden text-slate-500 sm:inline">Inject:</span> {label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={onReset} className="justify-start sm:ml-auto">
            <RotateCcw aria-hidden />
            Reset demo
          </Button>
        </div>
      </section>
    </div>
  );
}
