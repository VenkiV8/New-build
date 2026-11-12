import type { SparkPoint } from "@/state/landingView";

const W = 120;
const H = 32;
const PAD = 2;
const SLATE_500 = "#64748b";
const RED_600 = "#dc2626";

/**
 * Hourly spend today as a tiny inline SVG (no Recharts). x = IST hour of day (0–23),
 * so the line ends where the day currently is. Incident hours (and the hour before,
 * so the segment connects) are drawn in red-600 with a light red fill under them.
 * `fluid` stretches it to the container width (mobile cards).
 */
export function Sparkline({ points, fluid = false }: { points: SparkPoint[]; fluid?: boolean }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.spendInr));
  const x = (hour: number) => PAD + (hour / 23) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - (v / max) * (H - 2 * PAD);
  const line = points.map((p) => `${x(p.hour).toFixed(1)},${y(p.spendInr).toFixed(1)}`).join(" ");

  // contiguous incident runs, each extended one point back so the red joins the grey line
  const runs: SparkPoint[][] = [];
  points.forEach((p, i) => {
    if (!p.inIncident) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === points[i - 1]) last.push(p);
    else runs.push(i > 0 ? [points[i - 1], p] : [p]);
  });
  const incidentHours = points.filter((p) => p.inIncident).length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={fluid ? "100%" : W}
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Hourly spend today${incidentHours ? `, ${incidentHours} incident hour${incidentHours === 1 ? "" : "s"}` : ""}`}
      className="block"
    >
      {runs.map((run, i) => {
        const pts = run.map((p) => `${x(p.hour).toFixed(1)},${y(p.spendInr).toFixed(1)}`).join(" ");
        const area = `${x(run[0].hour).toFixed(1)},${H} ${pts} ${x(run[run.length - 1].hour).toFixed(1)},${H}`;
        return <polygon key={`a${i}`} points={area} fill={RED_600} fillOpacity={0.12} />;
      })}
      <polyline
        points={line}
        fill="none"
        stroke={SLATE_500}
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {runs.map((run, i) => (
        <polyline
          key={`l${i}`}
          points={run.map((p) => `${x(p.hour).toFixed(1)},${y(p.spendInr).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={RED_600}
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
