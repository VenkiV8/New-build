import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "cn";
import { useScrollOnNavigate } from "@/hooks/useScrollOnNavigate";
import { PageSkeleton } from "./PageSkeleton";
import { TopNav } from "./TopNav";

export function AppLayout() {
  useScrollOnNavigate();
  // The inbox has fixed demo controls (pill on mobile, bar from md); reserve room
  // below the footer so they never cover content.
  const isInbox = useLocation().pathname === "/";

  return (
    <div className={cn("flex min-h-dvh flex-col bg-slate-50 text-slate-900", isInbox && "pb-16 md:pb-28")}>
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 pt-2 pb-6 text-center text-xs text-slate-400">
        Prototype · synthetic data, generated in-browser · no backend
      </footer>
    </div>
  );
}
