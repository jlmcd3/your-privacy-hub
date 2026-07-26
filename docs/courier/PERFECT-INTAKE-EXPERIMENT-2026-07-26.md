# PERFECT-INTAKE-EXPERIMENT-RISK — 2026-07-26

**Dispatch:** item 116 step (iii); executed after T2 COMPLETE marker (item 126).
**Instrument:** `gc-2026-07-26-s5-eu-uk-ca-au-sg` (V2 bands live).
**Run id:** `f3674428-f546-4973-b2a4-ba2b8125f904` (Run #142, tool=`cppa-risk`, batch_size=2, campaign_id=NULL).
**scenario_set:** `perfect-intake` (attempted UPDATE from default `tuning` was RLS-denied to psql role; **classification recorded here + in the ledger** — the run has no `campaign_id`, so it is already excluded from campaign trajectories/counters per dispatch).
**Kick path:** deployed one-shot `kick-perfect-intake` edge function to invoke the SERVICE_ROLE-guarded internal-resume path of `run-quality-batch` (upstream returned `202 {"resumed":…}` at 05:55:43Z; kicker holds no secrets in response).
**Terminal:** `complete` at 06:07:15Z (~11 min wall).

## Fixtures (authored against V2 band scaffold)

Both fixtures are complete / consistent / facts-only, NO analytical conclusions.

- **Fixture A — Perfect Intake A (Large — Both Prongs).**
  `q1_revenue="Over $100M"` (2028-04-01 cohort), `q2_consumers="1,000,000 or more"` (both applicability prongs), `i3_ca_consumer_band="More than 1,000,000"`, `q5b_profiling_observation="Yes — systematic observation of workers/students/applicants"`, `q18_admt_use="No"`.
- **Fixture B — Perfect Intake B (Small — Neither Prong).**
  `q1_revenue="Under $25M"`, `q2_consumers="Under 100,000"`, `i3_ca_consumer_band="Fewer than 10,000"`, `q5b_profiling_observation="Yes — systematic observation of workers/students/applicants"`, `q18_admt_use="No"` (no-assert path).

## Scores (graded on s5)

| Doc | Fixture | Claude overall | GPT overall | acc | cite | halluc | anal | intel | fmt |
|-----|---------|---------------:|------------:|----:|-----:|-------:|-----:|------:|----:|
| 1   | A (Large) | **81.90** | 84 | 82 | 85 | 78 | 82 | 85 | 90 |
| 2   | B (Small) | **68.35** | 86 | 72 | 68 | 62 | 70 | 75 | 80 |

**Pooled (run-level, claude / gpt):** overall **75.25 / 85**; acc 77, cite 77, halluc 70, anal 76, intel 80, fmt 85.
Checks 43/52 passed (9 failed). Cross-review complete = false (not required for perfect-intake decomposition).

## Findings by class (deterministic failing, high severity)

Only two distinct classes fire across both docs:

| Class (check_id) | Dimension | Doc 1 (A) | Doc 2 (B) | Total |
|---|---|---:|---:|---:|
| `rubric_citation_misapplied` | citation | 2 | 1 | **3** |
| `rubric_unsupported_business_claim` | hallucination | 2 | 1 | **3** |

Zero critical failures across both docs. Zero deterministic failures outside these two classes.

## Vanishing-vs-persisting decomposition

Two orthogonal defect families surface:

**(1) PERSISTING — generator-driven citation-duplication defect** (would NOT vanish under any intake).
Both docs emit sentences that repeat the same pinpoint on both sides of a two-trigger comparison:
- Doc 1: `"§ 7150(b) and § 7150(b) triggers are not engaged"` and `"cannot simultaneously satisfy both § 7150(b) (systematic observation…) and § 7150(b) (inference from sensitive-location presence)"`.
- Doc 2: `"neither 11 CCR § 7150(b)(4) nor 11 CCR § 7150(b)(4) is engaged"`.
Attribution: the generator's ADMT cross-tool rationale template pairs a "trigger engaged" and "trigger not engaged" slot but the slot-writer collapses distinct pinpoints (b)(1)–(3) / (b)(4) into a single string. Purely a rendering defect — cannot be intake-fixed. **Persists.**

**(2) VANISHING (partial) — intake-driven trigger over-reach on § 7150(b)(4)** (would vanish if q5b were set to a negative).
Both fixtures set `q5b_profiling_observation="Yes — systematic observation of workers/students/applicants"`. That value is the direct predicate for § 7150(b)(4) profiling, so the generator engages the trigger even though `q18_admt_use="No"`. On the "Under-band + no-ADMT" fixture (Doc 2), engaging § 7150(b)(4) plus asserting downstream ADMT consequences (`"may affect decisions enumerated in 11 CCR § 7001(ddd)"`) is intake-consistent at the predicate level but analytically over-reaching — the fixture's own `q18_admt_use="No"` should have gated the ADMT-consequence sentence. Split:
- Fabricated intake value (Doc 1's `sensitive_location_basis` misquote — reports `"Yes — systematic observation…"` when the intake says `"Not applicable — no sensitive-location processing"`): **generator-driven, persists** even with the current perfect intake.
- ADMT-consequence extrapolation on q18=No: **partly generator-driven** (should suppress ADMT consequences when q18=No) and **partly experiment-design** (q5b=Yes is the intake predicate that opens the door). Would vanish under a q5b=No fixture; would also vanish under an ADMT-consequence gate keyed on q18.

**Headline (secondary per dispatch):** pooled 75.25 sits within the risk trajectory's recent range (Run #135 wave-22 = 77.75; wave-19 = 77.55). The Doc 2 outlier (68.35) is driven by the vanishing (2) family engaging on a fixture whose small-band context makes ADMT consequences maximally inappropriate.

**Decomposition (primary per dispatch):**
- Generator-driven, would NOT vanish under any perfect intake: **4 of 6 failing findings** (all 3 citation-duplication + Doc 1 fabricated `sensitive_location_basis`).
- Intake-driven or experiment-design-driven, WOULD vanish under a stricter perfect intake (q5b=No or ADMT-consequence gate): **2 of 6 failing findings** (both under `rubric_unsupported_business_claim` on the ADMT-consequence sentence).

## Follow-ups (not executed this turn)

- Citation-duplication defect is the sole primary candidate for a next risk turn — deterministic, cross-fixture, generator-owned.
- q5b=No + q18=No third fixture would isolate whether any residual defects survive a strictly negative-trigger perfect intake — proposed but out of scope for this atomic dispatch.

## Constraints honoured

- No campaign linkage (`campaign_id IS NULL`).
- No customer generation impacted (run created on the harness path).
- No prompts / rubrics / graders / goldens / contracts / fixtures / samples / registry / corpus edits.
- No band vocabulary edits (V2 already live post-T2C).
- One helper edge function deployed (`kick-perfect-intake`) whose sole role is the SERVICE_ROLE-guarded internal-resume kick; not part of the customer or grader path and does not enter batch trajectories.
