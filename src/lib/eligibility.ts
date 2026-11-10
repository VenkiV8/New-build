// Stage 0 eligibility gates: decide, per campaign, which rule families are
// statistically meaningful BEFORE any rule runs. This is where most alert noise
// is prevented: a campaign with ~1 conversion/day cannot have a meaningful
// hourly conversion alert, no matter how the threshold is tuned.
// Pure TS.

import type { Campaign, HourPoint } from "./types";

export type GateStatus = "pass" | "fallback";

export interface Gate {
  id: "freshness" | "learning" | "conversionVolume" | "trafficVolume";
  label: string;
  status: GateStatus;
  detail: string;
}

export interface Eligibility {
  campaignId: string;
  gates: Gate[];
  /** short summary for a badge, e.g. "All rules active" */
  summary: string;
}

const LEARNING_DAYS = 14;
const MIN_WEEKLY_CONVERSIONS = 30; // ~4/day: below this, hourly zero-conversion runs are normal
const MIN_DAILY_IMPRESSIONS = 2400; // ~100/h: below this, hourly CTR is noise

export function evaluateEligibility(
  c: Campaign,
  series: HourPoint[],
  opts: { dataAgeMinutes?: number; campaignAgeDays?: number } = {},
): Eligibility {
  const last7 = series.slice(-24 * 7);
  const weeklyConv = last7.reduce((s, p) => s + p.conversions, 0);
  const dailyImp = last7.reduce((s, p) => s + p.impressions, 0) / 7;
  const ageDays = opts.campaignAgeDays ?? Math.floor(series.length / 24);
  const dataAge = opts.dataAgeMinutes ?? 12;

  const gates: Gate[] = [
    {
      id: "freshness",
      label: "Data freshness",
      status: dataAge <= 90 ? "pass" : "fallback",
      detail:
        dataAge <= 90
          ? `Reporting synced ${dataAge} min ago`
          : `Reporting is ${dataAge} min stale: alerts held, pipeline ticket raised instead`,
    },
    {
      id: "learning",
      label: "Learning phase",
      status: ageDays >= LEARNING_DAYS ? "pass" : "fallback",
      detail:
        ageDays >= LEARNING_DAYS
          ? `${ageDays} days of stable delivery`
          : `Day ${ageDays} of ${LEARNING_DAYS}: only hard budget guardrails apply`,
    },
    {
      id: "conversionVolume",
      label: "Conversion volume",
      status: weeklyConv >= MIN_WEEKLY_CONVERSIONS ? "pass" : "fallback",
      detail:
        weeklyConv >= MIN_WEEKLY_CONVERSIONS
          ? `${weeklyConv} conversions in the last 7 days`
          : `Only ${weeklyConv} conversions/week: conversion alerts roll up to a daily account-level check`,
    },
    {
      id: "trafficVolume",
      label: "Traffic volume",
      status: dailyImp >= MIN_DAILY_IMPRESSIONS ? "pass" : "fallback",
      detail:
        dailyImp >= MIN_DAILY_IMPRESSIONS
          ? `~${Math.round(dailyImp).toLocaleString("en-IN")} impressions/day`
          : `~${Math.round(dailyImp).toLocaleString("en-IN")} impressions/day: CTR drift checked daily, not hourly`,
    },
  ];

  const fallbacks = gates.filter((g) => g.status === "fallback");
  const summary =
    fallbacks.length === 0
      ? "All rules active"
      : `${fallbacks.length} rule famil${fallbacks.length === 1 ? "y" : "ies"} on fallback`;
  return { campaignId: c.id, gates, summary };
}
