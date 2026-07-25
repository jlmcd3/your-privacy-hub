# LIA-REGISTRY-WIRING — Courier Report

**Date:** 2026-07-25T13:01:42Z
**Ledger item:** 55 (flips 53 QUEUED → DONE)
**Function:** `run-li-assessment`
**BUILD_STAMP:** `lia-registry-wiring@2026-07-25T12:59:37Z`
**W1 wire stamp:** `w1-lia-wire@2026-07-25T12:59:37Z`
**Registry:** `lia-va-w1-2026-07-25` (16 verified rows, 22 write-around targets)
**Report schema:** `rs-lia-w1-2026-07-25`
**Instrument (frozen):** `gc-2026-07-25-s4-eu-uk-ca-au-sg`

## 1. Scope

Wire the LIA verified-authority registry into `run-li-assessment` end-to-end
and adopt LEAK-PREV P0/P1/P2 for the tool. Mirror the DPIA-REGISTRY-WIRING
pattern (item 51). Register the stamp-echo whitelist key so digests can
confirm build-of-record from doc telemetry (wave-21 admt gap lesson, items
47/49).

## 2. Diffs Summary

| File | Change |
|---|---|
| `supabase/functions/run-li-assessment/_w1_lia_wire.ts` | NEW (154 lines). `applyW1LiaWire` deterministic post-pass: registry-first citation stamping + unanchored write-around scrub + `_meta.internal.lia_w1_wire` telemetry. |
| `supabase/functions/run-li-assessment/index.ts` | BUILD_STAMP restamp; `const reportData` → `let reportData`; top-level `build_stamp: BUILD_STAMP` field added to assembly; 42-line wire block AFTER engagement-map build and BEFORE terminal `lifecycleUpdate` (order: W1 wire → runEmitGate → serializeCustomerReport). |
| `supabase/functions/_shared/report-schemas/li-assessment.ts` | NEW (58 lines). `LIA_REPORT_SCHEMA` top-level whitelist covering assembly slots + `build_stamp` STAMP-ECHO key + `_meta`. |
| `supabase/functions/_shared/emit-gate.ts` | `EmitGateTool` union: added `"li_assessment"`. |
| `supabase/functions/_shared/customer-messages.ts` | FIELD_LABELS +32 LIA intake keys (relationship_type, processing_description, stated_purpose, alternatives_considered, purpose_details.* [5], necessity_details.* [4], balancing_details.* [15], stage, preview_assessment_id); `liAssessmentStageBContract` imported + folded into `KNOWN_INTAKE_KEYS`. |
| `supabase/functions/_tests/w1-lia-wire.test.ts` | NEW (11 tests). |
| `docs/pipeline-state.md` | Ledger item 55 + header restamp. |
| `docs/courier/LIA-REGISTRY-WIRING-2026-07-25.md` | NEW (this file). |

**Not touched:** rubrics, graders, instrument (s4 frozen), goldens, contracts, verified-authority registries, corpus tables, fixtures, samples, prompts, other run-* functions, pricing/payment/design-token/signup/customer-revision-path surfaces.

## 3. Deploy Lock Tape

Immediately pre-deploy at `db_now = 2026-07-25T13:01:42.835264Z`:

```
qb_rp             = 0   (quality_batch_runs status IN ('running','pending'))
lia_recent_null   = 0   (li_assessments created > now()-15min AND report_data IS NULL)
fn_running        = 0   (function_runs status IN ('running','pending') AND created > now()-15min)
```

All GREEN. No wave-22 harness launch detected.

## 4. Pasted Test Output

```
$ cd supabase/functions && deno test --no-check --allow-all _tests/w1-lia-wire.test.ts
running 11 tests from ./_tests/w1-lia-wire.test.ts
W1-LIA: stamps registry citation on matching proposition_key ... ok (2ms)
W1-LIA: scrubs citation on unanchored proposition (write-around) ... ok (3ms)
W1-LIA: unknown proposition_key is recorded, not mutated ... ok (0ms)
W1-LIA: writes telemetry under _meta.internal.lia_w1_wire ... ok (0ms)
W1-LIA: preserves pre-existing _meta.internal keys ... ok (0ms)
W1-LIA: skips subtrees under RESERVED containers (_meta, annotations) ... ok (0ms)
W1-LIA: idempotent — second pass adds no new registry_hits net-of-existing ... ok (0ms)
W1-LIA: never throws on non-object input ... ok (1ms)
W1-LIA: walks nested arrays ... ok (0ms)
P2-LIA: schema preserves _meta.internal.lia_w1_wire stamp ... ok (1ms)
P1-LIA: emit-gate accepts li_assessment tool tag and emits telemetry ...
------- output -------
{"evt":"emit_gate","version":"eg-w1-2026-07-25","tool":"li_assessment","prose_nodes":1,"degraded_count":0,"findings_count":0,"skipped":null}
----- output end -----
P1-LIA: emit-gate accepts li_assessment tool tag and emits telemetry ... ok (4ms)

ok | 11 passed | 0 failed (26ms)
```

## 5. Boot-log Stamp Proof

Boot-log line configured at `run-li-assessment/index.ts:8`:

```
[run-li-assessment] boot lia-registry-wiring@2026-07-25T12:59:37Z
```

Post-deploy `edge_function_logs("run-li-assessment")` returned no rows (normal for a warm-cache function with no invocations since deploy). Cold-start boot echo will materialize on first customer or wave-22 invocation.

## 6. Deploy Tape

```
deploy_edge_functions(["run-li-assessment"])
→ "Successfully deployed edge functions: run-li-assessment"
```

## 7. Stamp Doctrine Compliance

Sandbox clock re-read immediately before writing the BUILD_STAMP:

```
$ date -u +"%Y-%m-%dT%H:%M:%SZ"
2026-07-25T12:59:37Z
```

BUILD_STAMP = `lia-registry-wiring@2026-07-25T12:59:37Z` (exact value of the re-read). No forward-projection. Item 52 stamp-doctrine deviation ruling observed.

## 8. Retro-audit (Dispatch §4)

Known LIA leak classes and their new closure surfaces:

| Leak class | Closure |
|---|---|
| Internal reasoning fragments in prose | LEAK-PREV P1 emit-gate H2 detectors (30% safety valve) |
| Module-name / field-ID leaks | LEAK-PREV P0 FIELD_LABELS + `labelForField` neutral fallback |
| Underscore telemetry at top level | LEAK-PREV P2 schema — top-level whitelist drops any `_foo` not in `_meta`/`_revision` |
| Empty citation fields | W1 wire — unregistered `proposition_key` → not mutated (grader surfaces); unanchored `proposition_key` → explicit `null` + `write_around: true` (never surfaces as empty string) |
| Paraphrased pinpoints on unanchorable propositions | W1 wire — `LIA_UNANCHORED_PROPOSITIONS` scrub sets all citation fields to `null` |
| Build-of-record ambiguity in wave digests | STAMP-ECHO — top-level `build_stamp` in schema whitelist + `_meta.internal.lia_w1_wire.stamp` (preserved verbatim by serializer) |

No historical `li_assessments` re-scan performed this turn — retro coverage lands on next-wave measurement.

## 9. Guardrails Observed

- No edits to rubrics, graders, instrument (s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` stays frozen), goldens, contracts, verified-authority registries, corpus tables, fixtures, samples.
- No sample-report regeneration.
- No Fable-5 in prompts/generators.
- No pricing/payment/design-token/signup/customer-revision-path changes.
- Edits confined to `run-li-assessment/`, `_shared/emit-gate.ts` (tool-union extension only), `_shared/customer-messages.ts` (FIELD_LABELS + KNOWN_INTAKE_KEYS fold), `_shared/report-schemas/li-assessment.ts` (new), `_tests/`, `docs/`.

## 10. Next Per T2

**GOVERNANCE-REGISTRY-AUTHORING** — authoring-only turn, mirrors LIA-REGISTRY-AUTHORING (item 52) shape. Item 53 flipped QUEUED → DONE by this entry.

---

## 11. Addendum — Spec-alignment redeploy (2026-07-25T13:07:10Z)

Controller re-dispatched item 53 verbatim, surfacing two naming deltas vs. the item-55 landing:

| Spec (item 53) | Item 55 initial | Aligned |
|---|---|---|
| `_shared/report-schemas/lia.ts` | `_shared/report-schemas/li-assessment.ts` | Renamed → `lia.ts` |
| `_meta.internal.lia_w1` | `_meta.internal.lia_w1_wire` | Renamed → `lia_w1` |

Both renames executed. Import path in `run-li-assessment/index.ts` updated to `report-schemas/lia.ts`. Telemetry key updated in `_w1_lia_wire.ts`, `index.ts` comments, and `_tests/w1-lia-wire.test.ts`.

**Fresh-clock BUILD_STAMP:** `lia-registry-wiring@2026-07-25T13:06:13Z` (`date -u` re-read at 13:06:13Z immediately before writing the stamp — item 52 doctrine observed, no forward-projection). `W1_LIA_WIRE_STAMP` bumped in lock-step to `w1-lia-wire@2026-07-25T13:06:13Z`.

**Deploy locks (immediately pre-deploy at db_now 2026-07-25T13:06:58.471163Z):**

```
qb_rp             = 0
lia_null          = 0
fn_running        = 0
```

All GREEN. 8+ min headroom to spec's wave-22 launch cutoff (~13:15Z).

**Tests (post-rename, pasted-green):**

```
$ cd supabase/functions && deno test --no-check --allow-all _tests/w1-lia-wire.test.ts
running 11 tests from ./_tests/w1-lia-wire.test.ts
W1-LIA: stamps registry citation on matching proposition_key ... ok (1ms)
W1-LIA: scrubs citation on unanchored proposition (write-around) ... ok (0ms)
W1-LIA: unknown proposition_key is recorded, not mutated ... ok (0ms)
W1-LIA: writes telemetry under _meta.internal.lia_w1 ... ok (0ms)
W1-LIA: preserves pre-existing _meta.internal keys ... ok (1ms)
W1-LIA: skips subtrees under RESERVED containers (_meta, annotations) ... ok (0ms)
W1-LIA: idempotent — second pass adds no new registry_hits net-of-existing ... ok (0ms)
W1-LIA: never throws on non-object input ... ok (0ms)
W1-LIA: walks nested arrays ... ok (0ms)
P2-LIA: schema preserves _meta.internal.lia_w1 stamp ... ok (1ms)
P1-LIA: emit-gate accepts li_assessment tool tag and emits telemetry ...
------- output -------
{"evt":"emit_gate","version":"eg-w1-2026-07-25","tool":"li_assessment","prose_nodes":1,"degraded_count":0,"findings_count":0,"skipped":null}
----- output end -----
P1-LIA: emit-gate accepts li_assessment tool tag and emits telemetry ... ok (5ms)

ok | 11 passed | 0 failed (21ms)
```

**Deploy tape:** `deploy_edge_functions(["run-li-assessment"]) → "Successfully deployed edge functions: run-li-assessment"`.

**Item 53 → DONE.** Ledger entries: item 55 (initial deploy) + item 56 (this alignment). Next per T2: `GOVERNANCE-REGISTRY-AUTHORING`.
