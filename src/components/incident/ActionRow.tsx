import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/components/alerts/alertMeta";
import type { AlertStatus } from "@/lib/types";

interface Props {
  actions: string[];
  status: AlertStatus;
  onAction: (action: string) => void;
}

export function ActionRow({ actions, status, onAction }: Props) {
  const open = status === "OPEN";
  return (
    <section aria-label="Actions" className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a, i) => (
          <Button
            key={a}
            variant={i === 0 ? "default" : "outline"}
            disabled={!open}
            onClick={() => onAction(a)}
            className="h-10 md:h-8"
          >
            {a}
          </Button>
        ))}
      </div>
      {!open && (
        <p className="text-sm text-slate-600">
          Status: <span className="font-medium text-slate-900">{STATUS_LABELS[status]}</span>
        </p>
      )}
    </section>
  );
}
