import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, GRID, INK } from "@/components/incident/chartTheme";
import type { DayBucket } from "@/state/sandboxView";
import { formatDate } from "@/utils/format";

const dayTick = (ts: number) => formatDate(ts).split(", ")[1] ?? formatDate(ts);

interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: DayBucket }[];
}

function ChartTooltip({ active, payload }: TipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-900">{formatDate(row.ts)}</p>
      <p className="text-slate-600 tabular-nums">
        {row.count} false alarm{row.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function FiringsBarChart({ days }: { days: DayBucket[] }) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-xs font-medium text-slate-900">False alarms per day, last 30 days</figcaption>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="ts"
              tickFormatter={dayTick}
              interval={6}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID }}
            />
            <YAxis width={24} allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Bar dataKey="count" fill={INK} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            <Tooltip
              content={(props) => <ChartTooltip active={props.active} payload={props.payload as TipProps["payload"]} />}
              cursor={{ fill: "#f1f5f9" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
