import { useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { ChannelMatrix } from "@/components/notifications/ChannelMatrix";
import { DigestEmailMock } from "@/components/notifications/DigestEmailMock";
import { NoiseControls } from "@/components/notifications/NoiseControls";
import { PhoneMock } from "@/components/notifications/PhoneMock";
import { useApp } from "@/state/appContext";
import { dataEnd } from "@/state/inboxView";
import { buildDigest, whatsAppAlert } from "@/state/notificationView";

const ADVERTISER = "Arjun's skincare D2C";

export default function NotificationsPage() {
  const { history, alerts, statuses, applyAction } = useApp();
  // After Pause, keep showing the paused message rather than jumping to the next SEV1.
  const [pausedId, setPausedId] = useState<string | null>(null);
  const sev1 = useMemo(() => {
    const paused = pausedId ? alerts.find((a) => a.id === pausedId && statuses[a.id] === "RESOLVED") : undefined;
    return paused ?? whatsAppAlert(alerts, statuses);
  }, [alerts, statuses, pausedId]);
  const pause = () => {
    if (!sev1) return;
    applyAction(sev1.id, "Pause campaign");
    setPausedId(sev1.id);
  };
  const digest = useMemo(() => buildDigest(alerts, statuses), [alerts, statuses]);

  return (
    <div className="space-y-5">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
          <BellRing className="size-4 text-slate-400" aria-hidden />
          Notification preview
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">How each incident reaches you</h1>
        <p className="text-sm text-slate-500">Built from the incidents currently in your inbox.</p>
      </div>

      <ChannelMatrix />

      <div className="grid gap-6 md:grid-cols-[18rem_1fr] md:items-start">
        <PhoneMock alert={sev1} paused={!!sev1 && sev1.id === pausedId} onPause={pause} />
        <DigestEmailMock advertiser={ADVERTISER} date={dataEnd(history)} digest={digest} />
      </div>

      <NoiseControls />
    </div>
  );
}
