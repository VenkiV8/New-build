import { cn } from "cn";
import type { Severity } from "@/lib/types";
import { SEVERITY_STYLES } from "./alertMeta";

export function SeverityChip({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset",
        SEVERITY_STYLES[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
}
