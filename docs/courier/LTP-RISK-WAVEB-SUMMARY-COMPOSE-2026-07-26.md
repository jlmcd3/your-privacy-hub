# CONTENT COURIER — assessment_summary composition (releases HELD-D, opens HELD-E)

**Timestamp:** 2026-07-26T19:40:58Z
**Dispatch:** CONTENT COURIER — assessment_summary composition (releases HELD-D; controller-authored AFTER codebase/data verification)
**Author:** controller courier (five-lens + double-checked per CEO rules)
**Scope:** cppa-risk only. Isolated authoring — no wiring into `run-cppa-risk-assessment/index.ts`.
**Deploy:** NONE this turn (see §Genuine content HELD).
**BUILD_STAMP:** unchanged (`ltp-risk-p2+fb-f0@2026-07-26T09:08:39Z`).
**Batch launch:** NONE (Part-2 measurement remains GATED on the tier-mapping courier below).

---

## 1. Verified facts driving this turn

Verified live via `query_database` on the latest `cppa_assessments.report_data->'assessment_summary'`:

    sector, company_name, assessment_date, exceptions_status, exceptions_claimed,
    overall_risk_level, triggered_activities, corpus_enforcement_note,
    admt_disclosure_required, cybersecurity_audit_required

All 10 keys match the courier's list. `narrative` (additive) does not yet exist on live docs. Serializer version bumped to `rs-w1-2026-07-26-ltp-waveb-summary`.

**overall_risk_level enum (verified via `rg` on the codebase):**
`"Low" | "Moderate" | "High" | "Critical" | "Insufficient basis"` — **5-tier**, not the 3-tier shape the courier's mapping assumes.

Per the courier's own instruction: "If the codebase enum differs materially from a three-tier shape, record a HELD naming the enum (that would be a genuine content question)." → **HELD-E OPENED** below.

## 2. Landed (maximum buildable subset)

### 2.1 Templates
Added 5 templates to `supabase/functions/_shared/ltp/content/pass2-templates.ts` (total 10 → 15):
- `T.risk.summary.opening.all_firm` (max_chars 400)
- `T.risk.summary.opening.mixed_hedged` (max_chars 560)
- `T.risk.summary.opening.any_negative` (max_chars 560)
- `T.risk.summary.activity_line` (max_chars 360)
- `T.risk.summary.docs` (max_chars 280)

Closed enums exported:
- `SUMMARY_OUTCOME_CLAUSES` (4 clauses per courier)
- `SUMMARY_REMAINING_OUTCOMES_CLAUSES` (2)
- `SUMMARY_DOCS_COMPLETION_CLAUSES` (2)
- `SUMMARY_EACH_OR_THIS_CLAUSES` (2)
- `SUMMARY_NARRATIVE_MAX_CHARS = 2400`

### 2.2 Slot-resolver extension
`supabase/functions/_shared/ltp/slot-resolver.ts` — extended `SlotContext` with the 10 summary-composition slots (activity_count_phrase, each_or_this_clause, firm_positive_list, close_list, negative_list, remaining_outcomes_clause, activity_label, outcome_clause, key_factor_token, docs_completion_clause). Values are pre-rendered deterministically by the composer and pass through verbatim.

### 2.3 Composer module
`supabase/functions/_shared/ltp/summary-compose.ts` — pure deterministic composer:
- `populateTriggeredActivities(plan)` — filters to engaged Type R applicability propositions ONLY; question-shaped strings (ending in "?", or starting with please/what/which/how/does/do you/when/why/list, or > 240 chars) are rejected. Fixes the observed leak.
- `selectOpeningTemplateId(outcomes)` — deterministic most-cautious-first selection; never averaged, never majority-ruled.
- `composeAssessmentSummary(input)` — end-to-end: structured keys + narrative in fixed order (opening → activity lines → docs → closing). Total narrative capped at 2400 chars.
- Exception-status text templated per courier: `"No exceptions claimed"` | `"Exceptions claimed: {list}"` | `"; documentation incomplete — see Items for your review"` suffix on doc-gate failure.
- `overall_risk_level` from caller passed through verbatim; composer NEVER synthesizes a tier while HELD-E is open. `telemetry.overall_risk_level_held = true` flag exposed.

### 2.4 Serializer allow-list (LEAK-PREV-P2)
`supabase/functions/_shared/report-schemas/cppa-risk.ts` — schema version bumped to `rs-w1-2026-07-26-ltp-waveb-summary`. `assessment_summary` added to `objects` allow-list with the 10 verified keys + `narrative` (positive control).

### 2.5 Tests
`supabase/functions/_shared/ltp/summary-compose.test.ts` (6 tests, all pass):
- (a) forbidden-token lint on every new template
- (b) calibration-match matrix: 8 opening-variant scenarios × all outcome combos, including "3 firm + 1 negative — never majority"
- (c) triggered_activities population — customer-question strings verified rejected end-to-end
- (d) end-to-end compose smoke + HELD-flag propagation
- exceptions-status sentinels
- Docs completion clause selection

`waveb.test.ts` — bumped template count assertion 10 → 15.
`content.test.ts` — expected template id list updated to 15 ids sorted.

### 2.6 Renderer/PDF tolerance audit for additive `narrative` field
- `src/components/cppa/RiskAssessmentReportV4.tsx` — `Summary` type uses optional-only keys; unknown extra keys ignored silently (structural type, no exhaustive discriminator). Adding `narrative` is safe.
- `supabase/functions/generate-report-pdf/index.ts` (L1163, L2225) — pulls only specific summary keys via `summary.X` accessors; unknown keys neither read nor asserted. Adding `narrative` is safe.
- No renderer currently DISPLAYS `narrative`. Courier authorized additive schema only; customer-visible rendering of the narrative is a separate downstream turn.

## 3. Genuine content HELD (per courier's own escape clause)

**HELD-E — overall_risk_level tier mapping (item 147).** Codebase enum is 5-tier ("Low"|"Moderate"|"High"|"Critical"|"Insufficient basis"); the courier's mapping ("any impacts-outweigh → highest tier; any hedged or incomplete-documentation → middle tier; all firm with no gaps → lowest tier; all firm WITH open safeguard_gaps → middle tier") is defined only for a three-tier shape. Composer does NOT synthesize a tier and passes any caller-supplied value verbatim; measurement launch is not meaningful until this mapping is authored against the actual 5-tier enum. Awaiting a follow-on content courier defining the 5-tier deterministic mapping.

## 4. Zero-side-effect confirmation

- No wiring into `run-cppa-risk-assessment/index.ts` or `pipeline.ts` from this turn.
- No `BUILD_STAMP` change.
- No deploys.
- No `quality_batch` launches (Part-2 measurement remains GATED on HELD-E).
- Campaign `fd1be147` remains CEO-paused.

## 5. Test results (pasted)

Direct `deno test --no-check` on the three LTP test files (bypassing pre-existing project-wide typecheck errors in unrelated modules — payments-webhook, quality-batch-orchestrator — that block the harness runner):

    26 passed | 1 failed (246ms)

The single failure (`pass2-render: forbidden-token check catches § injection via slot` in `waveb.test.ts:37`) is **pre-existing and out of scope** for this courier — it touches only `T.risk.applicability.engaged`, not any summary template, and its assertion negates presence of `forbidden_token:§` in a render where the citation substitution legitimately injects a real pinpoint containing §. Not touched.

All 6 new `summary-compose.test.ts` tests pass. All 5 pre-existing content tests continue to pass. The updated 15-template count assertion in `waveb.test.ts` passes.

## 6. Ledger

Item 146 records the max-buildable subset landing.
Item 147 opens HELD-E on `overall_risk_level` tier mapping.
Items 143, 143b, 143c, 145 (HELD-D) are RELEASED BY NAME (superseded by items 144 and 146; HELD-D content gap resolved by the composition rules landed above).
