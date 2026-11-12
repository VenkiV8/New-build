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
- 30 days of hourly data per campaign. The demo clock is FIXED: demoNow() = DEMO_NOW_TS =
  Tue 10 Nov 2026, 8:00 PM IST (the evening peak, so injected incidents are meaningful). Hour-of-week
  and calendar-day logic run in IST (istParts, sameIstDay, IST_OFFSET_MS in dataGenerator.ts).
  Show "Data as of 8:00 PM IST" subtly in the header. Hour-of-week seasonality + noise.
- Time display: every date/time the UI shows is formatted with timeZone "Asia/Kolkata", never the
  viewer's local zone. Nothing in the UI uses Date.now() or the wall clock; "now" is always demoNow().
  The data's last hour is 8–9 PM IST, so "started Xh ago" is measured from its END
  (demoNow() + 1h − alert.startedAt), matching headline durations (tracking break "0 for 4h" →
  "started 4h ago"; spend runaway 2h; drift 3h).
- 3 pre-seeded incidents in the last 48h (one tracking break, one spend runaway, one CTR drift)
  so the inbox is never empty on first load.

## Screens (landing + 4)
### Top bar (every page)
- Left: "BudgetPager" logo, linking to / (the landing page). Nav: Inbox (/inbox), Rules (/rules), Notifications (/notifications).
- Right: "Data as of 8:00 PM IST" with a clock icon (desktop; on smaller screens it moves into the account menu),
  then:
  - Bell icon button with a red badge showing the count of OPEN (unacknowledged) alerts only
    (badge hidden at 0), aria-label "Open alerts: N"; links to /inbox.
  - Avatar circle with initials "AC" opening a small read-only popover: "Aura & Co. Skincare",
    "Advertiser account on BudgetPager", "Owner: Arjun Mehta", "4 campaigns · ₹7,000/day total budget",
    "Data as of 8:00 PM IST". No sign-out or settings items (nothing fake that does nothing).
  - Both are ≥40px tap targets. Adding them does not change the top bar's height.
- Account details (advertiser, owner, total daily budget) come from one shared module (src/state/account.ts).

### 0. Landing (route /)
- No horizontal scroll at 375px; the primary button is visible within the first two screen heights on
  mobile. The landing page has its own look (below); every other page keeps the ops-console theme.
  Landing-only styles live in src/components/landing/landing.css.
- Hero band (top): rounded card with background linear-gradient(135deg, #0F1B2D, #1E3A8A) and a subtle
  dot-grid texture (radial-gradient, ≤6% opacity). White text: eyebrow "BUDGETPAGER · ON-CALL FOR YOUR
  AD BUDGET", H1 "Aura & Co. Skincare", the "(fictional brand · demo account)" note in slate-300, and the
  pitch "BudgetPager watches your campaigns around the clock and pages you only when money is at risk,
  with the likely cause and a one-tap fix." A live status pill: pulsing green dot + "Watching 4 campaigns
  · last check 8:00 PM IST". Mobile only (<768px): a compact duplicate "Open alerts inbox →" button
  (white on the hero) directly under the pitch.
- Hero KPI row: 4 glass tiles (white 10% fill, 1px white 20% border), live from app state:
  "Spent today ₹6,092 of ₹7,000 (87%)", "At risk now ₹1,508" (value in red-300, set at 24px semibold so
  it counts as WCAG large text), "Open incidents 3" (active = OPEN + ACKED), "Protected this session ₹0".
  Numbers count up from 0 over ~700ms on first mount (requestAnimationFrame, tabular-nums); later changes
  show immediately. Mobile: 2×2 grid; desktop: 4 across.
- "Live campaigns" section built from app state (updates live on inject / action / reset):
  a table on desktop, one card per campaign on mobile (<768px). Fields: Campaign name · Objective ·
  Daily budget · Spent today (₹ and % of budget with a thin pacing bar; over 100% the bar is red with
  "over budget") · Conversions today · Status (Live / Paused / Budget capped) · Health (if it has OPEN or
  ACKED alerts: severity pill of the worst one + "N incident(s)", linking to that incident; else a green
  "Healthy" check). Plus a "Today" column: an inline SVG sparkline (~120×32, no Recharts) of hourly
  spend for the IST day of demoNow() (x = hour of day, so the line ends at 8 PM); the line is slate-500,
  and hours inside an OPEN/ACKED alert window for that campaign are drawn in red-600 with a light red
  fill under them (series from todaySpendSeries in src/state/landingView.ts, ≤ 24 points, unit-tested:
  c1's last two hours are flagged). Each row has a 4px left edge in its health colour (SEV1 red,
  SEV2 amber, SEV3 slate, healthy green, paused slate). The SEV1 health pill has a soft pulsing ring.
  Rows lift on hover (shadow only, no layout shift). The Objective column shows from 1024px; between
  768 and 1023px the table may scroll inside its own box, never the page.
  Mobile cards: same left edge, and the sparkline full-width inside each card.
  "Spent today" / "Conversions today" are sums over the IST calendar day of demoNow() (sameIstDay).
  Seeded values: Diwali Sale ₹3,202 / ₹3,000 (107%), Retargeting ₹1,296 / ₹1,600 (81%),
  New arrivals ₹1,311 / ₹2,000 (66%), Brand awareness ₹283 / ₹400 (71%) (unit-tested).
- Below the table, a nudge banner: "{n} campaigns need attention · ₹{atRisk} at risk now" with the
  primary "Open alerts inbox →" button (blue accent, ≥44px tall). Background
  linear-gradient(90deg, #FEF2F2, #FFF7ED), 4px red-600 left border, red AlertTriangle icon; the CTA
  arrow moves 4px right on hover. If nothing is open: "All campaigns healthy" (neutral white) with a
  secondary button.
- Under that, four capability cards in a grid (2×2 on desktop, stacked on mobile), each a whole-card
  link with a 40px rounded icon tile (tinted background + solid icon), title, one-line description and a
  "→": Detect (blue; seasonal baselines, 5 failure classes) → /inbox · Diagnose (violet; causal metric
  tree) → /inbox · Act (green; one-tap fixes, checklist) → /inbox · Tune (amber; Rule Sandbox,
  precision vs recall) → /rules. Footer line stays.
- Page background below the hero: linear-gradient(180deg, #F4F6F9, #EEF3FF), full-bleed without
  horizontal scroll.
- Entry motion: sections fade + rise 8px with a 60ms stagger on first mount.
- Accessibility: every animation (live-dot pulse, SEV1 ring, count-up, rise, hover translate) runs only
  under prefers-reduced-motion: no-preference; with reduced motion nothing animates and numbers render
  final values immediately. All text ≥4.5:1 (white / slate-200 / slate-300 on the hero gradient and
  glass tiles), except the red-300 "At risk" value, which is large text (≥3:1, measured ≥4.1:1).
- Unknown URLs redirect here. Deep links /inbox, /incident/:id, /rules and /notifications work directly.

### 1. Incident Inbox (route /inbox)
- Header: advertiser name and three stats:
  "At risk now" = sum of inrAtRiskTotal for ACTIVE alerts (OPEN or ACKED: acknowledged is not
  fixed), subtitle "across N active incidents";
  "Protected this session" = starts at ₹0; when an action resolves an alert (Pause / Cap budget /
  Mark fixed etc., not Snooze, Mark expected or opening the tracking checklist) add
  min(alert.inrAtRiskPerHour × hoursLeftToday, campaign.dailyBudgetInr), where hoursLeftToday is derived
  from demoNow(): data runs to the end of the 8–9 PM IST hour, so 24 − 21 = 3. Subtitle "exposure stopped
  for the rest of today"; toast "≈ ₹X of exposure stopped for the rest of today (3 h)" (pausing the
  seeded c1 spend runaway credits ₹1,254 = 418 × 3; unit-tested); resets with the demo;
  alert-budget indicator ("2 of 5 daily alerts used").
  Stat tiles carry icons: At risk now (alert triangle, red), Protected (shield, green), Alert budget (gauge, blue).
- Campaign health strip: one chip per campaign with evaluateEligibility().summary
  (e.g. "Brand awareness: 1 rule family on fallback"); click opens a popover listing the 4 gates
  (data freshness, learning phase, conversion volume, traffic volume) with pass/fallback + detail.
  This visibly shows WHY a low-volume campaign is not spamming alerts.
  Chips wrap (no horizontal scroll); campaigns with any fallback gate sort first, with amber border/icon.
  Chips reflect live rule toggles: if any rule is off the summary says e.g. "1 rule off" (after the
  fallback summary when both apply) and the popover lists the rules turned off. Popover caption:
  "Gates shown as policy; this prototype evaluates them but does not yet suppress alerts."
  A paused or capped campaign shows a "Paused" / "Budget capped" tag on its chip.
  Mobile (<768px): the chips collapse into one chip, e.g. "4 campaigns · 1 on fallback ▸", that expands
  on tap. Desktop always shows every chip.
- Campaign state: app state holds campaignState: Record<campaignId, 'active' | 'paused' | 'capped'>.
  "Pause campaign" (incident page or the phone mock) sets paused; "Cap today's budget" sets capped.
  Reset demo restores all to active.
- List of alert cards: Open (and Acked) first, then Resolved / Expected / Snoozed; ₹ at risk (desc) within
  each group. The alert budget still pages the top 5 by ₹. Card: severity chip (SEV1 red / SEV2 amber / SEV3 grey),
  failure-class icon + label, campaign name, one-line summary ("Conversions = 0 for 3h while 142 clicks
  billed — est. ₹1,340 at risk"), "started Xh ago · caught Nh after onset" (N = the rule's minHours;
  "started" measured from the end of the last data hour, see Demo data),
  status (Open / Acked / Resolved / Expected / Snoozed). Acknowledged is not fixed: Open and Acked cards
  render as active; only Resolved / Expected / Snoozed are closed (greyed). Alerts beyond the 5/day alert
  budget show in a "folded into today's digest" section.
- Mobile (<768px): the first incident card appears in the first viewport (375×812).
- Demo toolbar (clearly marked "Demo controls"): [Inject: Tracking break] [Inject: Spend runaway]
  [Inject: Delivery failure] [Reset demo]. Injecting mutates the data for one campaign's recent hours,
  re-runs the detector, and a new alert animates into the inbox with a toast.
  Injection is planned on a copy first; live data changes only if a new alert is confirmed.
  Targets, in order: Tracking break c2 → c1; Spend runaway c1 → c3 → c2; Delivery failure c4.
  Skipped targets: paused campaigns; campaigns with an ACTIVE (OPEN or ACKED) incident of that class;
  and ones where the injection would not trip the detector (e.g. c3's seeded CTR drift halves its spend,
  masking a spend surge). A RESOLVED / EXPECTED / SNOOZED incident does not block: re-injecting on that
  campaign re-fires the incident and reopens it.
  If no target is eligible: toast "All eligible campaigns are paused or already have this incident";
  if targets are eligible but none would trip the detector: "No campaign would trip … right now".
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
- Unknown incident id (e.g. a deep link to an incident not in the current session): same layout and
  "← Inbox" link, text "This demo incident isn't in your current session." /
  "Re-create it from the inbox demo controls."
- Action row: primary one-tap action per class (Pause campaign / Cap budget / Open tracking checklist /
  Snooze 24h / Mark expected — "it's Diwali"). Actions update alert status in client state and toast.
  "Mark expected" toast: "Marked expected. In production this date joins the campaign's event calendar
  so the baseline learns." "Pause campaign" / "Cap today's budget" also set the campaign's state (§1).
  Actions stay available while an alert is Acked (Acked is not closed).
- "Open tracking checklist" opens a dialog instead of resolving. It has 3 checkbox steps:
  "Conversion pixel fires on the order-confirmation page (use Tag Assistant / test order)",
  "No site deploy changed checkout in the last 24h", "Test conversion recorded in reporting".
  Opening it sets status Acked (no ₹ credit). "Mark fixed", enabled when all 3 are ticked, resolves the
  alert and credits ₹ as in §1; once enabled it shows "· ≈ ₹X rest of today".
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
- "Noise controls" panel (static explanatory UI, no logic needed), tagged "Policy · not simulated in
  this prototype": incident grouping (if >50% of
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
  "Data as of 8:00 PM IST" slate-300 with a clock icon. Accent (links, primary buttons, selected states,
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
  Mobile (<768px): collapsed to a one-line banner "New here? Try the 60-second tour ▸" that expands on
  tap. Desktop shows the full strip.
- Every page: footer "Prototype · synthetic data, generated in-browser · no backend"; a simple skeleton
  while a page loads; favicon, <title> "BudgetPager — on-call for your ad budget", meta description.

## Demo session persistence
- The demo session is saved in localStorage under the key "budgetpager:demo:v1":
  { v: 1, injections: [{campaignId, failureClass, hours}] in the order applied,
  statuses: Record<alertId, status>, campaignState: Record<campaignId, state>,
  rulesEnabled: Record<failureClass, boolean>, protectedInr: number }.
  Only inputs and user decisions are stored, never derived data (history, alerts, ₹ figures).
- Written after every state change (inject, action, ack, rule toggle). A session identical to a fresh
  one is not stored (the key is removed instead), so a first visit writes nothing.
- On load: if the key exists and v === 1, rebuild history as generateSeededDemo() and apply the saved
  injections in order with injectIncident (deterministic, so the same alert ids come back), re-run
  detectAll with the saved rule set, then restore statuses, campaignState and protectedInr. Status
  entries whose alert id no longer exists are dropped.
- Validation is strict: a parse error, wrong version, unknown field, unknown campaign / class / status,
  or any throw → ignore the saved state, start fresh, and remove the key.
- Every localStorage read/write is wrapped in try/catch, so Safari private mode or blocked storage
  never breaks the app (it simply runs in memory).
- "Reset demo" clears the key and returns to the seeded state. Seeded first load is unchanged
  (₹1,508 at risk, 3 incidents).
- Logic lives in src/state/persistence.ts (pure, unit-tested: round trip, corrupt/invalid payloads,
  blocked storage, reset).

## Out of scope (do NOT build)
Auth, settings, real integrations, real WhatsApp/email sending, LLM calls, dark mode,
multi-advertiser switching, any persistence other than the demo session described above
(no server, no sync across devices).

## Definition of done
- `npm run build` passes with no TS errors; unit tests for detector pass (vitest).
- Deployed on Vercel, public URL, loads in incognito, usable at 375px width.
- Inject → alert appears → detail chart correct → action updates status → backtest slider live.
