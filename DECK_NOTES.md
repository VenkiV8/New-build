# Deck notes (from the Gemini research, filtered). Not for Claude Code; this is for you.

## Use these (they strengthen specific evaluation parameters)
1. **Two personas** (Problem understanding, Product sense)
   - Primary: SMB advertiser / media buyer (Arjun) watching budget, CPA, tracking health.
   - Secondary: Media.net Account Manager / AdOps overseeing many accounts. Same engine,
     different view: account-level incident grouping exists for this person. Media.net's
     publisher site already advertises a "custom alerting system" for monetization; position
     BudgetPager as extending that alerting DNA to the demand/campaign side.
2. **Causal metric tree** (Structured thinking): CPA = CPC ÷ CVR, eCPM = CPC × CTR × 1000.
   "CPA went up" is a symptom; the tree says whether it is auction price, engagement or the
   conversion path. This is in the prototype (incident detail).
3. **Stage 0 eligibility gates** (Technical feasibility): data freshness, learning phase
   (≥14 days), conversion volume, traffic volume. Most noise is prevented before any rule runs.
4. **Small-numbers rule, with real math**: never blame CVR unless ≥3.5 conversions were
   expected; P(0 | 3.5 expected) ≈ 3% under Poisson, vs 14% at 2 expected.
5. **Seasonal vs naive baseline, with real numbers**: 50 vs 9 false alarms on 30 days of
   healthy data (spend rule). Screenshot the Rule Sandbox card.
6. **Attribution lag, as a deliberate design choice** (big product-sense point):
   recent conversions are always under-counted because buyers convert days after clicking.
   So: hourly rules use spend, impressions, CTR and raw pixel fires (no lag); CPA/ROAS
   drift is evaluated daily on a lag-adjusted window (v2: completion-factor correction).
   Say this explicitly; it is the #1 thing outsiders miss.
7. **Automation policy**: auto-pause only for SEV1 spend runaway left unacknowledged
   30 min; everything else needs one human tap.
8. **Metrics**
   - North star: ₹ wasted spend prevented (est. ₹ at risk × time saved vs manual detection).
   - Operational: MTTD, MTTA/MTTR.
   - Quality: alert actionability rate (acted on ÷ delivered); false-positive dismissal rate (<10%).
   - Guardrails: mute/snooze rate; premature-intervention rate (alert-driven edits that reset
     learning or cause under-delivery).
9. **Rollout**: shadow mode on historical + live data (no notifications) → internal AdOps
   dogfood with dismissal tags → account-level randomized A/B (treatment: seasonal baselines +
   causal cards; control: static rules), measuring MTTD, wasted spend in incidents, 90-day retention.
10. **v2 / out of scope** (shows judgement): click-fraud / invalid-traffic rule
    (CTR spike + CVR collapse), auction-competition rule, SSP/DSP bid-stream outage
    monitoring (15-min windows), LLM natural-language querying, autonomous bid edits.

## Do NOT use
- Specific statistics from the research without a source you have checked yourself
  (e.g. "60% efficiency loss by day 14", "5–7 days dark", "500 sites / 4 billion impressions",
  revenue-share percentages, the "0.8–1.5% contextual CTR"). The PDF cites none of them.
  If a number matters, verify it or phrase it as an assumption.
- Its suggested name "Media.net Pulse" or any Media.net branding on the prototype.
- Its Next.js stack advice (we are on Vite; switching now costs hours for zero reviewer benefit).
- Five-plus chaos scenarios, Slack Block Kit, webhook JSON tab: scope creep for 24 hours.

## Interview prep (from the research, worth an evening later)
Expect live RCA drills ("CPA doubled overnight, walk me through it"). Use the prototype's order:
data freshness & attribution lag → seasonality/calendar → account health (billing, pixel,
approval) → causal tree → segment isolation (campaign, placement, device, geo).
