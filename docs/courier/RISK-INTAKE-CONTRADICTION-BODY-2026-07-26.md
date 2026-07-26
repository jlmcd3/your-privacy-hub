# RISK-INTAKE-CONTRADICTION-BODY — 2026-07-26

**SHIPPED** — deploy-guarded turn on `run-cppa-risk-assessment` ONLY. Discharges the item-107 QUEUED backlog entry (`risk_intake_contradiction_body`) from Driver 2 of the wave-28 risk attribution (doc 1036f12c, quality_run `38cfb5d6`, hallucination HIGH ×2).

## Defect

Model-written **body** prose contradicted a definite intake polarity:
- (a) treated profiling as established despite `q5b_profiling_observation = No` ("The record affirmatively records profiling and infer…");
- (b) framed `q18_admt_use = Yes` as a "negated ADMT-use field" it must "reconcile".

The T7 opening builder was NOT implicated — `opening_summary` was intake-consistent on all three criteria (controller-verified in item 107). This fix does NOT touch `_risk_t7_opening` or the opening builder.

## Fix

Deterministic post-pass mirroring the LIA/DPIA/DPA T6 scrubber pattern (item 89 / 92 / 94 / 104):

- New module `supabase/functions/run-cppa-risk-assessment/_risk_intake_contradiction.ts`.
- Intake fields verified live this turn against `cppa_assessments.intake_data`: `q5b_profiling_observation`, `q18_admt_use`, `q5_sell_share`. Polarity resolver treats "Yes"/"No"/"Both" as definite; "In evaluation" / "TBD" / "Unknown" / "N/A" as indefinite → no-op.
- **Class A (whole-sentence excision):** direct polarity contradiction of a definite intake answer. Patterns:
  - `q5b = No` → excise sentences asserting profiling is established/conducted/performed/observed.
  - `q18 = Yes` → excise sentences framing ADMT-use as negated/absent.
  - `q5_sell_share = No` → excise sentences asserting the business sells/shares personal information.
- **Class B (fixed-template downgrade → drop):** hedged "reconcile the negated ADMT-use field" framing when `q18 = Yes`; hedged "may/might/could/appears to profile" framing when `q5b = No`. No free text generation.
- **Anchor + reserved-subtree safety:** never scrubs `citation`, `verbatim_quote`, `deadline`, `deadline_basis`, `source_fields`, `primary_source_url`, `subsection`, `governing_anchor`, `depth_class`, `proposition_key`, or subtrees rooted at `_meta`, `_internal`, `engagement_map`, `annotations`, `opening_summary`.
- Fail-open at every seam; idempotent; no-op when intake value is missing/indefinite (never invent a polarity).
- Telemetry `_meta.internal.risk_intake_contradiction = { version, stamp, build_stamp, classA_excisions, classB_downgrades, criteria_checked, errors }`, merged so siblings (`risk_w24a`, `risk_t7_opening`, `risk_cohort_date`, …) are preserved.

## Wire

`index.ts` line ~2977: called AFTER `applyRiskCohortDate` and BEFORE the LEAK-PREV P1 emit gate, in every pipeline path that runs RCD (single path in current index). Boot log import + stamp export added.

## Test output (pasted-green, `deno test --no-check`)

```
running 12 tests from ./run-cppa-risk-assessment/_risk_intake_contradiction.test.ts
BEFORE-FIXTURE: profiling-established claim excised when q5b=No (doc 1036f12c shape A) ... ok (3ms)
BEFORE-FIXTURE: 'negated ADMT-use field' / 'reconcile' framing excised when q18=Yes (doc 1036f12c shape B) ... ok (0ms)
BEFORE-FIXTURE: sell/share affirmative claim excised when q5_sell_share=No ... ok (0ms)
already-clean report is a no-op ... ok (0ms)
idempotent: second pass is a no-op ... ok (16ms)
anchor fields (citation, verbatim_quote, deadline, source_fields) never scrubbed ... ok (0ms)
reserved subtrees (_meta, _internal, engagement_map, annotations, opening_summary) untouched ... ok (0ms)
fail-open: null intake → no-op, no throw ... ok (0ms)
fail-open: primitive report → returned untouched ... ok (0ms)
fail-open: indefinite intake polarity is a no-op ... ok (0ms)
telemetry shape: version, stamp, build_stamp, counters, criteria, errors ... ok (0ms)
opening_summary never scrubbed even when it contains a contradiction shape ... ok (0ms)

ok | 12 passed | 0 failed (28ms)
```

## Deploy-guard snapshot (03:33:42Z, immediately pre-deploy)

```
 active_batches | active_qruns | inflight_admt
----------------+--------------+---------------
              0 |            0 |             0
```

Controller-verified 0/0 at 03:29Z; re-verified 0/0/0 at 03:33:42Z. Wave-29 (~04:45Z) margin preserved (deployed 03:34:03Z).

## Boot-log echo (live post-deploy 2026-07-26T03:34:03Z — all prior stamps unchanged)

```
2026-07-26T03:34:03Z INFO [run-cppa-risk-assessment] boot w23_stamp=w23-risk-turnb@2026-07-25T17:02:08Z w24_stamp=w24-risk-turna@2026-07-25T18:14:00Z w24a_v3_stamp=w24a-v3@2026-07-26T01:00:00Z t7_pilotfix_stamp=t7-risk-pilotfix@2026-07-25T22:32:00Z t7_pilotfix2_stamp=t7-risk-pilotfix2@2026-07-26T01:10:00Z risk_cohort_date_stamp=risk-cohort-date@2026-07-26T03:09:53Z risk_intake_contradiction_stamp=risk-intake-contradiction-body@2026-07-26T03:31:00Z build_stamp=risk-intake-contradiction-body@2026-07-26T03:33:00Z
2026-07-26T03:34:03Z INFO [run-cppa-risk-assessment] boot build_stamp=risk-intake-contradiction-body@2026-07-26T03:33:00Z
```

Prior stamps echoed unchanged: w23, w24, w24a_v3, t7_pilotfix, t7_pilotfix2, risk_cohort_date. New: `risk_intake_contradiction_stamp = risk-intake-contradiction-body@2026-07-26T03:31:00Z`; BUILD_STAMP = `risk-intake-contradiction-body@2026-07-26T03:33:00Z`.

## Files touched

- `supabase/functions/run-cppa-risk-assessment/_risk_intake_contradiction.ts` (new)
- `supabase/functions/run-cppa-risk-assessment/_risk_intake_contradiction.test.ts` (new)
- `supabase/functions/run-cppa-risk-assessment/index.ts` (import + stamp bump + wire block)
- `docs/pipeline-state.md` (ledger item + header restamp)
- `docs/courier/RISK-INTAKE-CONTRADICTION-BODY-2026-07-26.md` (this document)

## Gate

**Verification read = next risk wave (~04:45Z)** alongside the RCD gate; distinct telemetry (`risk_intake_contradiction` vs `risk_cohort_date`) keeps attribution separable. Class is called fixed only after wave-29 risk read shows no `risk_intake_contradiction_body` recurrence on w28-doc-1036f12c-shape prose.

## Out of scope

Every other edge function; wave harness; instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` (FROZEN); rubrics/graders/goldens/contracts/fixtures/samples/registries; corpus DDL or corpus row edits; the T7 opening builder (`_risk_t7_opening` untouched); the RCD module; pricing/payment/design tokens/customer revision path/signup. No Fable 5. No sample regen.
