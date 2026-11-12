import { BellOff, CalendarCheck, Funnel, Layers, PhoneForwarded } from "lucide-react";

const CONTROLS = [
  {
    icon: Layers,
    title: "Incident grouping",
    body: "If more than 50% of campaigns break on the same metric in the same hour, you get ONE account-level incident, not one page per campaign.",
  },
  {
    icon: BellOff,
    title: "24h cooldown after Ack",
    body: "Once you acknowledge an incident, it stays quiet for 24 hours unless severity escalates.",
  },
  {
    icon: PhoneForwarded,
    title: "Escalation",
    body: "A SEV1 left unacknowledged for 30 minutes escalates to your backup contact.",
  },
  {
    icon: CalendarCheck,
    title: "Mark expected",
    body: "Marking an incident expected adds the date to the campaign's event calendar, so the baseline learns.",
  },
];

export function NoiseControls() {
  return (
    <section aria-label="Noise controls" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 flex flex-wrap items-center gap-1.5 text-base font-semibold text-slate-900">
        <Funnel className="size-4 text-slate-400" aria-hidden />
        Noise controls
        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 ring-inset">
          Policy · not simulated in this prototype
        </span>
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {CONTROLS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Icon className="size-4" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-medium text-slate-900">{title}</span>
              <span className="text-sm text-slate-600">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
