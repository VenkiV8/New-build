import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
