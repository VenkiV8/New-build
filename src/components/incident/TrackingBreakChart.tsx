import { useMemo, useState } from "react";
import { cn } from "cn";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { anomalousRanges, type TrackingPoint } from "@/lib/chartData";
import { formatDateTime } from "@/utils/format";
import {
  ALERT,
  ALERT_FILL,
  ALERT_LINE,
  alertOnly,
  AXIS_TICK,
  EXPECTED,
  GRID,
  HOUR,
  hourTicks,
  INK,
  MUTED,
  xTickLabel,
} from "./chartTheme";

interface Row extends TrackingPoint {
  alertActual: number | null;
}

interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: Row }[];
}

function ChartTooltip({ active, payload }: TipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-slate-900">{formatDateTime(row.ts)}</p>
      <p className="flex justify-between gap-4 text-slate-600">
        Conversions (4h) <span className="font-semibold text-slate-900 tabular-nums">{row.actual}</span>
      </p>
      <p className="flex justify-between gap-4 text-slate-600">
        Expected from clicks (4h) <span className="tabular-nums">{row.expected.toFixed(1)}</span>
      </p>
      {row.anomalous && <p className="mt-1 font-medium text-red-700">In alert window</p>}
    </div>
  );
}

const RANGES = [24, 72] as const;
type Range = (typeof RANGES)[number];

/** TRACKING_BREAK: rolling conversions vs what billed clicks should have produced. */
export function TrackingBreakChart({ points: all }: { points: TrackingPoint[] }) {
  const [range, setRange] = useState<Range>(24);
  const points = useMemo(() => all.slice(-range), [all, range]);
  const rows: Row[] = useMemo(() => {
    const red = alertOnly(points, (p) => p.actual);
    return points.map((p, i) => ({ ...p, alertActual: red[i] }));
  }, [points]);
  const ranges = useMemo(() => anomalousRanges(points), [points]);
  const ticks = useMemo(() => hourTicks(points, range === 24 ? 6 : 12), [points, range]);

  if (points.length === 0) return null;
  const first = points[0].ts;
  const last = points[points.length - 1].ts;

  return (
    <figure className="space-y-3">
      <figcaption className="space-y-1.5 text-xs text-slate-600">
        <span className="flex items-start justify-between gap-3">
          <span className="font-medium text-slate-900">
            Conversions vs what billed clicks should have produced, last {range}h
          </span>
          <span role="group" aria-label="Time range" className="flex shrink-0 rounded-lg bg-slate-100 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn(
                  "min-h-10 min-w-10 rounded-md px-2 text-xs font-medium md:min-h-7",
                  range === r ? "bg-white text-brand-ink shadow-xs" : "text-slate-500 hover:text-slate-900",
                )}
              >
                {r}h
              </button>
            ))}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-topbar" aria-hidden /> Conversions (rolling 4h)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-blue-500" aria-hidden /> Expected from billed clicks
            (rolling 4h)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-red-50 ring-1 ring-red-300 ring-inset" aria-hidden />{" "}
            Alert window
          </span>
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
            <YAxis width={36} allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            {ranges.map(([from, to]) => (
              <ReferenceArea
                key={from}
                x1={from - HOUR / 2}
                x2={to + HOUR / 2}
                fill={ALERT_FILL}
                fillOpacity={1}
                stroke={ALERT_LINE}
                strokeOpacity={1}
                ifOverflow="hidden"
              />
            ))}
            <Line
              dataKey="expected"
              stroke={EXPECTED}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, fill: EXPECTED, stroke: "#fff", strokeWidth: 2 }}
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
              content={(props) => <ChartTooltip active={props.active} payload={props.payload as TipProps["payload"]} />}
              cursor={{ stroke: MUTED, strokeWidth: 1 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
