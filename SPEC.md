# AdGuard — "On-call for your ad budget"
Anomaly alerting system for ad campaign performance (Media.net APM case, Problem #2).

## One-paragraph thesis
SMB advertisers lose money silently: tracking breaks, budgets vanish by 11am, ads get
disapproved, performance drifts. Existing dashboards make users hunt for problems.
AdGuard inverts this: it pages you like an on-call system — only when money is at risk,
with a diagnosis and a one-tap fix. Severity is measured in ₹ at risk, not metric deltas.

## Hard constraints
- 100% client-side. No backend, no login, no API keys, no external calls.
- All data is synthetic, generated in-browser from a SEEDED PRNG (same data every load).
- Detection logic is deterministic statistics (hour-of-week median + MAD). No LLM calls.
  "AI explanations" are template-generated text.
- Stack: Vite + React + TypeScript + Tailwind + shadcn/ui + Recharts.
- Must work on mobile (375px) and desktop. Must load in < 3s.
- Core logic lives in src/lib/ (types.ts, dataGenerator.ts, detector.ts, backtest.ts)
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
- Header: advertiser name, "₹ protected this week" stat, alert-budget indicator ("2 of 5 daily alerts used").
- List of alert cards sorted by ₹ at risk (desc). Card: severity chip (SEV1 red / SEV2 amber / SEV3 grey),
  failure-class icon + label, campaign name, one-line summary ("Conversions = 0 for 3h while 142 clicks
  billed — est. ₹1,340 at risk"), time ago, status (Open / Acked / Resolved).
- Demo toolbar (sticky, clearly marked "Demo controls"): [Inject: Tracking break] [Inject: Spend runaway]
  [Inject: Delivery failure] [Reset demo]. Injecting mutates the data for one campaign's recent hours,
  re-runs the detector, and a new alert animates into the inbox with a toast.
### 2. Incident Detail (route /incident/:id)
- Title, severity, ₹ at risk/hour, started-at, affected campaign.
- Chart: actual metric line vs expected band (median ± 2×MAD from baseline) for last 72h,
  anomalous hours shaded red. Recharts Area + Line.
- "Why we think this happened" — template-generated cause breakdown (e.g. drop isolated to
  mobile + one placement) rendered as a small tree/list. Label it clearly as top suspected causes.
- Action row: primary one-tap action per class (Pause campaign / Cap budget / Open tracking checklist /
  Snooze 24h / Mark expected — "it's Diwali"). Actions update alert status in client state and toast.
  "Mark expected" says the date is added to the campaign's expected-events calendar.
### 3. Rule Sandbox (route /rules)
- Table of the 5 default rules (class, trigger, default threshold, channel, on/off toggle).
- Select a rule → sensitivity slider (e.g. drift: 20–50% deviation) → live backtest panel:
  "Would have fired 14× in the last 30 days" + small bar chart of firings by day +
  breakdown line ("11 of 14 coincided with Sunday-night dips → consider hour-of-week baseline ✓").
  Backtest re-runs detector on the stored 30-day history with the chosen threshold. Must feel instant.
### 4. Notification Preview (route /notifications)
- Severity → channel matrix (SEV1: WhatsApp + push, SEV2: push + in-app, SEV3: daily digest).
- Mock WhatsApp phone frame showing a SEV1 message with [Pause] [View] quick replies.
- Mock daily-digest email card. Static mocks driven by the latest real alerts in state.

## The 5 failure classes & default rules (see detector.ts — already implemented)
| Class | Trigger | Default | Severity basis |
|---|---|---|---|
| SPEND_RUNAWAY | spend pacing vs expected-by-hour baseline | >150% for 1h | overspend ₹/h |
| TRACKING_BREAK | conversions=0 while ≥4 were expected from billed clicks | 3 consecutive h | spend with no measurable return |
| DRIFT | CTR vs same-hour-of-week median | >30% and >2×MAD for 2h, ≥150 impressions/h | est. lost conversions × AOV margin proxy |
| DELIVERY_FAILURE | impressions < 5% of expected | 2h | expected-hours' budget forfeited |
| BUDGET_EXHAUST | daily budget gone before 40% of day | once/day | remaining-day opportunity |
Severity is relative to the campaign's hourly pace (dailyBudget/24):
SEV1 ≥ 1.5× hourly pace at risk per hour, SEV2 ≥ 0.6×, else SEV3.
Global guardrail: alert budget = max 5 alerts/day per advertiser; lowest-₹ alerts fold into the digest.

## Design
- Tone: calm ops console, not a flashy dashboard. Neutral slate background, white cards,
  red/amber only for severity. Rupee amounts always prominent (font-semibold, tabular-nums).
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
