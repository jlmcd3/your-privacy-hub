# ITEM 254 — PRESENCE-BAND MINING WIRED INTO HARNESS CONFIG (Stage B(1))

Date: 2026-07-29
Status: Threshold config LANDED in `supabase/functions/_shared/ltp/replay/presence-band.ts` and defaulted through `evaluateSubstance`. No live LLM calls, no deploys, no DB writes, no grader edits. Wire and `supabase/_rebuild-snapshot-item244/` untouched.

## Mining record (controller-verified via SELECTs 2026-07-29)

**Stage-B replay corpus (for the ramp — not mined here):**
`quality_archive.quality_run_documents_20260728`, tool=`cppa-risk`:
245 docs, ALL with `intake_data`, ZERO with persisted `render_plan`.
The archive predates plan persistence, so presence values cannot be
mined from it. Stage-B model-provider runs will regenerate plans from
these intakes.

**Presence source used for band mining (this turn only):**
LIVE `public.quality_run_documents`, 22 docs carrying
`report_data->_meta->internal->render_plan`. Presence read at
`render_plan->plan->factor_table` (16 rows each).

### 15 model-authored non-degenerate plans (band basis)
Build cohorts: item233 → item242-cpb, all 2026-07-28.
Present_row counts (of 16):
`7, 9, 9, 8, 10, 7, 8, 11, 8, 9, 11, 11, 7, 9, 7`
Derived band: min 7/16 = 0.4375, max 11/16 = 0.6875, median 9/16 = 0.5625.

### 7 zero-presence docs (classification)

| doc_id (short) | build cohort | pass1_ok | write_around | classification |
|---|---|---|---|---|
| 53d4b9c0 | item232 | false | true (`pass1_abort_timeout`) | DEGENERATE — excluded |
| 9a83145e | item237 | true (validator_issues:1) | true | DEGENERATE (deterministic-path pin) — excluded |
| 563117cb | item240-cp1 | true (validator_issues:1) | true | DEGENERATE (deterministic-path pin) — excluded |
| 3bbc3a69 | item243-completion | true | false | HOLLOW-DOCUMENT COLLAPSE — retained |
| 4eee3f7a | item243-completion | true | false | HOLLOW-DOCUMENT COLLAPSE — retained |
| 3302dc39 | item243-completion | true | false | HOLLOW-DOCUMENT COLLAPSE — retained |
| f7981c15 | item243-completion | true | false | HOLLOW-DOCUMENT COLLAPSE — retained |

The four item243 docs are the empirical validation that the presence
gate catches the collapse class: the model genuinely returned an
all-absent plan with no telemetric write-around. If the harness does
not hard-fail at 0.0 on these, it has lost its teeth.

### Caveats (verbatim)

1. Band mined from n=15 same-day rich smoke-fixture plans, NOT the
   full 245-intake richness distribution.
2. Run-#180 doc 61be3318 presence flags (7/16) were included via its
   build cohort, but its `weight_notes` are CORRUPTED (broken-guard
   incident) and were NOT used for note-side statistics.
3. Band values are PROVISIONAL until re-mined across the real
   distribution during the Stage-B ramp. Revisable by courier before
   acceptance enforcement.

## Team-unanimous configuration decision (four-lens)

- **Hard floor:** `min_presence_rate = 0.25` (harness hard failure).
- **Review band:** `[0.4375, 0.6875]`; rates outside (but at/above the
  hard floor) flag `review_band_low` / `review_band_high` in metrics
  — NEVER hard failures.

### Lens records

- **Computer-science:** config-as-data with full provenance; no logic
  change. Threshold config plugs into the existing
  `SubstanceGateConfig` seam; `evaluateSubstance` gains two optional
  advisory metric flags and no new hard-failure branches.
- **Privacy-law:** thresholds are internal quality instrumentation. No
  customer surface is created; no PII is copied; the harness continues
  to record metrics keyed by `doc_id`, not intake values.
- **Prompt-engineering:** the band gives the incentive-redesign
  (Item 246, SPEC §3) a measurable target (median 0.5625) without
  rewarding over-assertion — the high side flags too, so the model
  cannot game the gate by flipping every factor present.
- **Prose:** n/a — no customer prose authored.

## Stage-B ramp plan (re-mine)

Once model-provider runs execute against the archived 245-intake
corpus (CEO-released 1 → 10 → 50 → distribution per Item 253 courier),
presence flags will be re-mined across the real richness distribution
and this file will be revised by courier before any acceptance
enforcement. Until then `provisional: true`.

## Live-call declaration

No live LLM calls this turn. No deploys. No DB writes. No grader
edits. Wire (`run-cppa-risk-assessment`) and
`supabase/_rebuild-snapshot-item244/` untouched.
