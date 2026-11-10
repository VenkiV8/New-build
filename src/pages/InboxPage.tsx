import { Link } from "react-router-dom";
import { CAMPAIGNS } from "@/lib/dataGenerator";
import { useApp } from "@/state/appContext";
import { formatInr } from "@/utils/format";

// Slice 1 placeholder: proves state + routing. Full inbox lands in Slice 2.
export default function InboxPage() {
  const { alerts } = useApp();
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Arjun's skincare D2C</h1>
        <p className="text-sm text-slate-500">{alerts.length} open incidents across {CAMPAIGNS.length} campaigns</p>
      </div>
      <ul className="space-y-2">
        {alerts.map((a) => (
          <li key={a.id}>
            <Link
              to={`/incident/${encodeURIComponent(a.id)}`}
              className="block rounded-lg border border-slate-200 bg-white p-3 text-sm hover:border-slate-300"
            >
              <span className="font-medium">{a.severity}</span> · {a.headline}{" "}
              <span className="font-semibold tabular-nums">({formatInr(a.inrAtRiskTotal)})</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
