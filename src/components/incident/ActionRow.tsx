import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/components/alerts/alertMeta";
import type { AlertStatus } from "@/lib/types";

interface Props {
  actions: string[];
  status: AlertStatus;
  onAction: (action: string) => void;
}

export function ActionRow({ actions, status, onAction }: Props) {
  // Acked is not closed: actions stay available (e.g. reopen the tracking checklist).
  const actionable = status === "OPEN" || status === "ACKED";
  return (
    <section aria-label="Actions" className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a, i) => (
          <Button
            key={a}
            variant={i === 0 ? "default" : "outline"}
            disabled={!actionable}
            onClick={() => onAction(a)}
            className="h-10 md:h-8"
          >
            {a}
          </Button>
        ))}
      </div>
      {status !== "OPEN" && (
        <p className="text-sm text-slate-600">
          Status: <span className="font-medium text-slate-900">{STATUS_LABELS[status]}</span>
        </p>
      )}
      <p className="text-xs text-slate-500">
        Automation policy: only a SEV1 spend runaway can auto-pause (if no one acknowledges it within 30 min). Every
        other action needs one human tap, because a wrong auto-pause on a flagship campaign costs more than the anomaly.
      </p>
    </section>
  );
}
