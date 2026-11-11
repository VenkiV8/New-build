import { Check } from "lucide-react";
import { SeverityChip } from "@/components/alerts/SeverityChip";
import type { Severity } from "@/lib/types";
import { CHANNELS, SEVERITY_CHANNELS } from "@/state/notificationView";

const SEVERITIES: Severity[] = ["SEV1", "SEV2", "SEV3"];

export function ChannelMatrix() {
  return (
    <section aria-label="Severity to channel" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-base font-semibold text-slate-900">Severity → channel</h2>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th scope="col" className="w-16 pb-2 text-left font-medium">
              <span className="sr-only">Severity</span>
            </th>
            {CHANNELS.map((c) => (
              <th key={c} scope="col" className="pb-2 text-center font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {SEVERITIES.map((s) => (
            <tr key={s}>
              <th scope="row" className="py-2.5 text-left">
                <SeverityChip severity={s} />
              </th>
              {CHANNELS.map((c) => {
                const on = SEVERITY_CHANNELS[s].includes(c);
                return (
                  <td key={c} className="py-2.5 text-center">
                    {on ? (
                      <Check className="mx-auto size-4 text-slate-900" aria-label="Yes" />
                    ) : (
                      <span className="text-slate-300" aria-label="No">
                        –
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
