# W25-RISK-ATTRIBUTION — Docs-only Courier Report

**Dispatch:** `W25-RISK-ATTRIBUTION-2026-07-25`
**Controller tick:** 2026-07-25T20:17Z
**Scope confinement:** docs-only; ZERO code/prompt/rubric/grader/golden/contract/fixture/sample/registry/corpus edits. NO deploys. NO edge-function touches. Two running quality batches (`072eef66`, `6f90f7b8`) undisturbed.
**Instrument:** s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` — FROZEN.

---

78. **DONE — W25-RISK-ATTRIBUTION** @ controller tick 2026-07-25T20:17Z (docs-only; discharges the wave-25 queue-posture item "W25-RISK-ATTRIBUTION queued FIRST"). Wave-25 risk 73.50 (run 138, quality_run a50af829) vs wave-24 77.65 (run 137, 9d9ee4e6), −4.15 ≈1.7σ vs batch-3 noise floor (σ≈2.3–2.5). VERDICT: NOT caused by W24-RISK-TURNA/v2 (items 74/75) — NO revert.

Evidence:
(1) _meta.internal.risk_w24a telemetry on ALL 3 wave-25 risk docs: strings_rewritten=0 and every scrub/cohort counter 0 (strings_scanned 35/54/29; stamp w24-risk-turna@2026-07-25T18:14:00Z, version risk-w24-turna-v2). The turn was INERT on live content; its target gate qc_r1_4_cohort_determinism cleared 3/3 (v2 gate met).
(2) Failed-finding class profile is UNCHANGED wave-24→25: rubric_citation_misapplied 4→4, rubric_unsupported_business_claim 4→4, rubric_internal_reasoning_leak 1→1; wave-24's extra critical (qc_r1_4) CLEARED. No new class appeared.
(3) Drop is concentrated in ONE doc: doc 1 (5b50f9c6) scored 61.9 vs 77.85/81.45 for docs 2–3; dims moved citation 83→69, formatting 89→81.
(4) rubric_citation_misapplied instances are raw generator prose (subsection-collapse mislabels: (b)(4) cited for significant-decision which is (b)(3); selling/sharing labeled (b)(2) instead of (b)(1); (b)(3)–(6) negatives collapsed under (b)(2)) — risk_w24a rewrote nothing, so no sanitizer produced these. Same key-selection-mismatch family W24 Class A fixed on admt; risk has no such audit.
(5) The internal_reasoning_leak residue "…does not support this statement; it." on doc 1 traces to W23-RISK-TURNB (risk_w23b telemetry on that doc: internal_note_scrubs=2, strings_rewritten=2, concat_normalizations=2, stamp w23-risk-turnb@2026-07-25T17:02:08Z) — partial-excision residue of the pre-existing generator internal-note sentence ("The intake on profiling and systematic observation does not support this statement; it must be reconciled before use.") that leaked in FULL in wave-24 (doc 93a8313b). W23B active for both waves; class pre-existing; W23B reduced but did not eliminate it. Not W24-turn-caused.

QUEUED targeted candidates for next risk fix turn (deploy-guarded, one turn each, attribution satisfied): (a) port W24 admt Class A key-selection-mismatch audit to run-risk-checker (subsection-collapse prose vs resolved pinpoints); (b) extend W23B internal-note scrub to full-sentence excision incl. residue fragments (pattern must consume the entire sentence, both the "does not support this statement" head and the "; it[ must be reconciled…]." tail, with concat re-join).

DEVIATION RULED: controller local VM DISK-FULL persists (20:17Z tick); all reads routed via Lovable query_database/read_file per Backend-access law; John flagged (restart fixes). T6 batches 072eef66 + 6f90f7b8 running at dispatch time; this turn is docs-only and does not gate them.
