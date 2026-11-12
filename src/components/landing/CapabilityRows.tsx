import { Link } from "react-router-dom";
import { Activity, GitBranch, SlidersHorizontal, Zap, type LucideIcon } from "lucide-react";
import { cn } from "cn";

const CARDS: { icon: LucideIcon; tile: string; title: string; body: string; to: string }[] = [
  {
    icon: Activity,
    tile: "bg-blue-50 text-blue-600",
    title: "Detect",
    body: "Seasonal baselines across 5 failure classes",
    to: "/inbox",
  },
  {
    icon: GitBranch,
    tile: "bg-violet-50 text-violet-600",
    title: "Diagnose",
    body: "Causal metric tree points to the likely driver",
    to: "/inbox",
  },
  {
    icon: Zap,
    tile: "bg-green-50 text-green-600",
    title: "Act",
    body: "One-tap fixes and a tracking checklist",
    to: "/inbox",
  },
  {
    icon: SlidersHorizontal,
    tile: "bg-amber-50 text-amber-600",
    title: "Tune",
    body: "Rule Sandbox: precision vs recall",
    to: "/rules",
  },
];

/** Four capability cards (2×2 on desktop, stacked on mobile); each whole card is a link. */
export function CapabilityRows() {
  return (
    <nav aria-label="What BudgetPager does">
      <ul className="grid gap-3 md:grid-cols-2">
        {CARDS.map(({ icon: Icon, tile, title, body, to }) => (
          <li key={title}>
            <Link
              to={to}
              className="group flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none motion-safe:transition-shadow"
            >
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tile)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{title}</span>
                <span className="block text-sm text-slate-600">{body}</span>
              </span>
              <span
                aria-hidden
                className="text-slate-400 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
