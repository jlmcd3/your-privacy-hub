# RISK-COHORT-DATE-DETERMINISM

**SHIPPED — RISK-COHORT-DATE-DETERMINISM** @ controller tick 2026-07-26T03:07Z (deploy-guarded; `run-cppa-risk-assessment` ONLY). Discharges pipeline-state item 107 QUEUED (Driver 1 recurrence: `qc_r1_4_cohort_determinism` failing on w27 doc 7f0de458 and w28 docs e5a04cf7 + 1036f12c when resolved revenue band = $25M–$50M — cohort date "April 1, 2030" absent from the report). Risk-deploy gate from item 106 was RELEASED at item 107 (named release: wave-28 risk attribution hold); this turn ships the queued fix.

## Attribution recap (from item 107)

- Driver 1 — deterministic CRITICAL `qc_r1_4_cohort_determinism` intermittent: w27 (run `0e744761`) 1/3 failed (doc `7f0de458`); 07-25 runs `9d9ee4e6` and `020f376e` each 1 failure; w28 drew 2/3 failures — worst mix to date.
- Root shape confirmed by controller: after upstream `applyW24aV3` excises the only sentence stating the cohort date (a conditional-parenthetical hedge), nothing else in `report_data` states "April 1, 2030" — the deterministic grader then fails on JSON-stringify search.
- Not deploy-caused (no risk deploys between w27 and w28 per items 101–105).

## Build

- New module `supabase/functions/run-cppa-risk-assessment/_risk_cohort_date.ts`.
- Runs AFTER `applyW24aV3` and BEFORE the LEAK-PREV P1 emit gate in every pipeline path that runs W24A-V3.
- Model NEVER writes/edits the date — deterministic emitter only.
- Deterministic sentence (advocate-drafter voice, no hedges):
  > Per 11 CCR § 7121(a)(3), the first cybersecurity audit report is due April 1, 2030 (audit period January 1, 2029 through January 1, 2030) for a business whose 2028 annual gross revenue was less than $50,000,000.

### Doctrine

- **Corpus-pinned:** `"April 1, 2030"` and `"January 1, 2029 through January 1, 2030"` copied VERBATIM from `provision_texts.cppa-7121` (status=`approved`; citation `11 CCR § 7121 (OAL-approved text, eff. 2026-01-01)`; § 7121(a)(3)); test file pins both literals so registry drift trips the suite.
- **Omission-over-invention:** fires ONLY when `classifyRevenueBand(intake.q1_revenue).key === "25_50m"`. Every other band (including `Under $25M` which also maps to `2030-04-01`) is a no-op — never guesses a cohort date for other bands, never inserts on indeterminate/unspecified.
- **Whole-sentence excision** for wrong-cohort sentences (April 1, 2028 / April 1, 2029 tied to § 7121 or cohort context) in targeted timeline surfaces (`cybersecurity_audit_rationale`, `audit_timing`, `audit_timing_rationale`, `compliance_timeline`, `timeline`, `scope_notes`). Replaced with the deterministic sentence. No partial-clause splicing.
- **Idempotent:** second pass no-op (`date_emitted=0`, `date_corrected=0`).
- **Fail-open** at every seam.
- **Anchor safety:** `citation`, `verbatim_quote`, `deadline`, `deadline_basis`, `source_fields`, `provision`, `regulatory_citation`, `statutory_basis`, `id`, `key`, `stamp`, `build_stamp`, `url`, `primary_source_url` — never rewritten.
- **Reserved subtrees preserved verbatim:** `_meta`, `_internal`, `engagement_map`, `annotations` and any `_`-prefixed key.

## Corpus pin evidence

`provision_texts.cppa-7121` — status `approved`, citation `11 CCR § 7121 (OAL-approved text, eff. 2026-01-01)`, verbatim_excerpt length 1718. § 7121(a)(3) states:

> April 1, 2030, if the business's annual gross revenue for 2028 was less than fifty million dollars ($50,000,000). The business's audit would cover the period from January 1, 2029, through January 1, 2030.

The RCD deterministic sentence quotes both the due date and the audit period verbatim from this row.

## Test output (pasted-green)

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

## Deploy-guard snapshot (re-verified 03:13Z)

```
 active_batches | active_qruns | inflight_risk
----------------+--------------+---------------
              0 |            0 |             0
```

Controller-verified 0/0/0 at 03:07Z. Re-verified 0/0/0 at 03:13Z immediately pre-deploy. Deploy completed well inside the 04:20Z soft / 04:35Z hard cutoffs.

## Boot-log echo (live post-deploy 2026-07-26T03:12:55Z)

```
[run-cppa-risk-assessment] boot build_stamp=risk-cohort-date@2026-07-26T03:09:53Z
[run-cppa-risk-assessment] boot t7_risk_opening_pilot=SHIPPED spec=docs/design/OPENING-PARAGRAPH-DESIGN.md
[run-cppa-risk-assessment] boot vocab_scrub_stamp=w18-risk-vocabscrub@2026-07-25T03:34:41Z
[run-cppa-risk-assessment] boot w21_stamp=w21-risk-turna@2026-07-25T11:47:35Z
[run-cppa-risk-assessment] boot slots_stamp=w9-risk-slots-p1@2026-07-24T09:58:12Z
[run-cppa-risk-assessment] boot w23_stamp=w23-risk-turnb@2026-07-25T17:02:08Z w24_stamp=w24-risk-turna@2026-07-25T18:14:00Z w24a_v3_stamp=w24a-v3@2026-07-26T01:00:00Z t7_pilotfix_stamp=t7-risk-pilotfix@2026-07-25T22:32:00Z t7_pilotfix2_stamp=t7-risk-pilotfix2@2026-07-26T01:10:00Z risk_cohort_date_stamp=risk-cohort-date@2026-07-26T03:09:53Z build_stamp=risk-cohort-date@2026-07-26T03:09:53Z
```

Prior stamps echoed unchanged: `w24a_v3`, `t7_pilotfix`, `t7_pilotfix2`, `w23`, `w24`, `w21`, `w18-vocabscrub`, `w9-slots`. New: `risk_cohort_date_stamp=risk-cohort-date@2026-07-26T03:09:53Z`.

## Telemetry

Lands at `_meta.internal.risk_cohort_date = { version, stamp, build_stamp, band_resolved, date_emitted, date_corrected, sentences_excised, errors }`. Preexisting `_meta.internal` siblings (`risk_w24a`, `risk_t7_opening`, …) preserved via merge.

## GATE

**Must read clean on next risk wave (~04:45Z) before the cohort class is called fixed.** If Driver-1 recurrences persist on $25M–$50M docs post-deploy, RCD emitter regressed and must be re-attributed same-turn. Cohort-date omissions on other bands would be a separate class and out of scope for this fix.

## Out of scope this turn

Every other edge function (admt, cyber, dpa, dpia, lia, governance, ir); wave harness; instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` (FROZEN); rubrics/graders/goldens/contracts/fixtures/samples/registries; corpus DDL or corpus row edits; the T7 opening builder (pilot clean; `_risk_t7_opening` untouched); pricing/payment/design tokens/customer revision path/signup. The doc3 body-contradiction class (`risk_intake_contradiction_body`) remains a separate QUEUED item on the risk fix backlog per item 107.
