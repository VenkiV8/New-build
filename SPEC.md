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
- 1 advertiser ("Aura & Co. Skincare", a fictional brand; account owner: Arjun Mehta, Owner) with 4 campaigns:
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
  Mark fixed etc., not Snooze, Mark expected or opening the tracking checklist) add
  min(alert.inrAtRiskPerHour × 24, campaign.dailyBudgetInr) (rest-of-day exposure avoided; a campaign
  cannot lose more than its daily budget in a day) and toast "Up to ₹X/day exposure stopped";
  resets with the demo;
  alert-budget indicator ("2 of 5 daily alerts used").
  Stat tiles carry icons: At risk now (alert triangle, red), Protected (shield, green), Alert budget (gauge, blue).
- Campaign health strip: one chip per campaign with evaluateEligibility().summary
  (e.g. "Brand awareness: 1 rule family on fallback"); click opens a popover listing the 4 gates
  (data freshness, learning phase, conversion volume, traffic volume) with pass/fallback + detail.
  This visibly shows WHY a low-volume campaign is not spamming alerts.
  Chips wrap (no horizontal scroll); campaigns with any fallback gate sort first, with amber border/icon.
- List of alert cards: Open (and Acked) first, then Resolved / Expected / Snoozed; ₹ at risk (desc) within
  each group. The alert budget still pages the top 5 by ₹. Card: severity chip (SEV1 red / SEV2 amber / SEV3 grey),
  failure-class icon + label, campaign name, one-line summary ("Conversions = 0 for 3h while 142 clicks
  billed — est. ₹1,340 at risk"), "started Xh ago · caught Nh after onset" (N = the rule's minHours),
  status (Open / Acked / Resolved / Expected / Snoozed). Alerts beyond the 5/day alert budget show in a
  "folded into today's digest" section.
- Demo toolbar (clearly marked "Demo controls"): [Inject: Tracking break] [Inject: Spend runaway]
  [Inject: Delivery failure] [Reset demo]. Injecting mutates the data for one campaign's recent hours,
  re-runs the detector, and a new alert animates into the inbox with a toast.
  Injection is planned on a copy first; live data changes only if a new alert is confirmed.
  Targets, in order: Tracking break c2 → c1; Spend runaway c1 → c3 → c2; Delivery failure c4.
  A target that already has that class of incident is skipped, and so is one where the injection
  would not trip the detector (e.g. c3's seeded CTR drift halves its spend, masking a spend surge).
  "Already open" only when every target has one; otherwise "No campaign would trip … right now".
  The controls are visually a "lab" tool (dashed slate border, beaker icon), never product UI.
  Desktop (≥768px): bar fixed to the bottom; the page reserves bottom padding so it never covers the
  last card. Mobile (<768px): a floating "Demo ▸" pill at bottom-right that expands into the full
  controls on tap and collapses after an inject/reset.
- Mobile tap targets (all links, buttons, switches, slider) are at least 40px tall.
### 2. Incident Detail (route /incident/:id)
- Title, severity, ₹ at risk/hour, started-at ("caught Nh after onset"), affected campaign.
- Chart: actual metric line vs expected band (median ± 2×MAD from baseline) for last 72h,
  anomalous hours shaded red. Recharts Area + Line.
  TRACKING_BREAK instead charts two lines, defaulting to the last 24h with a small "24h / 72h" toggle:
  "Conversions (rolling 4h)" = sum of actual
  conversions over the trailing 4 hours, and "Expected from billed clicks (rolling 4h)" = sum over the
  trailing 4 hours of clicks × campaign.baseCvr (dashed), keeping the red alert-window shading.
  Title: "Conversions vs what billed clicks should have produced, last 24h" (or 72h, per the toggle).
  Series computed in src/lib/chartData.ts (pure TS, unit-tested).
- "Root cause" panel = causal metric tree from buildCausalTree(series, alertWindowHours):
  CPA → CPC (auction price) & CVR; context row: CTR, impressions, effective CPM, spend.
  Each node: label, formula (small, muted), actual vs expected, Δ%. Driver node = red-600 ring, red-50
  background + "Driver" tag; out-of-band nodes amber-50; normal nodes white. Nodes with lowVolume=true show "low volume, not blamed".
  Under the tree: diagnoseTree(nodes) sentence in bold. Then, smaller, the existing alert.causes list
  titled "Likely segments (illustrative)".
- alertWindowHours = hours between alert.startedAt and the last data point (+1), min 1.
- Action row: primary one-tap action per class (Pause campaign / Cap budget / Open tracking checklist /
  Snooze 24h / Mark expected — "it's Diwali"). Actions update alert status in client state and toast.
  "Mark expected" says the date is added to the campaign's expected-events calendar.
  Actions stay available while an alert is Acked (Acked is not closed).
- "Open tracking checklist" opens a dialog instead of resolving. It has 3 checkbox steps:
  "Conversion pixel fires on the order-confirmation page (use Tag Assistant / test order)",
  "No site deploy changed checkout in the last 24h", "Test conversion recorded in reporting".
  Opening it sets status Acked (no ₹ credit). "Mark fixed", enabled when all 3 are ticked, resolves the
  alert and credits ₹ as in §1.
- Under the action row on every incident page: "Automation policy: only a SEV1 spend runaway can
  auto-pause (if no one acknowledges it within 30 min). Every other action needs one human tap, because
  a wrong auto-pause on a flagship campaign costs more than the anomaly."
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
  "Pause" performs the same action as Pause on the incident page for that alert (status update +
  "Protected this session" + toast), then shows "Paused ✓"; "View" stays static.
- Mock daily-digest email card. Mocks are driven by the latest real alerts in state.
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
- Tone: calm ops console, not a flashy dashboard (pattern reference: Azure Monitor / Datadog; never copy
  any brand's colours, fonts or logo). Neutral slate-50 background, white cards with slate-200 borders.
  No gradients. WCAG AA contrast.
- Font: IBM Plex Sans (400/500/600). All ₹ amounts and metric numbers use tabular-nums.
- Colour tokens live as CSS variables in src/index.css:
  top bar navy #0f1b2d with white text; active nav item white with a 2px #3b82f6 underline;
  "Data as of 8:00 PM" slate-300 with a clock icon. Accent (links, primary buttons, selected states,
  slider fill, switches on) blue #2563eb. Severity: SEV1 red #dc2626, SEV2 amber #d97706, SEV3 slate
  #64748b. Healthy/protected green #16a34a. Text on a 10% tint of these uses a darker shade of the
  same hue for AA (red-700, amber-800, slate-600, green-800, blue-700).
- Severity accents: each incident card has a 3px left edge in its severity colour; severity chips use a
  10% tint with solid text. Status pills: Open blue tint, Acked slate, Resolved green tint,
  Expected/Snoozed slate outline. Amber is also used for eligibility-fallback chips.
- Icons (lucide-react, 16px): failure classes Flame / Unplug / TrendingDown / WifiOff / Hourglass, tinted
  with the alert's severity colour; section headers Inbox, SlidersHorizontal, BellRing, GitBranch (Root
  cause), Funnel (Noise controls); campaign chips CircleCheck (green) / CircleAlert (amber).
- Charts: actual line navy #0f1b2d, expected band blue-100, alert window red-50 with a red-300 border,
  expected dashed line blue-500.
- Rupee amounts always prominent (font-semibold, tabular-nums).
- Empty states and the "all clear" state ("All 4 campaigns healthy ✓") must look intentional.
- Top of inbox: dismissible "Try this in 60 seconds" strip: 1) Inject a tracking break
  2) Open the incident 3) See the ₹ math 4) Tune the rule in Sandbox. Steps 2 and 3 link to the most
  recent open incident (the last injected one while it is open); step 3 scrolls to the Root cause panel.
- Every page: footer "Prototype · synthetic data, generated in-browser · no backend"; a simple skeleton
  while a page loads; favicon, <title> "BudgetPager — on-call for your ad budget", meta description.

## Out of scope (do NOT build)
Auth, settings, real integrations, real WhatsApp/email sending, LLM calls, dark mode,
multi-advertiser switching, persistence beyond in-memory state (localStorage optional for
alert statuses only, wrapped in try/catch).

## Definition of done
- `npm run build` passes with no TS errors; unit tests for detector pass (vitest).
- Deployed on Vercel, public URL, loads in incognito, usable at 375px width.
- Inject → alert appears → detail chart correct → action updates status → backtest slider live.
