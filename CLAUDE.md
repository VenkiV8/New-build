# Project rules (also mirror into .cursor/rules if using Cursor's native agent)

## What this is
A client-side demo prototype for a PM case study: anomaly alerting for ad campaigns.
SPEC.md is the single source of truth. Do not add features that are not in SPEC.md.
If a request conflicts with SPEC.md, say so instead of silently complying.

## Stack (fixed — do not swap or add frameworks)
Vite + React 18 + TypeScript (strict) + Tailwind + shadcn/ui + Recharts + react-router-dom + vitest.
No backend, no API calls, no env vars, no keys, no new heavy dependencies without asking.

## Architecture rules
- src/lib/ holds all domain logic: types.ts, dataGenerator.ts, detector.ts, backtest.ts.
  These files are pure TypeScript: no React, no imports from src/components or src/pages.
- UI components never compute detection logic inline; they call lib functions.
- All randomness goes through the seeded PRNG in dataGenerator.ts. Never use Math.random().
- App state: a single React context/store holding { campaigns, history, alerts, alertStatuses }.
  Inject/reset actions regenerate data and re-run detectAll().
- Money is in integer paise internally if arithmetic matters; display as ₹ with Intl.NumberFormat('en-IN').

## Working style
- Work in small vertical slices; after each slice run: npm run build && npx vitest run.
- Do not refactor lib/ files while building UI slices unless a test fails.
- Keep components small; pages compose components.
- Mobile first: check every screen at 375px.
- No lorem ipsum: use the realistic campaign names and copy from SPEC.md.

## Quality gates before "done"
- npm run build clean, vitest green, no console errors in browser,
- Lighthouse-ish sanity: bundle lazy-loads Recharts pages if easy, images none.
