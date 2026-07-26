# WAVE-28 RISK ATTRIBUTION

**DONE — WAVE-28 RISK ATTRIBUTION** @ controller tick 2026-07-26T02:57Z (docs-only; SELECT-only DB reads via Lovable query_database per Backend-access law; controller VM disk-full persists on fresh tick — John re-flagged). Closes the attribution opened in item 106 for risk 72.75 (−6.10 vs w27, new s4 low; run 141, quality_run 38cfb5d6).

**Doc map (quality_run_documents):** doc1 e5a04cf7 72.15 (claude acc 57), doc2 601e7f6c 82.35, doc3 1036f12c 63.60 (claude acc 47, hall 68).

**Driver 1 — qc_r1_4_cohort_determinism (deterministic, CRITICAL) failed on docs 1+3:** "resolved band $25M–$50M requires § 7121(a) cohort April 1, 2030 (ISO or long form); not stated." Longitudinal SELECT across recent risk runs shows this is a RECURRING INTERMITTENT defect, not new: wave-27 (run 0e744761) 1/3 failed (doc 7f0de458); 07-25 runs 9d9ee4e6 and 020f376e each had 1 failure; most runs pass. Wave-28 drew 2/3 failures — worst draw to date. NOT deploy-caused: no run-cppa-risk-assessment deploy occurred between w27 and w28 (items 101–105 touched admt/dpa/corpus/docs only).

**Driver 2 — doc3 body-level intake contradictions (model defect, hallucination HIGH ×2):** report body treats profiling as established ("The record affirmatively records profiling and infer…") despite q5b_profiling_observation=No, and describes q18_admt_use=Yes as a "negated ADMT-use field" to "reconcile". **T7 pilot NOT implicated (controller-verified):** doc3 opening_summary read directly from report_data is intake-consistent on all three criteria — "uses ADMT for significant decisions" (q18=Yes), "does not conduct systematic-observation profiling" (q5b=No), "does not sell or share" — emitter semantic-honesty rules held. The contradiction lives in model-written body prose only. Item 106's T7-clean primary read STANDS.

**Driver 3 — doc1 citation/accuracy model defects:** § 7120(b)(2) consumer-volume condition conflated with the § 1798.140 general business threshold (hall HIGH); § 7150(b)(4) vs (b)(3) trigger rationale confusion (cit HIGH); plus the Driver-1 critical.

**Grader split doc3 RESOLVED (gpt 87 vs claude 63.6):** claude-side findings are intake-verifiable facts (q5b=No, q18=Yes checked directly against intake_data); gpt missed intake-grounded checks. Split resolves as GPT leniency; deterministic_join_v2 behaved correctly; NO instrument action (rubrics never loosened; instrument gc-2026-07-25-s4-eu-uk-ca-au-sg remains FROZEN).

**VERDICT:** wave-28 risk drop = pre-existing intermittent cohort-date omission (worst doc-mix draw to date) + doc3 body contradictions + doc1 citation defects. NOT a regression from the post-01:30Z deploy stack. Attribution CLOSED — risk-deploy gate from item 106 is RELEASED (named release: wave-28 risk attribution hold).

**QUEUED (own deploy-guarded turn): RISK-COHORT-DATE-DETERMINISM** — deterministic post-pass on run-cppa-risk-assessment that, when resolved revenue band = $25M–$50M, guarantees the § 7121(a) cohort date April 1, 2030 is stated (corpus-pinned verbatim; omission-over-invention; model never writes it); before-fixtures: w28 docs e5a04cf7 + 1036f12c and w27 doc 7f0de458; pasted-green tests + boot-log stamp + deploy guards required; must read clean on next risk wave. Also QUEUED: doc3 body-contradiction class (risk_intake_contradiction_body) noted for the risk fix backlog — candidate deterministic downgrade mirroring the LIA/DPIA/DPA T6 scrubber pattern, own turn.

**GATES:** T7 step-2 (admt) still HELD on CEO checkpoint (wave-28 admt read positive per item 106). W9-DEADLINE-REGISTRY-ACCESS-TIMELINE (item 103) unchanged. Next wave ~04:45Z.

**Out of scope this turn:** everything except this ledger item + courier. No rule deviations.
