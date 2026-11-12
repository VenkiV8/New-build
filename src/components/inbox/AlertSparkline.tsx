import type { CardSpark, CardSparkPoint } from "@/state/inboxCards";

const W = 140;
const H = 36;
const PAD = 2;

/**
 * Card sparkline (inline SVG, no Recharts): the alert's metric over the last 24h.
 * Grey line = actual; dashed = expected from clicks (tracking break only);
 * incident hours in red with a light red fill. `fluid` stretches to full width (mobile).
 */
export function AlertSparkline({ spark, fluid = false }: { spark: CardSpark; fluid?: boolean }) {
  const pts = spark.points;
  if (pts.length < 2) return null;
  const max = Math.max(1e-9, ...pts.map((p) => Math.max(p.value, p.expected ?? 0)));
  const x = (i: number) => PAD + (i / (pts.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - (v / max) * (H - 2 * PAD);
  const coords = (list: { i: number; v: number }[]) => list.map(({ i, v }) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const actual = coords(pts.map((p, i) => ({ i, v: p.value })));
  const expected = spark.hasExpected ? coords(pts.map((p, i) => ({ i, v: p.expected ?? 0 }))) : null;

  // incident runs, extended one point back so the red joins the grey line
  const runs: { i: number; p: CardSparkPoint }[][] = [];
  pts.forEach((p, i) => {
    if (!p.inIncident) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1].i === i - 1) last.push({ i, p });
    else runs.push(i > 0 ? [{ i: i - 1, p: pts[i - 1] }, { i, p }] : [{ i, p }]);
  });
  const incidentHours = pts.filter((p) => p.inIncident).length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={fluid ? "100%" : W}
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${spark.metric}, last 24 hours${incidentHours ? `; ${incidentHours} incident hours` : ""}`}
      className="block"
    >
      {runs.map((run, k) => {
        const line = coords(run.map(({ i, p }) => ({ i, v: p.value })));
        const area = `${x(run[0].i).toFixed(1)},${H} ${line} ${x(run[run.length - 1].i).toFixed(1)},${H}`;
        return <polygon key={`a${k}`} points={area} fill="#dc2626" fillOpacity={0.12} />;
      })}
      {expected && (
        <polyline
          points={expected}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.25}
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <polyline
        points={actual}
        fill="none"
        stroke="#64748b"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {runs.map((run, k) => (
        <polyline
          key={`l${k}`}
          points={coords(run.map(({ i, p }) => ({ i, v: p.value })))}
          fill="none"
          stroke="#dc2626"
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
