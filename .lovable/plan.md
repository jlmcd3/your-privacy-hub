
# ADMT-FIX-W9 — Pre-Emit Deterministic Gates

## Scope + guardrails
- No changes to grader code, measurement, checks, thresholds, contracts, goldens, pricing, payment, marketing copy, tokens, signup, or revision paths.
- Only `run-admt-checker/index.ts` and one new sibling helper file are modified.
- All three gates import the EXACT grader detectors — no forks, no lookalikes — so pre-emit and post-emit measurement stay identical.
- Do not deploy this turn (harness collision with running Wave 10). Build lands on the green-light tick after Wave 10 finishes.

## Diagnosis of a courier assertion that could not be confirmed
The courier refers to "existing ADMT VA-walk bounded-regeneration machinery" that reuses a model call for a single offending section. Reading `run-admt-checker/index.ts` (lines ~2079–2115) shows the actual existing machinery is a **deterministic downgrade pass** — the `_w9_admt_regen` block downgrades residuals to `typed_insufficient_basis` and explicitly notes "NO looping, NO second LLM call." There is no in-tree helper that re-invokes the model for a single field.

Rather than build a new model-regen path in this atomic turn (which would enlarge blast radius and require its own goldens), the plan **reuses the existing deterministic downgrade pattern** for gate failures. This preserves the courier's non-negotiable constraint — "never strip silently, never emit the invented cite, fail the unit honestly" — while staying inside the atomic-turn scope. If the CEO wants a true model-regen loop, that becomes its own turn with its own tests.

## The three pre-emit gates

Placement: inside the post-generation pipeline in `run-admt-checker/index.ts`, AFTER `normalizeAdmtScopeShape` and AFTER the W9 VA-stamp + W6 scrub, and BEFORE the existing `_w9_admt_regen` deterministic downgrade block. Order: (1) citation whitelist → (2) h6 → (3) e6. Each gate runs against a rendered concatenation of the emitted narrative fields so the detector sees exactly what the grader sees post-emit.

### Gate 1 — Citation whitelist (invented § detector)
- Build allowed set at module load from `buildAdmtVerifiedWhitelist()` (already imported) plus statutory allow-list (Civ. Code §§ 1798.100–1798.199, Bus. & Prof. § 22580, Civ. Code § 3426.1(d), etc.). Statutory allow-list is a small const in the new helper file.
- Extract every "§ NNNN(subdivision chain)" and "11 CCR NNNN…" token from the emitted narrative fields.
- For each token not resolvable to a whitelist entry (parent-match acceptable per verified-depth rule), locate the containing record (bucket + index) and mark it as an invented-citation violation.

### Gate 2 — h6_admt_governing_anchor
- Call `checkH6AdmtGoverningAnchor(text)` from `_shared/grader/cppa-hf1-checks.ts` on the same rendered text.
- Every returned finding with `check_id === "h6_admt_governing_anchor"` (not `_ok`) counts as a gate trip.
- Attribute the containing record by matching the offending sentence back to its source field (small helper: sentence → owning bucket/index).

### Gate 3 — e6_counsel_referral
- Call `_internals.checkE6(text, "hallucination", { intakeRoster })` from `_shared/grader/format-checks.ts` (already exported via `_internals`).
- Same attribution.

### Enforcement action for any gate trip
For each attributed record: apply the existing `_w9_admt_regen` downgrade pattern — replace with typed insufficient-basis (status='insufficient_basis', finding names the violated rule + registry row / detector id, remediation='', enforcement_exposure='na', stamp `_w9_pre_emit_gate` with `{ gate, check_id, section, attempts }`). This satisfies "never strip silently, never emit the invented cite, fail the unit honestly."

For fields that cannot be safely downgraded (exec_summary, scope_analysis narrative, top_3_actions.action text): replace only the offending sentence with a bracketed insufficient-basis marker; if that would empty the field, downgrade the whole record. Top-level narrative that still contains a violation after the gate causes the run to be stamped `_w9_pre_emit_gate.unit_failed=true`; downstream measurement handles the failure honestly.

### "Max 2 attempts" mapping
Given no in-tree model-regen exists, the two attempts are: (1) the initial deterministic downgrade above, (2) a re-run of all three detectors on the mutated report. If any detector still fires after attempt 2, unit is marked failed via the stamp above — no silent emit.

## Telemetry
One structured log per gate + one summary log per unit:
- Per trip: `{ evt: "admt_pre_emit_gate_trip", build_stamp, gate, check_id, bucket, index, section_token, sentence_snippet: first 160 chars, attempt }`
- Summary: `{ evt: "admt_pre_emit_gate_summary", build_stamp, gates: { citation, h6, e6 }: { trips_attempt_1, trips_attempt_2, downgraded, still_failing }, unit_failed }`
Also attached to report as `_w9_admt_pre_emit_gate` so wave digests can join score deltas to gate activity per L5 backlog.

## Files touched
1. `supabase/functions/run-admt-checker/_w9_admt_pre_emit_gates.ts` — NEW. Pure helper exporting `runPreEmitGates(report, intake)` returning `{ mutatedReport, telemetry }`. Imports `buildAdmtVerifiedWhitelist`, `ADMT_VERIFIED_AUTHORITIES`, `checkH6AdmtGoverningAnchor`, `_internals.checkE6`. Contains: text renderer (bucket → concatenated narrative), citation tokenizer, whitelist matcher (with parent-subsection fallback), sentence-to-bucket attribution, and the two-attempt orchestrator. No I/O. No prompt changes.
2. `supabase/functions/run-admt-checker/index.ts` — insert one call to `runPreEmitGates` between the W6 scrub block and the existing `_w9_admt_regen` block; bump `BUILD_STAMP` to `w9-admt-pre-emit@<ts>`; attach summary log + report stamp.
3. `supabase/functions/run-admt-checker/_w9_admt_pre_emit_gates.test.ts` — NEW. Deno unit tests covering: (a) invented § 7999(z) → downgrade; (b) valid § 7220(a) parent for a verified 7220(a)(1) child → pass; (c) h6 violation "the business must disclose … § 7001(e)" alone → downgrade; (d) h6 pass when co-cited with § 7222(b)(3); (e) e6 body-text "consult outside counsel" → downgrade; (f) e6 role-roster/participant list without directive verbs → pass; (g) two-attempt terminator sets `unit_failed=true` when a fabricated top-level narrative persists.

## Tests to run at build time (unchanged)
- `_tests/admt-scope-contract.test.ts`
- `supabase/functions/_shared/grader/*` cppa-hf1 tests
- New `_w9_admt_pre_emit_gates.test.ts`

## Explicit non-goals
- No model regeneration call added.
- No changes to grader logic, contracts, or goldens.
- No prompt edits — the existing prompt already carries the rules; this turn is generation-time enforcement, not more instruction.

## Open decision (needs a one-word CEO nod at green-light)
Confirm the deterministic-downgrade interpretation of "bounded regeneration" is acceptable for this turn. If instead you want a real single-shot model regen of the offending field, that becomes ADMT-FIX-W9b — a separate turn with its own tests, since it changes the LLM budget and re-opens the whole "did the regen introduce new invented cites" measurement question.
