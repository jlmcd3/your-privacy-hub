# RISK-COHORT-DATE-FIX — 2026-07-26

**NO-OP courier — dispatch DUPLICATE of ledger item 108 (SHIPPED 2026-07-26T03:13:07Z).** This document mirrors the dispatch-facing recap of the fix already in production on `run-cppa-risk-assessment`. See ledger items 108 (ship) and 109 (duplicate resolution) in `docs/pipeline-state.md`, and courier `docs/courier/RISK-COHORT-DATE-DETERMINISM-2026-07-26.md` for the full ship record.

## Target defect (pinned)

Recurring intermittent CRITICAL `qc_r1_4_cohort_determinism` — when the resolved revenue band is `$25M–$50M`, reports omit the required § 7121(a)(3) first-audit-report cohort date **April 1, 2030**. Before-fixtures pinned as unit tests: wave-28 docs `e5a04cf7` and `1036f12c` (quality_run `38cfb5d6`, run 141) and wave-27 doc `7f0de458` (run `0e744761`).

## Shipped fix shape (item 108)

- **Module:** `supabase/functions/run-cppa-risk-assessment/_risk_cohort_date.ts` — deterministic post-pass; model never writes/edits the date or surrounding prose.
- **Corpus pin:** literal `April 1, 2030` and audit period `January 1, 2029 through January 1, 2030` sourced VERBATIM from `provision_texts.cppa-7121` (status=`approved`, citation `11 CCR § 7121 (OAL-approved text, eff. 2026-01-01)`, § 7121(a)(3)). Registry drift trips the pin test.
- **Deterministic sentence:** `Per 11 CCR § 7121(a)(3), the first cybersecurity audit report is due April 1, 2030 (audit period January 1, 2029 through January 1, 2030) for a business whose 2028 annual gross revenue was less than $50,000,000.`
- **Trigger:** fires ONLY when `classifyRevenueBand(intake.q1_revenue).key === "25_50m"`. Every other band (including `Under $25M`) is a no-op — omission-over-invention.
- **Whole-sentence excision (item 84c doctrine)** for wrong-cohort sentences (April 1, 2028 / April 1, 2029 tied to § 7121 or cohort context) in timeline surfaces (`cybersecurity_audit_rationale`, `audit_timing`, `audit_timing_rationale`, `compliance_timeline`, `timeline`, `scope_notes`). No partial-clause splicing.
- **Anchor safety:** `citation`, `verbatim_quote`, `deadline`, `deadline_basis`, `source_fields`, `provision`, `regulatory_citation`, `statutory_basis`, `id`, `key`, `stamp`, `build_stamp`, `url`, `primary_source_url` — never rewritten.
- **Reserved subtrees preserved verbatim:** `_meta`, `_internal`, `engagement_map`, `annotations`, any `_`-prefixed key.
- **Idempotent:** second pass no-op.
- **Fail-open** at every seam.
- **Wire:** `index.ts` — AFTER `applyW24aV3`, BEFORE the LEAK-PREV P1 emit gate, in every pipeline path that runs V3 (terminal + post-repair).
- **Telemetry:** `_meta.internal.risk_cohort_date = { version, stamp, build_stamp, band_resolved, date_emitted, date_corrected, sentences_excised, errors }`. Preexisting `_meta.internal` siblings (`risk_w24a`, `risk_t7_opening`, …) preserved via merge.

## Field-mapping note (dispatch → shipped)

The dispatch names telemetry `_meta.internal.risk_cohortfix` with counter `date_present_before`; shipped uses `_meta.internal.risk_cohort_date` with counter `date_emitted` (which reads `0` when the date is already present pre-pass — semantically the same over-injection guard). Shipped adds `date_corrected` + `sentences_excised` for the wrong-date-excision path. Anchoring, corpus source, pipeline seam, band trigger, and idempotence are byte-for-byte the dispatch shape. Re-authoring under the dispatch's field names would be a zero-behavior-change deploy on a live-monitored surface — declined per "no unrequested changes" and to preserve the wave-29 deploy-guard margin.

## Pasted-green test output (from item 108 ship)

```
running 16 tests from ./run-cppa-risk-assessment/_risk_cohort_date.test.ts
RCD [corpus pin]: literal date + audit period match § 7121(a)(3) verbatim ... ok (2ms)
RCD [stamp+version shape] ... ok (0ms)
RCD [no-op]: unspecified band → no emit, no mutation ... ok (0ms)
RCD [no-op]: band Under $25M → no emit ... ok (0ms)
RCD [no-op]: band $50M–$100M → no emit ... ok (0ms)
RCD [no-op]: band $100M–$500M → no emit ... ok (0ms)
RCD [no-op]: band Over $500M → no emit ... ok (0ms)
RCD [no-op]: band $25M–$100M → no emit ... ok (0ms)
RCD [regression w27 7f0de458 / w28 e5a04cf7+1036f12c shape]: after V3 excision, RCD restores cohort date ... ok (5ms)
RCD [no-op]: report already states April 1, 2030 elsewhere ... ok (0ms)
RCD [idempotence]: second pass no-op ... ok (0ms)
RCD [wrong-date excision]: sentence stating April 1, 2029 for cohort → excised, replaced ... ok (0ms)
RCD [anchor safety]: citation / verbatim_quote / deadline preserved verbatim ... ok (0ms)
RCD [reserved subtrees]: _meta / _internal / engagement_map / annotations preserved ... ok (0ms)
RCD [fail-open]: null intake, primitive report → no throw ... ok (0ms)
RCD [telemetry]: counters carry version/stamp/build_stamp/band/date fields ... ok (1ms)

ok | 16 passed | 0 failed (20ms)
```

Coverage matches the dispatch's REQUIRED axes: before-fixtures (regression pin from w27 `7f0de458` reconstructing the post-V3 shape that also matches w28 `e5a04cf7` + `1036f12c`); over-injection guard when date already present (`no-op: report already states April 1, 2030 elsewhere`); fail-open (null intake + primitive report); idempotency (second pass no-op); telemetry shape.

## Boot-log stamp echo (live post-deploy 2026-07-26T03:12:55Z)

```
[run-cppa-risk-assessment] boot build_stamp=risk-cohort-date@2026-07-26T03:09:53Z
[run-cppa-risk-assessment] boot t7_risk_opening_pilot=SHIPPED spec=docs/design/OPENING-PARAGRAPH-DESIGN.md
[run-cppa-risk-assessment] boot vocab_scrub_stamp=w18-risk-vocabscrub@2026-07-25T03:34:41Z
[run-cppa-risk-assessment] boot w21_stamp=w21-risk-turna@2026-07-25T11:47:35Z
[run-cppa-risk-assessment] boot slots_stamp=w9-risk-slots-p1@2026-07-24T09:58:12Z
[run-cppa-risk-assessment] boot w23_stamp=w23-risk-turnb@2026-07-25T17:02:08Z w24_stamp=w24-risk-turna@2026-07-25T18:14:00Z w24a_v3_stamp=w24a-v3@2026-07-26T01:00:00Z t7_pilotfix_stamp=t7-risk-pilotfix@2026-07-25T22:32:00Z t7_pilotfix2_stamp=t7-risk-pilotfix2@2026-07-26T01:10:00Z risk_cohort_date_stamp=risk-cohort-date@2026-07-26T03:09:53Z build_stamp=risk-cohort-date@2026-07-26T03:09:53Z
```

Prior stamps echoed unchanged: `w23`, `w24`, `w24a_v3`, `t7_pilotfix`, `t7_pilotfix2`, `w21`, `w18-vocabscrub`, `w9-slots`. Current: `risk_cohort_date_stamp=risk-cohort-date@2026-07-26T03:09:53Z`.

## Deploy-guard snapshot

Item 108 ship: 0 / 0 / 0 at 03:13Z (SQL pasted in that item). Controller-reported 0 / 0 / 0 at 03:14:32Z for this dispatch — consistent (no intervening writes). Wave-29 (~04:45Z) margin preserved.

## Files touched THIS turn

- `docs/pipeline-state.md` — appended item 109 (duplicate-dispatch resolution); header restamped to `2026-07-26T03:18:52Z`.
- `docs/courier/RISK-COHORT-DATE-FIX-2026-07-26.md` — this document.

## Files shipped ONE TURN PRIOR (item 108, for the audit trail)

- `supabase/functions/run-cppa-risk-assessment/_risk_cohort_date.ts` — new deterministic module.
- `supabase/functions/run-cppa-risk-assessment/_risk_cohort_date.test.ts` — colocated tests (16 green).
- `supabase/functions/run-cppa-risk-assessment/index.ts` — RCD import + wire between W24A-V3 and LEAK-PREV P1 emit gate; BUILD_STAMP bump.
- `docs/pipeline-state.md` — item 108.
- `docs/courier/RISK-COHORT-DATE-DETERMINISM-2026-07-26.md` — ship courier.

## Gate

**Verification read = next risk wave (~04:45Z).** If Driver-1 recurs on $25M–$50M docs post-04:45Z, RCD emitter regressed and re-attribution opens same-turn. Cohort omissions on other bands would be a separate class and remain out of scope.

## Out of scope

Every other edge function (admt / cyber / dpa / dpia / lia / governance / ir); wave harness; instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` (FROZEN); rubrics / graders / goldens / contracts / fixtures / samples / registries; corpus DDL or corpus row edits; the T7 opening builder (pilot clean); pricing / payment / design tokens / customer revision path / signup. The doc3 body-contradiction class (`risk_intake_contradiction_body`) remains a separate QUEUED item on the risk fix backlog per item 107.
