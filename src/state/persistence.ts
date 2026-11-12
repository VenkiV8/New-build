// Persist the demo session in localStorage so a reload keeps injected incidents,
// statuses, campaign state, rule toggles and the protected-₹ tally. No React here.
//
// Only the INPUTS are stored (injections in order, plus user decisions). On load the
// history is rebuilt deterministically: generateSeededDemo() + injectIncident() in the
// same order, then detectAll() with the saved rule set, so the same alert ids return.
import { CAMPAIGNS, generateSeededDemo, injectIncident } from "@/lib/dataGenerator";
import { DEFAULT_RULES, detectAll } from "@/lib/detector";
import type { Alert, AlertStatus, CampaignHistory, FailureClass, IncidentInjection, RuleConfig } from "@/lib/types";
import { INJECTION_TARGETS, type InjectableClass } from "./injection";
import { allCampaignsActive, type CampaignState } from "./protection";
import { emptyTour, TOUR_STEPS, type TourProgress } from "./tour";

export const STORAGE_KEY = "budgetpager:demo:v1";

/** Minimal Storage surface, so tests can pass an in-memory fake. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface SavedDemo {
  v: 1;
  injections: IncidentInjection[];
  statuses: Record<string, AlertStatus>;
  campaignState: Record<string, CampaignState>;
  rulesEnabled: Record<FailureClass, boolean>;
  protectedInr: number;
  /** "Try this" tour progress (optional: older saves without it load with no steps done) */
  tour?: TourProgress;
}

/** Everything the app needs to run, rebuilt from a saved session (or fresh). */
export interface DemoSession {
  history: CampaignHistory;
  rules: RuleConfig[];
  alerts: Alert[];
  injections: IncidentInjection[];
  statuses: Record<string, AlertStatus>;
  campaignState: Record<string, CampaignState>;
  protectedInr: number;
  tour: TourProgress;
}

const STATUSES: AlertStatus[] = ["OPEN", "ACKED", "RESOLVED", "SNOOZED", "EXPECTED"];
const STATES: CampaignState[] = ["active", "paused", "capped"];
const CAMPAIGN_IDS = CAMPAIGNS.map((c) => c.id);
const RULE_CLASSES = DEFAULT_RULES.map((r) => r.failureClass);
const SAVED_KEYS = ["v", "injections", "statuses", "campaignState", "rulesEnabled", "protectedInr", "tour"];

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const hasOnlyKeys = (o: Record<string, unknown>, keys: string[]) => Object.keys(o).every((k) => keys.includes(k));

/** Fresh seeded session: identical to a first load. */
export function freshSession(): DemoSession {
  const history = generateSeededDemo();
  return {
    history,
    rules: DEFAULT_RULES,
    alerts: detectAll(history, { rules: DEFAULT_RULES }),
    injections: [],
    statuses: {},
    campaignState: allCampaignsActive(),
    protectedInr: 0,
    tour: emptyTour(),
  };
}

/** The inputs worth saving from a running session. */
export function serialize(s: DemoSession): SavedDemo {
  return {
    v: 1,
    injections: s.injections.map(({ campaignId, failureClass, hours }) => ({ campaignId, failureClass, hours })),
    statuses: { ...s.statuses },
    campaignState: { ...s.campaignState },
    rulesEnabled: Object.fromEntries(s.rules.map((r) => [r.failureClass, r.enabled])) as Record<FailureClass, boolean>,
    protectedInr: s.protectedInr,
    tour: { ...s.tour },
  };
}

/** A session that a reload would reproduce without any saved state. */
export function isPristine(s: DemoSession): boolean {
  return (
    s.injections.length === 0 &&
    Object.keys(s.statuses).length === 0 &&
    Object.values(s.campaignState).every((c) => c === "active") &&
    s.rules.every((r) => r.enabled) &&
    s.protectedInr === 0 &&
    TOUR_STEPS.every((k) => !s.tour[k])
  );
}

/**
 * Strictly validate a saved payload. Anything unexpected (wrong version, unknown
 * fields, unknown campaign / class / status, bad numbers) → throw.
 */
export function parseSaved(raw: string): SavedDemo {
  const o: unknown = JSON.parse(raw);
  if (!isRecord(o) || o.v !== 1 || !hasOnlyKeys(o, SAVED_KEYS)) throw new Error("bad envelope");

  if (!Array.isArray(o.injections)) throw new Error("bad injections");
  const injections = o.injections.map((i): IncidentInjection => {
    if (!isRecord(i) || !hasOnlyKeys(i, ["campaignId", "failureClass", "hours"])) throw new Error("bad injection");
    const { campaignId, failureClass, hours } = i;
    if (typeof failureClass !== "string" || !(failureClass in INJECTION_TARGETS)) throw new Error("bad class");
    if (typeof campaignId !== "string" || !INJECTION_TARGETS[failureClass as InjectableClass].includes(campaignId))
      throw new Error("bad campaign");
    if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 1 || hours > 24) throw new Error("bad hours");
    return { campaignId, failureClass: failureClass as InjectableClass, hours };
  });

  if (!isRecord(o.statuses)) throw new Error("bad statuses");
  for (const v of Object.values(o.statuses)) if (!STATUSES.includes(v as AlertStatus)) throw new Error("bad status");

  if (!isRecord(o.campaignState) || !hasOnlyKeys(o.campaignState, CAMPAIGN_IDS)) throw new Error("bad campaignState");
  for (const v of Object.values(o.campaignState)) if (!STATES.includes(v as CampaignState)) throw new Error("bad state");

  if (!isRecord(o.rulesEnabled) || !hasOnlyKeys(o.rulesEnabled, RULE_CLASSES)) throw new Error("bad rulesEnabled");
  for (const v of Object.values(o.rulesEnabled)) if (typeof v !== "boolean") throw new Error("bad rule flag");

  if (typeof o.protectedInr !== "number" || !Number.isFinite(o.protectedInr) || o.protectedInr < 0)
    throw new Error("bad protectedInr");

  let tour = emptyTour();
  if (o.tour !== undefined) {
    if (!isRecord(o.tour) || !hasOnlyKeys(o.tour, TOUR_STEPS)) throw new Error("bad tour");
    for (const v of Object.values(o.tour)) if (typeof v !== "boolean") throw new Error("bad tour flag");
    tour = { ...tour, ...(o.tour as Partial<TourProgress>) };
  }

  return {
    v: 1,
    injections,
    statuses: o.statuses as Record<string, AlertStatus>,
    campaignState: o.campaignState as Record<string, CampaignState>,
    rulesEnabled: o.rulesEnabled as Record<FailureClass, boolean>,
    protectedInr: o.protectedInr,
    tour,
  };
}

/**
 * Rebuild a session from saved inputs: seeded history + injections in order,
 * detectAll with the saved rules, then restore decisions. Status entries whose
 * alert no longer exists are dropped.
 */
export function rebuild(saved: SavedDemo): DemoSession {
  let history = generateSeededDemo();
  for (const inj of saved.injections) history = injectIncident(history, inj);
  const rules = DEFAULT_RULES.map((r) => ({ ...r, enabled: saved.rulesEnabled[r.failureClass] ?? true }));
  const alerts = detectAll(history, { rules });
  const ids = new Set(alerts.map((a) => a.id));
  const statuses = Object.fromEntries(Object.entries(saved.statuses).filter(([id]) => ids.has(id)));
  return {
    history,
    rules,
    alerts,
    injections: saved.injections,
    statuses,
    campaignState: { ...allCampaignsActive(), ...saved.campaignState },
    protectedInr: saved.protectedInr,
    tour: { ...emptyTour(), ...saved.tour },
  };
}

/** window.localStorage, or null when unavailable / blocked (accessing it can throw). */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Remove the saved session. Never throws. */
export function clearSaved(storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/**
 * Initial session for app load: the saved one if valid, else fresh (and the bad key
 * is removed). Never throws.
 */
export function loadSession(storage: StorageLike | null = browserStorage()): DemoSession {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return freshSession();
  }
  if (raw === null) return freshSession();
  try {
    return rebuild(parseSaved(raw));
  } catch {
    clearSaved(storage);
    return freshSession();
  }
}

/**
 * Save after a state change. A pristine session (e.g. right after Reset) is not
 * stored: the key is removed instead, so a reload gives the seeded demo. Never throws.
 */
export function persistSession(s: DemoSession, storage: StorageLike | null = browserStorage()): void {
  if (isPristine(s)) {
    clearSaved(storage);
    return;
  }
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(serialize(s)));
  } catch {
    /* quota / private mode: keep running in memory */
  }
}
