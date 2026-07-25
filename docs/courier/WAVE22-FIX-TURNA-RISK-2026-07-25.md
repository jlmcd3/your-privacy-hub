# WAVE22-FIX TURN A (cppa-risk) — Courier Report

**Turn:** WAVE22-FIX-TURNA-RISK
**Function:** `run-cppa-risk-assessment`
**Build stamp:** `w22-risk-turna@2026-07-25T13:49:15Z`
**Deploy time (UTC):** 2026-07-25T13:50:49Z (boot log)
**Instrument:** s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) — FROZEN, untouched
**Ledger source:** docs/pipeline-state.md Item 60 (wave-22 digest,
batch `8a2ec9d9`, campaign `fd1be147`)
**Review:** five-lens TEAM-REVIEWED (statute / customer clarity / leak
prevention / measurement integrity / regression safety)

## Deploy-lock snapshot (immediately pre-deploy)

- `quality_batch_runs` running/pending @ 2026-07-25T13:50:13Z: **0**
- `report_versions` rows <15 min with `report_data IS NULL`: **0**
- Sandbox clock re-read pre-stamp: `Sat Jul 25 13:50:13 UTC 2026`

## Scope (closed defect classes, per priority)

### P1 — info_needed contradiction-filter regression (customer-facing leak)
- Bug: internal placeholder sentence *"We could not verify this item from
  the information provided; it is listed under information needed."* was
  reaching customer-visible fields, including
  `assessment_summary.triggered_activities[]`.
- Fix: `applyW22RiskTurnA` now
  (i) **drops placeholder-only entries** from `triggered_activities`, and
  (ii) **strips the placeholder sentence** from any customer-visible
  prose field via a recursive walker with anchor-key skip.
- Regression test asserts that no customer-visible field contains
  *"could not verify"* / *"listed under information needed"* / *"information
  needed placeholder"* phrasing.

### P2 — § 7150(b) subsection pinpoint discipline
- Bug: emit sites (`scope_notes`, `triggered_activities_detail`,
  `inconsistency_flags`, `information_needed`) shipped bare `§ 7150(b)`,
  empty parentheticals `§ 7150(b)()`, or dangling *"under "* connectors
  (dropped citation).
- Fix: recursive walker normalises bare/empty cites to the neutral parent
  form (**no invented pinpoint**) and removes orphan *under* connectors.
  Completed `(b)(1)`–`(b)(6)` cites are untouched.
- Emit-site tests cover all four surfaces.

### P3 — scope_notes fact-ledger contradictions
- Bug: `scope_notes` asserted *"The record confirms cross-context tracking"*
  when the intake fact ledger did not support it.
- Fix: when a scope-notes string uses assertive verbs
  (`confirms|shows|establishes|demonstrates`) with a regulatory-category
  label whose mapped intake field is not `asserted` in the fact ledger,
  the sentence is downgraded to *"The intake does not itself establish X;
  the controller should confirm whether X applies."* Categories covered:
  cross-context tracking/advertising, targeted advertising, sell/share,
  sensitive-location profiling, systematic observation, sensitive PI,
  ADMT logic.

### P4 — risk_register safeguards dedup (medium)
- Bug: RR-001/RR-002/RR-003 emitted identical `current_safeguards`.
- Fix: within a single `risk_register.entries` array, the first
  occurrence of any `current_safeguards` string is preserved as the
  stated baseline; subsequent duplicates are replaced with a neutral
  baseline-pointer sentence.

## Guardrails observed

- LEAK-PREV P0/P1/P2 remain live upstream; no serializer whitelist key
  added (telemetry attaches at `_meta.internal.risk_w22a`, which the P2
  serializer preserves unmodified — no stamp-echo whitelist change
  needed per item 32 gate).
- No pricing/payment/design-tokens/customer-revision-path/signup edits.
- No Fable-5 anywhere; no sample regeneration.
- Instrument s4 untouched; rubrics/graders/goldens/contracts/fixtures
  untouched.
- Fail-open: every helper wraps in `try/catch` and the top-level
  wrapper in `index.ts` is fail-open non-fatal.
- Anchor keys (`field`, `source_fields`, `citation`,
  `regulatory_citation`, `verbatim_quote`, `provision`, etc.) are never
  scrubbed.
- BUILD_STAMP is fresh-clock actual build time (13:49:15Z from re-read
  clock at 13:50:13Z pre-deploy) — no forward projection per item 51.

## Test proof (green)

```
$ deno test --allow-all --no-check _tests/w22-risk-turna.test.ts
running 9 tests from ./_tests/w22-risk-turna.test.ts
W22 P1 — placeholder-only triggered_activities entries dropped ... ok (1ms)
W22 P1 regression — no customer-visible field carries placeholder phrasing ... ok (0ms)
W22 P2 — bare § 7150(b) survives as parent form, empty paren stripped ... ok (0ms)
W22 P2 — completed subsection cites NOT touched ... ok (0ms)
W22 P3 — scope_notes contradiction downgraded when intake denies ... ok (0ms)
W22 P3 — supported claim NOT downgraded ... ok (0ms)
W22 P4 — identical current_safeguards dedup'd to baseline pointer ... ok (0ms)
W22 — anchor keys (citation/field) never mutated ... ok (0ms)
W22 — stamp is well-formed ... ok (0ms)

ok | 9 passed | 0 failed (8ms)
```

## Boot-log proof (post-deploy)

```
2026-07-25T13:50:49Z INFO [run-cppa-risk-assessment] boot build_stamp=w22-risk-turna@2026-07-25T13:49:15Z
2026-07-25T13:50:49Z INFO {"evt":"risk_va_registry_loaded","fn":"run-cppa-risk-assessment","build_stamp":"w22-risk-turna@2026-07-25T13:49:15Z","va_version":"risk-va-w1-2026-07-24","va_rows":44}
```

## Files touched this turn

- `supabase/functions/run-cppa-risk-assessment/_w22_risk_turna.ts` (new;
  P1/P2/P3/P4 sanitizers + counters + stamp)
- `supabase/functions/run-cppa-risk-assessment/index.ts` (BUILD_STAMP
  bumped; W22 import + apply block after W21 chain; telemetry echo)
- `supabase/functions/_tests/w22-risk-turna.test.ts` (new; 9 tests)
- `docs/courier/WAVE22-FIX-TURNA-RISK-2026-07-25.md` (this report)
- `docs/pipeline-state.md` (Item 61 + header restamp)

## Telemetry keys added under `_meta.internal.risk_w22a`

`stamp`, `strings_scanned`, `placeholder_scrubs`,
`placeholder_entries_dropped`, `pinpoint_rewrites`, `scope_downgrades`,
`safeguards_dedup`.
