# BudgetPager — "On-call for your ad budget"
(Do NOT use the name "AdGuard": it is an existing ad-blocker company.)
Anomaly alerting system for ad campaign performance (Media.net APM case, Problem #2).

## One-paragraph thesis
SMB advertisers lose money silently: tracking breaks, budgets vanish by 11am, ads get
disapproved, performance drifts. Existing dashboards make users hunt for problems.
BudgetPager inverts this: it pages you like an on-call system — only when money is at risk,
with a diagnosis and a one-tap fix. Severity is measured in ₹ at risk, not metric deltas.

## Hard constraints
- 100% client-side. No backend, no login, no API keys, no external calls.
- All data is synthetic, generated in-browser from a SEEDED PRNG (same data every load).
- Detection logic is deterministic statistics (hour-of-week median + MAD). No LLM calls.
  "AI explanations" are template-generated text.
- Stack: Vite + React + TypeScript + Tailwind + shadcn/ui + Recharts.
- Must work on mobile (375px) and desktop. Must load in < 3s.
- Core logic lives in src/lib/ (types.ts, dataGenerator.ts, detector.ts, backtest.ts,
  causalTree.ts, eligibility.ts)
  and is NEVER mixed into components. UI imports from lib, never the reverse.

## Demo data
- 1 advertiser ("Arjun's skincare D2C") with 4 campaigns:
  C1 "Diwali Sale — Search intent" (₹3,000/day), C2 "Retargeting — Cart abandoners" (₹1,600/day),
  C3 "New arrivals — Contextual display" (₹2,000/day), C4 "Brand awareness" (₹400/day).
- 30 days of hourly data per campaign, ending at the most recent 8:00 PM (demoNow() —
  anchoring to the evening peak keeps injected incidents meaningful at any load time;
  show "Data as of 8:00 PM" subtly in the header). Hour-of-week seasonality + noise.
- 3 pre-seeded incidents in the last 48h (one tracking break, one spend runaway, one CTR drift)
  so the inbox is never empty on first load.

## Screens (4)
### 1. Incident Inbox (home, route /)
- Header: advertiser name and three stats:
  "At risk now" = sum of inrAtRiskTotal for OPEN alerts, subtitle "across N open incidents";
  "Protected this session" = starts at ₹0; when an action resolves an alert (Pause / Cap budget /
  Fix tracking etc., not Snooze or Mark expected) add that alert's inrAtRiskPerHour × 24
  (rest-of-day exposure avoided) and toast "₹X/day exposure stopped"; resets with the demo;
  alert-budget indicator ("2 of 5 daily alerts used").
- Campaign health strip: one chip per campaign with evaluateEligibility().summary
  (e.g. "Brand awareness: 1 rule family on fallback"); click opens a popover listing the 4 gates
  (data freshness, learning phase, conversion volume, traffic volume) with pass/fallback + detail.
  This visibly shows WHY a low-volume campaign is not spamming alerts.
  Chips wrap (no horizontal scroll); campaigns with any fallback gate sort first, with amber border/icon.
- List of alert cards sorted by ₹ at risk (desc). Card: severity chip (SEV1 red / SEV2 amber / SEV3 grey),
  failure-class icon + label, campaign name, one-line summary ("Conversions = 0 for 3h while 142 clicks
  billed — est. ₹1,340 at risk"), "started Xh ago · caught Nh after onset" (N = the rule's minHours),
  status (Open / Acked / Resolved). Alerts beyond the 5/day alert budget show in a "folded into
  today's digest" section.
- Demo toolbar (clearly marked "Demo controls"): [Inject: Tracking break] [Inject: Spend runaway]
  [Inject: Delivery failure] [Reset demo]. Injecting mutates the data for one campaign's recent hours,
  re-runs the detector, and a new alert animates into the inbox with a toast.
  Desktop (≥768px): bar fixed to the bottom; the page reserves bottom padding so it never covers the
  last card. Mobile (<768px): a floating "Demo ▸" pill at bottom-right that expands into the full
  controls on tap and collapses after an inject/reset.
- Mobile tap targets (Try-this links, campaign chips, demo buttons) are at least 40px tall.
### 2. Incident Detail (route /incident/:id)
- Title, severity, ₹ at risk/hour, started-at ("caught Nh after onset"), affected campaign.
- Chart: actual metric line vs expected band (median ± 2×MAD from baseline) for last 72h,
  anomalous hours shaded red. Recharts Area + Line.
  TRACKING_BREAK instead charts two lines over the last 72h: "Conversions (rolling 4h)" = sum of actual
  conversions over the trailing 4 hours, and "Expected from billed clicks (rolling 4h)" = sum over the
  trailing 4 hours of clicks × campaign.baseCvr (dashed), keeping the red alert-window shading.
  Title: "Conversions vs what billed clicks should have produced, last 72h".
  Series computed in src/lib/chartData.ts (pure TS, unit-tested).
- "Root cause" panel = causal metric tree from buildCausalTree(series, alertWindowHours):
  CPA → CPC (auction price) & CVR; context row: CTR, impressions, effective CPM, spend.
  Each node: label, formula (small, muted), actual vs expected, Δ%. Driver node = red ring + "Driver" tag;
  out-of-band nodes amber; normal nodes grey. Nodes with lowVolume=true show "low volume, not blamed".
  Under the tree: diagnoseTree(nodes) sentence in bold. Then, smaller, the existing alert.causes list
  titled "Likely segments (illustrative)".
- alertWindowHours = hours between alert.startedAt and the last data point (+1), min 1.
- Action row: primary one-tap action per class (Pause campaign / Cap budget / Open tracking checklist /
  Snooze 24h / Mark expected — "it's Diwali"). Actions update alert status in client state and toast.
  "Mark expected" says the date is added to the campaign's expected-events calendar.
### 3. Rule Sandbox (route /rules)
- Table of the 5 default rules (class, trigger via thresholdLabel, channel, on/off toggle).
  The on/off toggle changes LIVE detection (rule set lives in app state); injecting a disabled
  rule's incident shows "rule is off"; Reset demo re-enables all rules.
- Select a rule → slider driven by rule.slider (param, min, max, step, format, help). Apply the value
  with withSliderValue(rule, v). The slider is a SANDBOX: it never changes live detection.
  Note: for DRIFT the slider is the noise gate k (robust z-score), not a % threshold.
- Two result numbers side by side, recomputed (debounced 250ms) on every slider move:
  "False alarms (30 days)" = backtestRule(r).firings.length, computed on CLEAN replayed history,
  never the live demo data, which is why every firing counts as a false alarm;
  "Real incidents caught" = measureRecall(r) → "caught / planted" (hide for BUDGET_EXHAUST: null).
  Below: the measureRecall byType table (e.g. "CTR −20%: 2/5 caught") and the slider.help line.
  Also: per-day bar chart of false alarms and the backtestRule note string.
  This is the precision/recall trade-off made tangible; label the default value position on the slider.
- "Why seasonal baselines" comparison card using compareBaselines(rule) for SPEND_RUNAWAY: two big
  numbers, "Seasonality-blind rule: 50 false alarms" vs "BudgetPager: 9" + "41 false alarms prevented"
  (values come from the function). Caption: "Both counted on 30 days of healthy campaigns."
  Show this card regardless of which rule is selected.

### 4. Notification Preview (route /notifications)
- Severity → channel matrix (SEV1: WhatsApp + push, SEV2: push + in-app, SEV3: daily digest).
- Mock WhatsApp phone frame showing a SEV1 message with [Pause] [View] quick replies.
- Mock daily-digest email card. Static mocks driven by the latest real alerts in state.
- "Noise controls" panel (static explanatory UI, no logic needed): incident grouping (if >50% of
  campaigns break on the same metric in the same hour, send ONE account-level incident), 24h cooldown
  after Ack unless severity escalates, SEV1 unacknowledged for 30 min escalates to backup contact,
  "Mark expected" feeds the event calendar so the baseline learns.

## The 5 failure classes & default rules (see detector.ts — already implemented)
| Class | Trigger | Default | Severity basis |
|---|---|---|---|
| SPEND_RUNAWAY | spend pacing vs expected-by-hour baseline | >150% for 1h | overspend ₹/h |
| TRACKING_BREAK | conversions=0 while ≥4 were expected from billed clicks | 3 consecutive h | spend with no measurable return |
| DRIFT | CTR vs same-hour-of-week median | deviation > k×MAD (k=2) AND ≥15%, for 2h, ≥150 impressions/h | est. lost conversions × AOV margin proxy |
| DELIVERY_FAILURE | impressions < 50% of expected | 2h | expected-hours' budget forfeited |
| BUDGET_EXHAUST | daily budget gone before 40% of day | once/day | remaining-day opportunity |
Severity is relative to the campaign's hourly pace (dailyBudget/24):
SEV1 ≥ 1.5× hourly pace at risk per hour, SEV2 ≥ 0.6×, else SEV3.
Global guardrail: alert budget = max 5 alerts/day per advertiser; lowest-₹ alerts fold into the digest.

## Design
- Tone: calm ops console, not a flashy dashboard. Neutral slate background, white cards,
  red/amber only for severity (plus amber for eligibility-fallback chips). Rupee amounts always prominent (font-semibold, tabular-nums).
- Empty states and the "all clear" state ("All 4 campaigns healthy ✓") must look intentional.
- Top of inbox: dismissible "Try this in 60 seconds" strip: 1) Inject a tracking break
  2) Open the incident 3) See the ₹ math 4) Tune the rule in Sandbox.

## Out of scope (do NOT build)
Auth, settings, real integrations, real WhatsApp/email sending, LLM calls, dark mode,
multi-advertiser switching, persistence beyond in-memory state (localStorage optional for
alert statuses only, wrapped in try/catch).

## Definition of done
- `npm run build` passes with no TS errors; unit tests for detector pass (vitest).
- Deployed on Vercel, public URL, loads in incognito, usable at 375px width.
- Inject → alert appears → detail chart correct → action updates status → backtest slider live.
