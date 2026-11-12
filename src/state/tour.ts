// "Try this in 60 seconds" tour progress. Pure TS, no React.

export interface TourProgress {
  /** 1: any incident injected this session */
  injected: boolean;
  /** 2: any incident page opened */
  openedIncident: boolean;
  /** 3: an incident's #root-cause visited */
  sawRootCause: boolean;
  /** 4: /rules visited */
  visitedRules: boolean;
}

export type TourStep = keyof TourProgress;
export const TOUR_STEPS: TourStep[] = ["injected", "openedIncident", "sawRootCause", "visitedRules"];

export function emptyTour(): TourProgress {
  return { injected: false, openedIncident: false, sawRootCause: false, visitedRules: false };
}

/** Which tour steps a route visit completes. */
export function tourStepsForLocation(pathname: string, hash: string): TourStep[] {
  if (pathname.startsWith("/incident/")) {
    return hash === "#root-cause" ? ["openedIncident", "sawRootCause"] : ["openedIncident"];
  }
  if (pathname === "/rules") return ["visitedRules"];
  return [];
}
