import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { anomalousRanges, type BandPoint } from "@/lib/chartData";
import type { Alert } from "@/lib/types";
import { formatDateTime, formatMetric } from "@/utils/format";
import { ALERT, alertOnly, AXIS_TICK, BAND, GRID, HOUR, hourTicks, INK, MUTED, xTickLabel } from "./chartTheme";

type Unit = "inr" | "count" | "pctPoints";

const METRIC_LABELS: Record<Alert["metric"], { label: string; unit: Unit }> = {
  spend: { label: "Hourly spend", unit: "inr" },
  budget: { label: "Hourly spend", unit: "inr" },
  conversions: { label: "Conversions per hour", unit: "count" },
  impressions: { label: "Impressions per hour", unit: "count" },
  ctr: { label: "CTR", unit: "pctPoints" },
  cpa: { label: "CPA", unit: "inr" },
};

interface Row extends BandPoint {
  /** actual, only inside the alert window (plus the hour before, so the red line connects) */
  alertActual: number | null;
}

function axisValue(v: number, unit: Unit): string {
  if (unit === "pctPoints") return `${v.toFixed(1)}%`;
  if (unit === "inr") return v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${Math.round(v)}`;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
}

interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: Row }[];
  unit: Unit;
}

function ChartTooltip({ active, payload, unit }: TipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-slate-900">{formatDateTime(row.ts)}</p>
      <p className="flex justify-between gap-4 text-slate-600">
        Actual <span className="font-semibold text-slate-900 tabular-nums">{formatMetric(row.actual, unit)}</span>
      </p>
      <p className="flex justify-between gap-4 text-slate-600">
        Expected <span className="tabular-nums">{formatMetric(row.expected, unit)}</span>
      </p>
      <p className="flex justify-between gap-4 text-slate-500">
        Normal range{" "}
        <span className="tabular-nums">
          {formatMetric(row.band[0], unit)} – {formatMetric(row.band[1], unit)}
        </span>
      </p>
      {row.anomalous && <p className="mt-1 font-medium text-red-700">In alert window</p>}
    </div>
  );
}

export function MetricBandChart({ points, metric }: { points: BandPoint[]; metric: Alert["metric"] }) {
  const { label, unit } = METRIC_LABELS[metric];

  const rows: Row[] = useMemo(() => {
    const red = alertOnly(points, (p) => p.actual);
    return points.map((p, i) => ({ ...p, alertActual: red[i] }));
  }, [points]);
  const ranges = useMemo(() => anomalousRanges(points), [points]);
  const ticks = useMemo(() => hourTicks(points), [points]);

  if (points.length === 0) return null;
  const first = points[0].ts;
  const last = points[points.length - 1].ts;

  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="font-medium text-slate-900">{label}, last 72h</span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-slate-800" aria-hidden /> Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-slate-300/70" aria-hidden /> Expected range (median ± 2×MAD)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-red-600/15 ring-1 ring-red-600/40 ring-inset" aria-hidden /> Alert
          window
        </span>
      </figcaption>

      <div className="h-60 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={[first - HOUR / 2, last + HOUR / 2]}
              ticks={ticks}
              tickFormatter={xTickLabel}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              minTickGap={16}
            />
            <YAxis
              width={48}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => axisValue(v, unit)}
            />
            {ranges.map(([from, to]) => (
              <ReferenceArea
                key={from}
                x1={from - HOUR / 2}
                x2={to + HOUR / 2}
                fill={ALERT}
                fillOpacity={0.08}
                stroke={ALERT}
                strokeOpacity={0.3}
                ifOverflow="hidden"
              />
            ))}
            <Area
              dataKey="band"
              stroke="none"
              fill={BAND}
              fillOpacity={0.55}
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              dataKey="expected"
              stroke={MUTED}
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="actual"
              stroke={INK}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: INK, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              dataKey="alertActual"
              stroke={ALERT}
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: ALERT, stroke: ALERT }}
              activeDot={{ r: 4, fill: ALERT, stroke: "#fff", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Tooltip
              content={(props) => <ChartTooltip active={props.active} payload={props.payload as TipProps["payload"]} unit={unit} />}
              cursor={{ stroke: MUTED, strokeWidth: 1 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
