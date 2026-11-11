import { Flame, Hourglass, TrendingDown, Unplug, WifiOff, type LucideProps } from "lucide-react";
import type { FailureClass } from "@/lib/types";

export function FailureClassIcon({ failureClass, ...props }: { failureClass: FailureClass } & LucideProps) {
  switch (failureClass) {
    case "SPEND_RUNAWAY":
      return <Flame {...props} />;
    case "TRACKING_BREAK":
      return <Unplug {...props} />;
    case "DRIFT":
      return <TrendingDown {...props} />;
    case "DELIVERY_FAILURE":
      return <WifiOff {...props} />;
    case "BUDGET_EXHAUST":
      return <Hourglass {...props} />;
  }
}
