import { describe, expect, it } from "vitest";
import { emptyTour, tourStepsForLocation } from "./tour";

describe("tourStepsForLocation", () => {
  it("maps route visits to tour steps", () => {
    expect(tourStepsForLocation("/incident/c1-X-1", "")).toEqual(["openedIncident"]);
    expect(tourStepsForLocation("/incident/c1-X-1", "#root-cause")).toEqual(["openedIncident", "sawRootCause"]);
    expect(tourStepsForLocation("/rules", "")).toEqual(["visitedRules"]);
    expect(tourStepsForLocation("/inbox", "")).toEqual([]);
    expect(tourStepsForLocation("/", "")).toEqual([]);
  });

  it("starts with nothing done", () => {
    expect(Object.values(emptyTour())).toEqual([false, false, false, false]);
  });
});
