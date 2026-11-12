import { Link, NavLink } from "react-router-dom";
import { Clock } from "lucide-react";
import { cn } from "cn";
import { demoNow } from "@/lib/dataGenerator";
import { useApp } from "@/state/appContext";
import { atRiskNow } from "@/state/protection";
import { formatClockTime } from "@/utils/format";
import { AccountMenu } from "./AccountMenu";
import { AlertsBell } from "./AlertsBell";

const LINKS = [
  { to: "/inbox", label: "Inbox" },
  { to: "/rules", label: "Rules" },
  { to: "/notifications", label: "Notifications" },
];

export function TopNav() {
  const { alerts, statuses } = useApp();
  // Fixed demo clock, always shown in IST ("8:00 PM IST").
  const asOf = `${formatClockTime(demoNow())} IST`;
  // Bell counts OPEN (unacknowledged) alerts only.
  const openCount = atRiskNow(alerts, statuses).unackedCount;

  return (
    <header className="sticky top-0 z-20 border-b border-topbar bg-topbar text-white">
      {/* Row height stays 40px + py-2 (mobile) and 40px + md:py-2 (desktop, was 32px + py-3): no shift. */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
        <Link
          to="/"
          className="inline-flex min-h-10 items-center text-base font-semibold tracking-tight text-white md:min-h-0"
        >
          BudgetPager
        </Link>
        <nav
          aria-label="Main"
          className="-mx-1 order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto"
        >
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
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
        <div className="ml-auto flex items-center gap-1">
          {/* on smaller screens this lives in the account menu instead */}
          <span className="mr-2 hidden items-center gap-1 text-xs text-slate-300 md:inline-flex">
            <Clock className="size-3.5" aria-hidden />
            Data as of {asOf}
          </span>
          <AlertsBell openCount={openCount} />
          <AccountMenu asOf={asOf} />
        </div>
      </div>
    </header>
  );
}
