import { Link, useParams } from "react-router-dom";
import { useApp } from "@/state/appContext";

// Slice 1 placeholder. Full incident detail lands in Slice 3.
export default function IncidentPage() {
  const { id } = useParams();
  const { alerts } = useApp();
  const alert = alerts.find((a) => a.id === id);

  return (
    <section className="space-y-3">
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to inbox
      </Link>
      {alert ? (
        <>
          <h1 className="text-xl font-semibold">{alert.headline}</h1>
          <p className="text-sm text-slate-600">{alert.explanation}</p>
        </>
      ) : (
        <p className="text-sm text-slate-600">This incident is no longer active. It may have been cleared by a demo reset.</p>
      )}
    </section>
  );
}
