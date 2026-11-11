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

export function DemoToolbar({ onInject, onReset }: Props) {
  return (
    <section
      aria-label="Demo controls"
      className="sticky bottom-3 z-10 rounded-xl border border-dashed border-slate-300 bg-white/95 p-3 shadow-lg backdrop-blur"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <FlaskConical className="size-3.5" aria-hidden />
        Demo controls
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {INJECTS.map(({ fc, label }) => (
          <Button key={fc} variant="outline" size="sm" onClick={() => onInject(fc)} className="justify-start">
            <span className="text-slate-500">Inject:</span> {label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={onReset} className="justify-start sm:ml-auto">
          <RotateCcw aria-hidden />
          Reset demo
        </Button>
      </div>
    </section>
  );
}
