/** Placeholder while a lazy page chunk loads: title, a card, a chart block. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-6 w-2/3 max-w-sm rounded bg-slate-200" />
      </div>
      <div className="h-24 rounded-xl border border-slate-200 bg-white" />
      <div className="h-64 rounded-xl border border-slate-200 bg-white p-4">
        <div className="h-full rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}
