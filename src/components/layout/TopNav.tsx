import { NavLink } from "react-router-dom";
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
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 md:py-3">
        <NavLink to="/" className="inline-flex min-h-10 items-center text-base font-semibold tracking-tight text-slate-900 md:min-h-0">
          BudgetPager
        </NavLink>
        {asOf && (
          <span className="ml-auto text-xs text-slate-500 sm:order-last">Data as of {asOf}</span>
        )}
        <nav aria-label="Main" className="-mx-1 flex w-full gap-1 overflow-x-auto sm:w-auto">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex min-h-10 items-center rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors md:min-h-0",
                  isActive ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:text-slate-900",
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
