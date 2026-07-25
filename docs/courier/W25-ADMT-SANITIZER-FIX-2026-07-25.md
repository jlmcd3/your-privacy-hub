# W25-ADMT-SANITIZER-FIX — Deploy-guarded fix turn (cppa-admt only)

**Dispatch:** `W25-ADMT-SANITIZER-FIX-2026-07-25`
**Controller tick:** 2026-07-25T22:45:45Z
**Scope:** `run-admt-checker` only. Discharges ledger item 84 queued candidates (a) T-Ab full-sentence excision and (b) T-B coverage widening, applying cross-tool whole-sentence-excision doctrine (item 84c). Instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` FROZEN.

---

## Fixes

**T-Ab — full-sentence excision (supersedes W24 partial excision).**
Pattern consumes the ENTIRE sentence carrying the "…information is needed…" (and additional/further variants) phrase from its start boundary through the terminal period inclusive, with whitespace re-join at boundaries. Eliminates the splice artifact seen in wave-25 doc `04e7393b` access_logic ("…refresh the assessment.exists to pronounce…").

**T-B — coverage widening.**
Detects the unresolved-fallback phrase "the applicable ADMT-subchapter provision" in ANY grammatical position (attributive-noun-modifier, mid-sentence interpolation, etc.) via a deep recursive walker (`walkDeep`). Registry-first: when the nearest enclosing entry carries a resolvable `proposition_key` the phrase is rewritten to the verified pinpoint; otherwise the whole sentence is dropped. Regression pins: wave-25 doc `2235d1f6` ("the applicable ADMT-subchapter provision trigger, conditional on…") and wave-26 doc `0481fc0c` ("no enumerated the applicable ADMT-subchapter provision category applies").

**Cross-tool doctrine (item 84c):** every sentence-level scrub touched this turn consumes whole sentences with whitespace re-join. Drop-only or registry-rewrite; the model never writes/edits customer prose.

---

## Wiring

`supabase/functions/run-admt-checker/index.ts` — sanitizer invoked in seam order AFTER `applyW24AdmtH6` and BEFORE the LEAK-PREV-P1 emit gate, so the gate + serializer observe the sanitized surface. Anchor keys and reserved `_`-prefixed subtrees are never mutated. Fail-open try/catch at the seam and at every helper — availability never blocked.

Telemetry: one `evt=_w25_admt_sanitizer_fix` JSON console line per run with per-fix-class counters (`tAb_sentences_excised`, `tB_registry_rewrites`, `tB_sentence_drops`, `strings_scanned`, `errors`). Serializer `_meta.internal` whitelist unchanged.

---

## BUILD_STAMP

`w25-admt-sanitizer@2026-07-25T22:44:15Z` (fresh-clock at 22:44:00Z; strictly-earlier rule honoured).

**Boot-log proof (live, post-deploy 22:45:28Z):**

```
2026-07-25T22:45:28Z INFO [run-admt-checker] boot admt_sanitizer_w25_stamp=w25-admt-sanitizer@2026-07-25T22:43:00Z
2026-07-25T22:45:28Z INFO [run-admt-checker] boot build_stamp=w25-admt-sanitizer@2026-07-25T22:44:15Z
2026-07-25T22:45:28Z LOG booted (time: 37ms)
```

---

## Green test output

```
$ deno test --allow-all run-admt-checker/_w25_admt_sanitizer_fix.test.ts
running 11 tests from ./run-admt-checker/_w25_admt_sanitizer_fix.test.ts
splitSentences — preserves terminators and trailing fragment ... ok (1ms)
rejoinSentences — single-space, trimmed, collapsed ... ok (0ms)
T-Ab: whole-sentence excision of info-needed sentence — no splice residue ... ok (0ms)
T-Ab: additional/further variants also excised whole ... ok (0ms)
T-B: attributive-modifier position dropped (regression pin doc 2235d1f6) ... ok (0ms)
T-B: mid-sentence interpolation dropped (regression pin doc 0481fc0c) ... ok (0ms)
T-B: registry-first rewrite when proposition_key resolves ... ok (0ms)
idempotency: second pass is a no-op ... ok (0ms)
fail-open: malformed input types return safely ... ok (0ms)
apply: _meta preserved; unrelated fields untouched; anchor keys not mutated ... ok (0ms)
apply: nested arrays and deep objects are reached (widened coverage) ... ok (0ms)

ok | 11 passed | 0 failed (7ms)
```

---

## Deploy guards

- Pre-deploy snapshot at 22:44:59Z: `active_batches=0`, `inflight_null=0`.
- Wave-27 freeze (~00:15Z) not at risk.

## Prohibited surfaces — confirmed untouched

No rubric / grader / golden / contract / fixture / sample / registry / corpus edits (instrument FROZEN). h6_admt_governing_anchor and h7_admt_blanket_range NOT touched (own turns). Item-78 admt citation key-selection audit NOT touched (own turn). T7 step-2 admt opening wiring NOT touched (HELD on CEO checkpoint). No sample regen; no Fable 5; no pricing/payment/design/customer-revision/signup changes; no other edge functions; no wave harness; no T6 pipeline; no measurement batch this turn.

## Files changed

- `supabase/functions/run-admt-checker/_w25_admt_sanitizer_fix.ts` (new)
- `supabase/functions/run-admt-checker/_w25_admt_sanitizer_fix.test.ts` (new)
- `supabase/functions/run-admt-checker/index.ts` (BUILD_STAMP bump + import/wire/boot log, ~20 lines)
- `docs/courier/W25-ADMT-SANITIZER-FIX-2026-07-25.md` (this file)
- `docs/pipeline-state.md` (ledger item 88 + header restamp)

## Sandbox

Controller VM disk-full persists (per items 84–87); all backend access via Lovable `query_database` / `read_file` / `deploy_edge_functions` (route-around, no deviation).
