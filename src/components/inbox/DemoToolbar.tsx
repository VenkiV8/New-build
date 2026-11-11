import { useState } from "react";
import { FlaskConical, RotateCcw, X } from "lucide-react";
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
 * Desktop (md+): bar fixed to the viewport bottom; AppLayout reserves md:pb-28 on the inbox.
 * Mobile (<768px): a small floating "Demo ▸" pill that expands into the full
 * controls and collapses again after an inject or reset.
 */
export function DemoToolbar({ onInject, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <>
      {/* Desktop */}
      <div className="fixed inset-x-0 bottom-0 z-10 hidden px-4 pb-3 md:block">
        <section
          aria-label="Demo controls"
          className="mx-auto max-w-5xl rounded-xl border border-dashed border-slate-300 bg-white/95 p-3 shadow-lg backdrop-blur"
        >
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <FlaskConical className="size-3.5" aria-hidden />
            Demo controls
          </p>
          <div className="flex flex-wrap gap-2">
            {INJECTS.map(({ fc, label }) => (
              <Button key={fc} variant="outline" size="sm" onClick={() => onInject(fc)}>
                <span className="text-slate-500">Inject:</span> {label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto">
              <RotateCcw aria-hidden />
              Reset demo
            </Button>
          </div>
        </section>
      </div>

      {/* Mobile */}
      <div className="fixed right-4 bottom-4 z-10 md:hidden">
        {open ? (
          <section
            id="demo-controls-mobile"
            aria-label="Demo controls"
            className="w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-dashed border-slate-300 bg-white p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <FlaskConical className="size-3.5" aria-hidden />
                Demo controls
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close demo controls"
                className="-mr-1 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-2">
              {INJECTS.map(({ fc, label }) => (
                <Button
                  key={fc}
                  variant="outline"
                  onClick={() => run(() => onInject(fc))}
                  className="h-10 justify-start"
                >
                  <span className="text-slate-500">Inject:</span> {label}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => run(onReset)} className="h-10 justify-start">
                <RotateCcw aria-hidden />
                Reset demo
              </Button>
            </div>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls="demo-controls-mobile"
            className="flex h-10 items-center gap-1.5 rounded-full border border-dashed border-slate-400 bg-white px-4 text-sm font-medium text-slate-700 shadow-lg"
          >
            <FlaskConical className="size-4" aria-hidden />
            Demo ▸
          </button>
        )}
      </div>
    </>
  );
}
