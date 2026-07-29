# ITEM 257 — SPEC-CONFORMANCE FIX: model-authored factor `intake_ledger_refs` must survive Single-Writer injection

Date: 2026-07-29
Status: LANDED. Two `_shared` edits + one new test file. EXPLICIT redeploy of ONLY `replay-cppa-risk-harness`. `run-cppa-risk-assessment` (Item-217 legacy restore), `_rebuild-snapshot-item244/`, and the coherence screen UNTOUCHED. NO harness invocation this turn — controller reruns personally.

## 1. Evidence (controller-verified)

Ramp-1 attempt 2, job `074a97a8`, doc `43c17b1c`: both Pass-1 attempts
failed identically with

    [pass1-coherence] mass-absence rewrite_rate=0.813 exceeds 0.5

~91s each, no continuation, `validator_issues=0` → write-around
`mass_absence_rewrite_abort` → harness correctly hard-failed
(`presence_rate=0 < 0.25` plus 3 golden-shape shortfalls).

Decoding the rate: `0.813 = 13/16`. The model asserted `present_in_intake=true`
on 13 of the 16 registry factors. **The Item-246 incentive redesign is
working exactly as ratified.** The output was not the failure; the seam
downstream of it was.

## 2. Seam bug (root cause)

`_shared/ltp/pass1-llm.ts::applySingleWriterInjection` merged ONLY
`present_in_intake` + `weight_note` from model factor rows onto the
`pickFactorTable()` scaffold. The scaffold pins
`intake_ledger_refs: []`. Model-authored refs were silently discarded.

`_shared/ltp/pass1-present-note-coherence.ts` (Item 243 defect-3 rule,
UNCHANGED here) then rewrites every `present_in_intake=true` row with
empty `intake_ledger_refs` to absent + "no record evidence".

Joint effect: **100 % of presence-asserting outputs abort**, regardless of
model quality. The mass-abort guard did exactly what the R2 mass-action
law says it must: it refused to ship an all-absent artifact and surfaced
the incoherence to the controller instead of masking it. It protected
content; it did not destroy content.

## 3. Spec authority (verbatim)

- SPEC §2 — the model authors "factor presence + supporting ledger refs
  + factual weight_notes".
- SPEC §3.4 — "Schema order forces grounding-then-writing:
  `intake_ledger_refs` precedes `weight_note` in the wire schema."
- Item-246 PRESENT exemplar (in `pass1-derive-prompt.ts`) writes
  `"intake_ledger_refs":["L.i1_processing_purpose","L.i6_vendors"]`.

The Rule-4 clause `intake_ledger_refs [] (adapter rebinds)` and the
adapter's non-preservation are the DEVIATIONS. Rule 3 (proposition-level
refs remain adapter-owned) is CORRECT and unchanged.

## 4. Fix

### 4.1 `_shared/ltp/pass1-llm.ts`

- `applySingleWriterInjection` is now exported and preserves model-authored
  factor `intake_ledger_refs`, filtered to ledger ids that (i) match shape
  `^L\.[a-zA-Z0-9_]+$` AND (ii) exist in the `pickLedger(input.intake)`
  output. Invalid/unknown refs are dropped and counted.
- New telemetry field on `Pass1Telemetry`: `pass1_factor_ref_drops: number`.
  Dedicated key; does NOT overload `wa_origin`, `pass1_coherence_rewrites`,
  or any other existing telemetry.
- Rows whose refs are all dropped keep `[]` and let the coherence screen
  judge (present-requires-refs remains authoritative).
- Proposition refs remain adapter-derived regardless of model input
  (Rule 3, unchanged).
- `PASS1_LLM_STAMP` → `"ltp-pass1-llm-item257-factor-refs-conformance@2026-07-29"`.

### 4.2 `_shared/ltp/content/pass1-derive-prompt.ts`

Rule 4 clause `intake_ledger_refs [] (adapter rebinds)` is replaced with:

> Populate `intake_ledger_refs` with the `L.<field>` ledger ids that
> substantiate the row (refs first, then the note — grounding-then-writing),
> consistent with the PRESENT exemplar below; the adapter validates each
> id against its derived ledger and drops unknown ids (telemetered).

Rule 3 (propositions) is not modified. `PASS1_DERIVE_PROMPT_VERSION` →
`"pass1-derive-2026-07-29-item257-factor-refs"`.

### 4.3 `_shared/ltp/pass1-injection.test.ts` (new)

Four unit tests exercising the exported `applySingleWriterInjection`:

- (a) valid model refs `["L.i1_processing_purpose"]` + `present=true`
  survive injection with refs intact.
- (b) invalid ref `"L.not_a_field"` is dropped; drop count = 1.
- (c) row with all-invalid refs ends `refs=[]` with `present` preserved
  (coherence screen decides fate).
- (d) proposition refs remain adapter-derived regardless of model input.

Full test outputs — this suite, `replay.test.ts`, and
`grader-check-mirror.test.ts` — 22 passed / 0 failed / 421 ms.

## 5. Four-lens review

- **CS**: the seam contract is now explicit — the model owns factor refs
  as a judgment, the adapter validates them against the ledger and reports
  drops in dedicated telemetry. Single-writer-per-datum preserved: for
  each field there remains exactly one authoritative writer (model for
  factor refs; adapter for ledger, bindings, gates, propositions,
  weighing_frame).
- **Privacy**: no customer surface; telemetry-only; ledger ids are derived
  from the intake already present in the DB.
- **Prompt** — incentive gradient review: "what does this reward when
  uncertain?" — populating refs is now REQUIRED for presence to survive
  the coherence screen, which rewards **grounding**, not absence. Absence
  remains available and honest: `present_in_intake=false` with `refs=[]`
  and `weight_note="no record evidence"` still routes cleanly. The change
  is a SPEC-CONFORMANCE correction of the CEO-signed §3 contract,
  team-unanimous under the CEO's gating-issue delegation. The ramp IS the
  A/B: the failed ramp-1 attempts (job `074a97a8`, both attempts, presence
  13/16 discarded → 0/16 shipped → hard fail) are the baseline arm; the
  next controller-initiated ramp is the treatment arm.
- **Prose**: n/a — no customer prose authored.

## 6. Deploy record

EXPLICIT redeploy of ONLY `replay-cppa-risk-harness` (the harness bundles
the fixed `_shared` modules). See §7.

The legacy customer wire (`run-cppa-risk-assessment`) imports `pass1-llm.ts`
at ITS deployed bundle from the Item-217 restore and is NOT redeployed —
this Item-257 edit does not reach the live customer path. Confirmed by
inspection of `docs/courier/TRACK1-LEGACY-RESTORE-2026-07-29.md` provenance.

## 7. Live-call declaration

No harness invocation this turn. No Pass-1 model call this turn. No DB
writes. No grader edits. The redeploy above is the only side effect on
the platform.
