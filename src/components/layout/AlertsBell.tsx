import { Link } from "react-router-dom";
import { Bell } from "lucide-react";

/** Top-bar bell: count of OPEN alerts (badge hidden at 0); goes to the inbox. */
export function AlertsBell({ openCount }: { openCount: number }) {
  return (
    <Link
      to="/inbox"
      aria-label={`Open alerts: ${openCount}`}
      className="relative flex size-10 items-center justify-center rounded-full text-slate-200 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-line focus-visible:outline-none"
    >
      <Bell className="size-5" aria-hidden />
      {openCount > 0 && (
        <span
          className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sev1 px-1 text-[10px] leading-none font-semibold text-white tabular-nums"
          aria-hidden
        >
          {openCount}
        </span>
      )}
    </Link>
  );
}
