// Seeded synthetic data. Same seed => identical data on every load (stable demo).
// Pure TS. No Math.random() anywhere in this project.

import type { Campaign, CampaignHistory, HourPoint, IncidentInjection } from "./types";

// ---------- seeded PRNG (mulberry32) ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller-ish cheap gaussian from a uniform PRNG */
function gauss(rnd: () => number, mean = 0, sd = 1): number {
  const u = Math.max(rnd(), 1e-9);
  const v = Math.max(rnd(), 1e-9);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Seeded Poisson sample (Knuth). Crucial for conversions: low-volume campaigns
 * expect < 0.5 conversions/hour, and Math.round() would force those to a constant 0,
 * which looks exactly like a tracking break. Counts must be sampled, not rounded.
 */
function poisson(rnd: () => number, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(gauss(rnd, lambda, Math.sqrt(lambda))));
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rnd(); } while (p > L);
  return k - 1;
}

// ---------- demo campaigns ----------
// Volumes are calibrated so that (a) daily spend ≈ daily budget (judges check this),
// (b) evening conversion rates are high enough that zero-conversion hours are rare
// for sales campaigns (so TRACKING_BREAK means something), and (c) c3 has enough
// hourly clicks that CTR drift is statistically detectable above noise.
export const CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Diwali Sale — Search intent", objective: "sales", dailyBudgetInr: 3000, avgCpcInr: 9, baseCtr: 0.03, baseCvr: 0.06, aovInr: 1200, scale: 700 },
  { id: "c2", name: "Retargeting — Cart abandoners", objective: "retargeting", dailyBudgetInr: 1600, avgCpcInr: 7, baseCtr: 0.035, baseCvr: 0.08, aovInr: 1400, scale: 400 },
  { id: "c3", name: "New arrivals — Contextual display", objective: "sales", dailyBudgetInr: 2000, avgCpcInr: 4, baseCtr: 0.012, baseCvr: 0.02, aovInr: 900, scale: 2500 },
  { id: "c4", name: "Brand awareness", objective: "awareness", dailyBudgetInr: 400, avgCpcInr: 3, baseCtr: 0.008, baseCvr: 0.005, aovInr: 900, scale: 900 },
];

export const DAYS = 30;
export const HOURS = DAYS * 24;

/** Hour-of-week traffic curve: evenings + weekends busier, 2–6am quiet. */
export function howCurve(hourOfWeek: number): number {
  const hod = hourOfWeek % 24;
  const dow = Math.floor(hourOfWeek / 24); // 0 = Monday in our convention
  const daily =
    0.35 +
    0.65 *
      Math.exp(-Math.pow(hod - 20, 2) / 18) + // evening peak ~8pm
    0.35 * Math.exp(-Math.pow(hod - 12, 2) / 20); // lunch bump
  const weekend = dow >= 5 ? 1.25 : 1.0;
  return daily * weekend;
}

// ---------- time: everything is computed in IST, never the viewer's time zone ----------
// The demo must look identical for every judge, on any day, in any time zone.

export const IST_OFFSET_MS = 5.5 * 3600_000;

/** Calendar fields of a timestamp as seen in IST (UTC+05:30). */
export function istParts(ts: number) {
  const d = new Date(ts + IST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    date: d.getUTCDate(),
    hours: d.getUTCHours(),
    /** 0 = Monday … 6 = Sunday */
    dow: (d.getUTCDay() + 6) % 7,
  };
}

export function hourOfWeek(ts: number): number {
  const p = istParts(ts);
  return p.dow * 24 + p.hours;
}

/** Same IST calendar day? */
export function sameIstDay(a: number, b: number): boolean {
  const x = istParts(a), y = istParts(b);
  return x.year === y.year && x.month === y.month && x.date === y.date;
}

/**
 * Demo "now": FIXED at Tue 10 Nov 2026, 8:00 PM IST (14:30 UTC).
 * Fixed rather than "most recent 8 PM" so the data, alerts and every number in the
 * case deck stay identical on every day and in every time zone. 8 PM is the evening
 * peak, so injected incidents land on high-traffic hours.
 * UI: format times with timeZone "Asia/Kolkata" and show "Data as of 8:00 PM IST".
 */
export const DEMO_NOW_TS = Date.UTC(2026, 10, 10, 14, 30);

export function demoNow(): number {
  return DEMO_NOW_TS;
}

/** Generate 30 days of clean hourly history for all campaigns. Deterministic for a given seed. */
export function generateHistory(seed = 42, endTs = demoNow()): CampaignHistory {
  const history: CampaignHistory = {};
  for (const c of CAMPAIGNS) {
    const rnd = mulberry32(seed + c.id.charCodeAt(1) * 1000);
    const points: HourPoint[] = [];
    for (let i = HOURS - 1; i >= 0; i--) {
      const ts = endTs - i * 3600_000;
      const how = hourOfWeek(ts);
      const trafficMult = howCurve(how) * Math.max(0.4, gauss(rnd, 1, 0.12));
      const impressions = Math.max(0, Math.round(c.scale * trafficMult));
      const ctr = Math.max(0.001, c.baseCtr * Math.max(0.3, gauss(rnd, 1, 0.15)));
      const clicks = Math.max(0, Math.round(impressions * ctr));
      const cvr = Math.max(0, c.baseCvr * Math.max(0, gauss(rnd, 1, 0.25)));
      const conversions = poisson(rnd, clicks * cvr);
      const cpc = c.avgCpcInr * Math.max(0.5, gauss(rnd, 1, 0.1));
      const spendInr = Math.round(clicks * cpc);
      points.push({ ts, impressions, clicks, conversions, spendInr });
    }
    history[c.id] = points;
  }
  return history;
}

/** Corrupt recent hours of one campaign to simulate an incident. Returns a NEW history object. */
export function injectIncident(history: CampaignHistory, inj: IncidentInjection): CampaignHistory {
  const series = history[inj.campaignId];
  if (!series) return history;
  const out: CampaignHistory = { ...history, [inj.campaignId]: series.map((p) => ({ ...p })) };
  const pts = out[inj.campaignId];
  const n = pts.length;
  for (let i = Math.max(0, n - inj.hours); i < n; i++) {
    const p = pts[i];
    switch (inj.failureClass) {
      case "TRACKING_BREAK":
        p.conversions = 0; // clicks & spend keep flowing — the silent killer
        break;
      case "SPEND_RUNAWAY":
        // Volume surge (e.g. broad-match / new placement cluster): 2.6× impressions,
        // clicks and spend at similar CTR and CPC, but the extra traffic converts
        // poorly — so the causal tree shows a delivery-volume driver, not a CTR one.
        p.impressions = Math.round(p.impressions * 2.6);
        p.clicks = Math.round(p.clicks * 2.6);
        p.spendInr = Math.round(p.spendInr * 2.6);
        p.conversions = Math.round(p.conversions * 1.3);
        break;
      case "DELIVERY_FAILURE":
        p.impressions = Math.round(p.impressions * 0.02);
        p.clicks = 0;
        p.conversions = 0;
        p.spendInr = 0;
        break;
      case "DRIFT":
        // ×0.45 puts the drop clearly beyond the 2×MAD noise floor for a
        // display campaign's hourly CTR — a ×0.55 drop is statistically ambiguous
        // at this volume, and the detector (correctly) refuses to page for it.
        p.clicks = Math.round(p.clicks * 0.45);
        p.conversions = Math.round(p.conversions * 0.45);
        p.spendInr = Math.round(p.spendInr * 0.5);
        break;
    }
  }
  return out;
}

/** The 3 incidents pre-seeded into the demo so the inbox is populated on first load. */
export const SEED_INCIDENTS: IncidentInjection[] = [
  { campaignId: "c2", failureClass: "TRACKING_BREAK", hours: 4 },
  { campaignId: "c1", failureClass: "SPEND_RUNAWAY", hours: 2 },
  { campaignId: "c3", failureClass: "DRIFT", hours: 3 },
];

export function generateSeededDemo(seed = 42): CampaignHistory {
  let h = generateHistory(seed);
  for (const inc of SEED_INCIDENTS) h = injectIncident(h, inc);
  return h;
}
