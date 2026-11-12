import { Link } from "react-router-dom";
import { Activity, ChevronRight, GitBranch, SlidersHorizontal, Zap, type LucideIcon } from "lucide-react";

const ROWS: { icon: LucideIcon; title: string; body: string; to: string }[] = [
  { icon: Activity, title: "Detect", body: "Seasonal baselines across 5 failure classes", to: "/inbox" },
  { icon: GitBranch, title: "Diagnose", body: "Causal metric tree points to the likely driver", to: "/inbox" },
  { icon: Zap, title: "Act", body: "One-tap fixes and a tracking checklist", to: "/inbox" },
  { icon: SlidersHorizontal, title: "Tune", body: "Rule Sandbox: precision vs recall", to: "/rules" },
];

export function CapabilityRows() {
  return (
    <nav aria-label="What BudgetPager does" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <ul className="divide-y divide-slate-100">
        {ROWS.map(({ icon: Icon, title, body, to }) => (
          <li key={title}>
            <Link
              to={to}
              className="flex min-h-11 items-center gap-3 px-4 py-2.5 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
            >
              <Icon className="size-4 shrink-0 text-slate-500" aria-hidden />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-semibold text-slate-900">{title}</span>
                <span className="text-slate-600"> · {body}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
