import { cn } from "cn";
import type { NodeKey, TreeNode } from "@/lib/causalTree";
import type { CauseItem } from "@/lib/types";
import { formatMetric } from "@/utils/format";

function deltaLabel(d: number): string {
  if (d >= 999) return "off scale";
  return `${d > 0 ? "+" : ""}${d}%`;
}

function NodeCard({ node }: { node: TreeNode }) {
  const outOfBand = node.status !== "normal";
  const tone = node.isDriver
    ? "border-red-300 ring-2 ring-red-500"
    : node.lowVolume
      ? "border-dashed border-slate-300"
      : outOfBand
        ? "border-amber-300 bg-amber-50/50"
        : "border-slate-200";

  return (
    <div className={cn("min-w-0 rounded-lg border bg-white p-3", tone)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{node.label}</p>
        {node.isDriver && (
          <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            Driver
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400">{node.formula}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="text-sm tabular-nums">
          <span className="font-semibold text-slate-900">{formatMetric(node.actual, node.unit)}</span>
          <span className="text-slate-500"> vs {formatMetric(node.expected, node.unit)}</span>
        </p>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            node.isDriver ? "text-red-700" : outOfBand && !node.lowVolume ? "text-amber-800" : "text-slate-500",
          )}
        >
          {deltaLabel(node.deltaPct)}
        </span>
      </div>
      {node.lowVolume && <p className="mt-1 text-[11px] text-slate-500">low volume, not blamed</p>}
    </div>
  );
}

const CONTEXT: NodeKey[] = ["ctr", "impressions", "cpm", "spend"];

interface Props {
  nodes: TreeNode[];
  diagnosis: string;
  causes: CauseItem[];
  windowHours: number;
}

export function CausalTreePanel({ nodes, diagnosis, causes, windowHours }: Props) {
  const get = (k: NodeKey) => nodes.find((n) => n.key === k);
  const cpa = get("cpa");
  const cpc = get("cpc");
  const cvr = get("cvr");

  return (
    <section id="root-cause" aria-label="Root cause" className="scroll-mt-28 space-y-4 md:scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Root cause</h2>
        <p className="text-xs text-slate-500">
          Last {windowHours}h vs the same hours in prior weeks. Actual vs expected, Δ%.
        </p>
      </div>

      <div className="space-y-2">
        {cpa && (
          <div className="mx-auto max-w-xs">
            <NodeCard node={cpa} />
          </div>
        )}
        <div className="mx-auto flex max-w-xl justify-center" aria-hidden>
          <span className="h-3 w-px bg-slate-300" />
        </div>
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-2">
          {cpc && <NodeCard node={cpc} />}
          {cvr && <NodeCard node={cvr} />}
        </div>
        <p className="pt-2 text-xs font-medium text-slate-500">Context</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {CONTEXT.map((k) => {
            const n = get(k);
            return n ? <NodeCard key={k} node={n} /> : null;
          })}
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-900">{diagnosis}</p>

      <div className="border-t border-slate-100 pt-3">
        <h3 className="mb-2 text-xs font-medium text-slate-500">Likely segments (illustrative)</h3>
        <ul className="space-y-1.5">
          {causes.map((c) => (
            <li key={c.label} className="text-sm text-slate-700">
              <div className="flex justify-between gap-3">
                <span className="min-w-0">{c.label}</span>
                <span className="shrink-0 text-slate-500 tabular-nums">{Math.round(c.share * 100)}%</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-slate-100">
                <div className="h-1 rounded-full bg-slate-400" style={{ width: `${Math.round(c.share * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
