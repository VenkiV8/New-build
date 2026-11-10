# Paste this as your FIRST message to the agent in Cursor
# (after the repo is scaffolded and the files below are in place)

Read SPEC.md and CLAUDE.md fully before writing any code.

The domain logic is already written, tested and calibrated — do NOT rewrite it:
- src/lib/types.ts, dataGenerator.ts, detector.ts, backtest.ts, detector.test.ts
Run `npx vitest run` first to confirm all 10 tests pass, then treat src/lib/ as a
read-only dependency. If you believe a lib change is needed, stop and ask me first.

Your job is the UI, built in these vertical slices, in order. After each slice,
run `npm run build && npx vitest run`, fix any errors, then STOP and tell me the
slice is done so I can review in the browser before you continue.

Slice 1 — App shell + state
- react-router-dom routes: / (Inbox), /incident/:id, /rules, /notifications.
- A single AppProvider context: { history, alerts, statuses, inject(class), resetDemo() }.
  history = generateSeededDemo(); alerts = detectAll(history); inject(x) applies
  injectIncident to the right campaign (TRACKING_BREAK→c2 if not already broken else c1,
  SPEND_RUNAWAY→c1, DELIVERY_FAILURE→c4), re-runs detectAll, toasts the new alert.
- Layout: top nav (AdGuard logo text, nav links, "Data as of 8:00 PM" muted), slate-50
  background, max-w-5xl container, mobile responsive.

Slice 2 — Incident Inbox (per SPEC §Screens.1, including demo toolbar and
"Try this in 60 seconds" strip)

Slice 3 — Incident Detail (per SPEC §Screens.2). Chart: last 72h of the alert's metric
vs expected band from baselineAt(). Compute band points in a helper in src/lib/chartData.ts
(pure TS, unit-testable), not inside the component.

Slice 4 — Rule Sandbox (per SPEC §Screens.3) using backtestRule(). Debounce the slider
(250ms). Show firings count, per-day bar chart, and the note string.

Slice 5 — Notification Preview (per SPEC §Screens.4).

Slice 6 — Polish pass: empty/all-clear states, mobile at 375px, favicon + <title>
"AdGuard — on-call for your ad budget", meta description. Nothing new beyond SPEC.

Start with Slice 1 now.
