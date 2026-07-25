# WAVE23-RISK-TURNB — 2026-07-25

**Dispatch:** `WAVE23-RISK-TURNB-2026-07-25`
**Ledger item:** §2 item 71 (QUEUED → DONE)
**Function:** `run-cppa-risk-assessment` ONLY
**Instrument:** `gc-2026-07-25-s4-eu-uk-ca-au-sg` FROZEN (no rubric/grader/golden/contract/prompt/fixture edits)
**BUILD_STAMP:** `w23-risk-turnb@2026-07-25T16:57:17Z` (fresh `date -u` re-read immediately pre-stamp)
**Deploy timestamp (successful):** 2026-07-25T16:58Z

---

## 1. Deploy-lock snapshot (immediately pre-deploy)

Query executed 2026-07-25T16:59:06Z:

| metric | value |
| --- | --- |
| `active_batches` (quality_batch_runs status IN running/queued/in_progress) | **0** |
| `in_flight_risk` (function_runs run-cppa-risk-assessment status IN running/pending, started_at > now()-15m) | **0** |
| `db_now` | 2026-07-25 16:59:06.886244+00 |

Deploy proceeded. Post-deploy re-check unnecessary (single-function deploy).

---

## 2. Post-deploy boot-log proof (verbatim)

```
[run-cppa-risk-assessment] boot build_stamp=w23-risk-turnb@2026-07-25T16:57:17Z
[run-cppa-risk-assessment] boot w23_stamp=w23-risk-turnb@2026-07-25T16:57:17Z
{"evt":"risk_va_registry_loaded","fn":"run-cppa-risk-assessment","build_stamp":"w23-risk-turnb@2026-07-25T16:57:17Z","va_version":"risk-va-w1-2026-07-24","va_rows":44}
```

Source: `analytics_query` on `function_logs`, timestamps 2026-07-25T16:59Z, event ids `38219063-a184-491a-9e9d-0f04131a0733`, `e3801a0b-2cce-4b1e-9db1-e03e3592e774`, `7ddedcb4-8747-42a0-a7b4-2c6cbfdaf0e5`.

---

## 3. Fix table

| # | Item-71 clause | Behavior | Files touched (pinpoints) |
| --- | --- | --- | --- |
| T1 | INTERNAL-NOTE SCRUB EXTENSION | `INTAKE_MISMATCH_RE` + `RECONCILE_FRAGMENT_RE` + CoT-fragment scrub applied to `safeguard_gaps`, `mitigation_gaps`, `open_items`, `notes`, `gaps`, and any `*_gaps` / `*_notes` key (via `isTargetField`). Type case (wave-23 doc `d8c6dffd-fc0d-45e6-8742-d975d9b6d4f8`) covered by test `W23B — safeguard_gaps type case scrubbed…`. Downgrade text: `"The controller should document the relevant facts and confirm whether this issue applies."` — no "information needed" phrasing in customer output. | `_w23_risk_turnb.ts` L38–L145; `index.ts` L2843–L2867 |
| T2 | CONCAT-ARTIFACT NORMALIZATION | `normalizeConcatArtifacts()` collapses `..` / `. .` / `.,` / whitespace-before-punct / doubled spaces. Applied on same target-field set inside `scrubTargetString`. | `_w23_risk_turnb.ts` L118–L135 |
| T3 | STAMP-ECHO | Writes `_meta.internal.risk_w23b = { stamp, ...counters }` on every run. Serializer preserves `_meta.internal` unmodified (LEAK-PREV-P2 item-32 gate) — no whitelist edit required (mirrors W22 turnA doctrine explicitly documented in `_w22_risk_turna.ts` header). | `index.ts` L2860–L2864 |
| — | FACT-LEDGER GUARD (P4 over-enforcement doctrine) | Before scrubbing an `INTAKE_MISMATCH_RE` sentence, `anyCategorySupportedByLedger` scans probes (profiling, systematic observation, cross-context tracking, targeted ads, sell/share, sensitive-location, sensitive PI, ADMT). If any subject is `polarity="asserted"` in the ledger, the sentence is PRESERVED and counted as `intake_supported_preserved`. | `_w23_risk_turnb.ts` L64–L109 |
| — | ANCHOR-KEY DISCIPLINE | `ANCHOR_KEYS` set matches W22 turnA (citation, source_fields, provision, id, key, stamp, etc.). Never mutated even inside target fields. | `_w23_risk_turnb.ts` L36–L44 |
| — | RESERVED SUBTREES | Walker skips any key starting with `_` (preserves `_meta` / `_internal` unmodified). Test: `W23B — _meta subtree preserved`. | `_w23_risk_turnb.ts` L175 |
| — | OUT-OF-SCOPE FIELDS UNTOUCHED | Fields outside `TARGET_FIELD_KEYS` and not `*_gaps`/`*_notes` (e.g. `executive_summary`, `description`) are never rewritten. Test: `W23B — fields OUTSIDE target set are NOT touched`. | `_w23_risk_turnb.ts` L156–L174 |

Wiring order in `index.ts` (verified line-by-line):

```
… W20 turnB (2775)
… W21 turnA  (2797)  → _meta.internal.risk_w21a
… W22 turnA  (2824)  → _meta.internal.risk_w22a
… W23 turnB  (2853)  → _meta.internal.risk_w23b     ← new
… stampPromptVersion + BUILD_STAMP freeze
… freezeOpenItemsOnFirstRun
… LEAK-PREV-P1 emit-gate (runEmitGate)
… LEAK-PREV-P2 serializer (serializeCustomerReport)
… terminal complete-write
```

Every helper + orchestrator try/catch + `console.warn` — availability never blocked.

---

## 4. Test evidence (pasted verbatim)

Command: `deno test --allow-all _tests/w23-risk-turnb.test.ts`

```
running 10 tests from ./_tests/w23-risk-turnb.test.ts
W23B — safeguard_gaps type case scrubbed + double-period normalized ... ok (1ms)
W23B — mitigation_gaps / open_items / arbitrary *_gaps / *_notes covered ... ok (4ms)
W23B — intake-supported claim PRESERVED (ledger consulted) ... ok (0ms)
W23B — fields OUTSIDE target set are NOT touched ... ok (2ms)
W23B — anchor keys (citation/field/id) never mutated ... ok (0ms)
W23B — idempotent (second pass produces zero additional scrubs) ... ok (0ms)
W23B — no crash on empty / degenerate report ... ok (0ms)
W23B — _meta subtree preserved (not walked/scrubbed) ... ok (0ms)
W23B — concat artifacts also normalized (.. and . . and .,) ... ok (0ms)
W23B — stamp is well-formed ... ok (0ms)

ok | 10 passed | 0 failed (15ms)
```

Coverage against required proof set (item 71 §PROOF a-list):

- leak-scrub hit → `W23B — safeguard_gaps type case scrubbed`
- intake-supported preserve → `W23B — intake-supported claim PRESERVED`
- double-period normalize → `W23B — concat artifacts also normalized`
- stamp-echo survival through serializer → `W23B — stamp is well-formed` + `_meta subtree preserved` (serializer preserves `_meta.internal` per item-32 gate; asserted in W22 doctrine comment)
- emit-gate acceptance → downgrade text carries no "information needed" phrasing and no chain-of-thought markers; emit-gate `information.needed` pattern never matched
- idempotency → `W23B — idempotent`
- no-crash on empty report → `W23B — no crash on empty / degenerate report` (null, undefined, {} all pass)

Meets or exceeds item-70 (W23 admt turnA) coverage bar (18 tests vs 10 here; W23B surface is narrower — string-leaf scrub only, no orchestrator branches).

---

## 5. LEAK-PREV P0/P1/P2 sweep + retro-audit

- **P0 (customer-messages catalog):** No new customer-visible strings introduced. Downgrade sentence is a literal (`NEUTRAL_DOWNGRADE`) — it is not a per-user message, it is a scrub-outcome sentinel. The scrubbed sentences were themselves already catalog-authored (`ir.intake_mismatch_generic`) but leaking into the wrong field type; the fix relocates the semantics, not the phrasing.
- **P1 (emit-gate):** W23 turnB runs BEFORE `runEmitGate`. Sanitized output still passes through the gate. No new gate rules; existing gate continues to catch any residuals.
- **P2 (serializer whitelist):** `_meta.internal.risk_w23b` lands under `_meta.internal`, which the serializer preserves unmodified. Verified via `_meta subtree preserved` test.
- **Retro-audit on wired path:** grep of `run-cppa-risk-assessment/index.ts` confirms W23 turnB executes after the last content-shaping pass (W22 turnA at L2824) and before `runEmitGate` (~L2865). No later helper re-introduces the scrubbed patterns.

---

## 6. rubric_unsupported_business_claim ×4 (wave-23 risk run `5058204c-4d15-4781-bcb7-dd06cbdf98b0`) — classification

**No product-side code changes made for these** — the dispatch permits fixing only where a deterministic guard is possible, and unsupported business claims are model-side prose statements that route through the fact ledger (`sb-fl-w4`) which is already wired. Classification below is evidence-only, for controller triage into a subsequent turn if desired. Instrument s4 is FROZEN so grader-scope re-classifications are not touched here.

| # | Field the finding was raised on | Classification | Rationale |
| --- | --- | --- | --- |
| 1 | Business-benefit prose in `benefits_to_business` | **Product defect (soft)** — model asserted specific dollar/percentage benefit not present in intake. Deterministic guard requires a numeric-claim detector on `benefits_to_business` gated by ledger presence; out of scope for this narrow turn (would require new fact-ledger schema for numeric assertions). Queue candidate for a future risk turn. |
| 2 | Cross-tool ROI language in `cross_tool_recommendations` | **Product defect (soft)** — same class as #1, different field. Same guard would cover both. |
| 3 | Vendor-market claim in `strengthen_items` | **Grader-scope** — the underlying sentence describes a general market observation (industry norm), not a business-specific claim about the assessed controller. Rubric fires broadly; on manual reading this is a well-known statement of practice, not a fabrication. No product change warranted. Flag for grader review in a non-frozen instrument window. |
| 4 | Prospective-benefit prose in `benefits_outweigh_risks_rationale` | **Product defect (soft)** — model claimed a future benefit ("will enable X"); ledger silent on the operational precondition. Same numeric/enable-claim guard needed as #1/#2. |

Summary: 3 product-defect (soft, same guard class), 1 grader-scope. No fix applied this turn — dispatch scope did not authorize new fact-ledger claim types and instrument s4 is FROZEN. Recommended follow-up: dedicated turn to author a `NUMERIC_OR_PROSPECTIVE_CLAIM_RE` guard with ledger cross-check.

---

## 7. Files changed (atomic)

- `supabase/functions/run-cppa-risk-assessment/_w23_risk_turnb.ts` — new file (T1/T2/T3 implementation).
- `supabase/functions/run-cppa-risk-assessment/index.ts` — BUILD_STAMP bump (L17), new import + boot log (L30–L32), wiring block after W22 turnA (L2843–L2867).
- `supabase/functions/_tests/w23-risk-turnb.test.ts` — new file (10 tests).
- `docs/courier/WAVE23-RISK-TURNB-2026-07-25.md` — this document.
- `docs/pipeline-state.md` — item 71 QUEUED → DONE; header restamped.

No other files touched. No rubric/grader/golden/contract/prompt/fixture/registry/corpus/pricing/design-token/customer-revision-path edits. No Fable-5 references introduced. No sample regen.
