import { NavLink } from "react-router-dom";
import { Clock } from "lucide-react";
import { cn } from "cn";
import { useApp } from "@/state/appContext";
import { formatClockTime } from "@/utils/format";

const LINKS = [
  { to: "/", label: "Inbox", end: true },
  { to: "/rules", label: "Rules", end: false },
  { to: "/notifications", label: "Notifications", end: false },
];

export function TopNav() {
  const { history } = useApp();
  const series = history.c1 ?? [];
  const asOf = series.length ? formatClockTime(series[series.length - 1].ts) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-topbar bg-topbar text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 md:py-3">
        <NavLink to="/" className="inline-flex min-h-10 items-center text-base font-semibold tracking-tight text-white md:min-h-0">
          BudgetPager
        </NavLink>
        {asOf && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-300 sm:order-last">
            <Clock className="size-3.5" aria-hidden />
            Data as of {asOf}
          </span>
        )}
        <nav aria-label="Main" className="-mx-1 flex w-full gap-1 overflow-x-auto sm:w-auto">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex min-h-10 items-center px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-brand-line focus-visible:outline-none md:min-h-0",
                  // active: 2px underline drawn as an inset shadow (no size change)
                  isActive
                    ? "font-medium text-white shadow-[inset_0_-2px_0_var(--bp-accent-line)]"
                    : "text-slate-300 hover:text-white",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
