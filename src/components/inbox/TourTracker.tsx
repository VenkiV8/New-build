import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "@/state/appContext";
import { tourStepsForLocation } from "@/state/tour";

/**
 * Invisible: records "Try this" tour progress from route visits (incident page,
 * its #root-cause, /rules) without touching those pages. Renders nothing.
 */
export function TourTracker() {
  const { pathname, hash } = useLocation();
  const { markTour } = useApp();
  useEffect(() => {
    for (const step of tourStepsForLocation(pathname, hash)) markTour(step);
  }, [pathname, hash, markTour]);
  return null;
}
