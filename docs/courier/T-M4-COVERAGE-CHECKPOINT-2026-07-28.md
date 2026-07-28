# T-M4 — COVERAGE COMPLETION + CHECKPOINT (cppa-risk)

**Stamp:** 2026-07-28T06:02Z
**Dispatch:** T-M4 (CEO-released 2026-07-28). Rebuild-chain step 6 of 10. Items 219 (T-S1), 220 (T-C1), 221 (T-M1), 222 (T-M2), 223 (T-M3) complete.
**Scope:** Verification + checkpoint. No template authoring beyond the fixture sweep; no grader edits; no batch inserts; no deploy.
**Disposition:** **CEO CHECKPOINT — HARD STOP.** No further turns until the controller relays CEO review of this courier.

---

## 1. Coverage re-assertion (dispatch (a))

Controller reconciliation: the Item-222 gap report listed seven rows (five template-owner + two harvest); Item-223 authored dedicated templates for all five and wired subordination guards for both harvests. `CPPA_RISK_TEMPLATE_GAPS === []` after T-M3. This turn re-verifies the closure and adds a total-projection sweep.

### 1a. Test paste — full LTP suite (deno test --no-check _shared/ltp/)

```
ok | 188 passed | 3 failed (1s)
```

**The 3 failing tests are pre-existing, unrelated to T-M4 coverage, and already queued for T-M7 cleanup per Item 221 courier + T-M3 addendum:**

1. `waveb.test.ts` — `pass1 manifest exposes model + prompt version`: stale `PASS1_MANIFEST.model.startsWith("google/")` assertion (stale since Q3 same-model ruling, Item 221).
2. `waveb.test.ts` — `all 16 templates enumerated`: literal count 16 became 27 after T-M3 added 8 templates (Item 223); assertion needs bump.
3. `retry-budget.branch-correction.test.ts` — `computeRetryBudget: skip when remaining wall-clock < reserve+minWindow`: pre-existing branch-correction test; noted in Item 217 courier.

All three are **T-M7 cleanup queue**. None gate T-M4/T-M5.

### 1b. Test paste — T-M4 coverage sweep + T-M2/T-M3 regression

```
running 10 tests from ./_shared/ltp/section-shards/cppa-risk.test.ts
registry: every schema top-level key has an owner ... ok
registry: no extra keys beyond the schema allow-list ... ok
registry: no duplicate keys ... ok
registry: key count equals schema top-level count ... ok
registry: every entry has a non-empty template_ids list ... ok
registry: every entry exposes a callable projection ... ok
harvest: opening_summary binds to T7 emitter, subordinated ... ok
harvest: submission_summary binds to § 7121(a) + § 7120 crosswalk ... ok
harvest: neither opening_summary nor submission_summary is on any CUT list ... ok
gap-report: shape is valid and refers only to registry keys ... ok

running 6 tests from ./_shared/ltp/section-shards/cppa-risk.tm4-coverage.test.ts
T-M4 (a): zero gap rows remaining (Item-222/223 closed) ... ok
T-M4 (a): every template-owned shard names at least one Pass-2 template id that exists ... ok
T-M4 (b): every Pass-2 template renders clean through the value-screen fixture ... ok
T-M4 (b): T-M3 owner-slot (deadline_basis) rejects the smoke-#11 truncation class ... ok
T-M4 (c): deterministic + template-cut projections are total over a valid RenderPlan ... ok
T-M4 (c): template + harvest projections are total over a valid RenderPlan ... ok

running 18 tests from ./_shared/ltp/content/content.test.ts … ok
running 13 tests from ./_shared/ltp/harvest-guard.test.ts … ok
running 11 tests from ./_shared/ltp/value-screen.test.ts … ok
running 7 tests from ./_shared/ltp/surface-write-guard.test.ts … ok

ok | 65 passed | 0 failed (T-M4 + T-M2/T-M3 slice)
```

## 2. Fixture sweep (dispatch (b))

**New file:** `supabase/functions/_shared/ltp/section-shards/cppa-risk.tm4-coverage.test.ts`.

**Coverage:** All **27** entries in `PASS2_TEMPLATES` (pre-existing 19 + T-M3 additions of 8) render through a shipped-value-screen fixture. Neutral prose-safe slot values are substituted for every `plan_slot`; `{{cite:…}}` spans are retained (value-screen tolerates cite spans by design; Item 204 rule). Owner-slot `deadline_basis` (STRUCTURED_OWNER_SLOTS, T-M3) receives an explicit long-form fixture that exercises the smoke-#11 truncation class. A positive-control assertion verifies that whole-value truncations (`"We"`, `"The"`, `"  We  "`) still trip the guard on `priority_actions[…].deadline_basis`.

**Result:** All 27 templates pass; no leak-lexicon, no truncated-slot, no unresolved plan-token, no fill-or-omit violation. No new fixtures required beyond the sweep test itself (per T-M3, the templates were authored with fixture coverage; T-M4 confirms the sweep covers the whole catalog, not only T-M3 additions).

## 3. Deterministic-owner audit (dispatch (c))

Total-projection sweep confirms every deterministic and template-cut shard terminates without throwing on a valid derived `RenderPlan`. `undefined` returns (NONE-projected literals) are enumerated and bounded:

| Key | Owner | Projection returns | Note |
|---|---|---|---|
| schema_version | deterministic | `undefined` (literal) | Frontend-visible tag; emitted by generator. |
| document_metadata | deterministic | `undefined` (literal) | Deterministic composer downstream. |
| attestation_block | deterministic | `undefined` (literal) | Deterministic composer. |
| disclaimer | deterministic | `undefined` (literal) | Core-memory Standard Disclaimer. |
| framework_disclaimer | deterministic | `undefined` (literal) | Literal. |
| accuracy_caveat | deterministic | `undefined` (literal) | Literal. |
| part_a / part_b / gating | deterministic | `undefined` (legacy V3) | Frontend-tolerant; empty by default. |
| enforcement_context | deterministic | `undefined` | CPPA-verified rows only; standing-line otherwise. |
| enforcement_precedents | deterministic | `undefined` | 40-char verbatim guard downstream (Track 3). |
| enforcement_meta | deterministic | `undefined` | Enforcement-meta composer downstream. |
| debug_review_notes | deterministic | `undefined` (manifest absent on v1 RenderPlan) | Populates once manifest lands; queued post-T-M6. |
| fsor_commentary | deterministic | `undefined` (manifest absent on v1 RenderPlan) | Same. |
| validation_summary | deterministic | `undefined` (manifest absent on v1 RenderPlan) | V1–V8 outcomes ride manifest; queued post-T-M6. |

All other 25 shards return a plain-JSON value (object / array / boolean / primitive). No throws. No `NaN`, no cyclic reference, no function leakage.

## 4. Full coverage table — 38 keys × owner kind × template ids × test refs

Registry version: `cppa-risk-section-shards-2026-07-28-tm3`. Schema top-level cardinality: **38** (`CPPA_RISK_REPORT_SCHEMA.topLevel.length === 38`). Registry cardinality: **38** (`shardKeys().length === 38`). `missing_from_registry: []`, `extra_in_registry: []`, `duplicates_in_registry: []`.

| # | Key | Owner kind | Template ids / emitter | Test ref |
|--|--|--|--|--|
| 1 | schema_version | deterministic | schema-version-literal | cppa-risk.test.ts + tm4-coverage.test.ts (c) |
| 2 | overall_score | deterministic | risk-level-map@overall_score | tm4-coverage.test.ts (c) |
| 3 | risk_level | deterministic | risk-level-map@risk_level | tm4-coverage.test.ts (c) |
| 4 | opening_summary | **harvest** (subordinated) | `openings/risk-opening.ts` (T7 S0–S6) | cppa-risk.test.ts + harvest-guard.test.ts (7 rows) |
| 5 | executive_summary | template | T.risk.exec.{firm,hedged,negative,insufficient} | content.test.ts + tm4-coverage.test.ts (b) |
| 6 | assessment_summary | template | T.risk.balance.{firm,hedged}, T.risk.closing.reserved, T.risk.summary.{activity_line,docs} | content.test.ts + tm4-coverage.test.ts (b) |
| 7 | submission_summary | **harvest** (subordinated) | `cyber-audit-schedule.ts` + § 7120 crosswalk | cppa-risk.test.ts + harvest-guard.test.ts (5 rows) |
| 8 | attestation_block | deterministic | attestation-block-composer | tm4-coverage.test.ts (c) |
| 9 | document_metadata | deterministic | document-metadata-composer | tm4-coverage.test.ts (c) |
| 10 | scope_confirmation | template | T.risk.applicability.{engaged,not_engaged} | content.test.ts + tm4-coverage.test.ts (b) |
| 11 | scope_and_triggers | template | T.risk.applicability.{engaged,not_engaged} | content.test.ts + tm4-coverage.test.ts (b) |
| 12 | risk_assessment_by_activity | template | T.risk.balance.{firm,hedged,factor_line}, T.risk.admt.consequence_suppressed | content.test.ts + tm4-coverage.test.ts (b) |
| 13 | risk_register | deterministic | risk-register-projection (negative_impact rows) | tm4-coverage.test.ts (c) |
| 14 | top_risks | deterministic | top-risks-ranking (factor_table rank) | tm4-coverage.test.ts (c) |
| 15 | priority_actions | template | **T.risk.priority_action** (owner-slot deadline_basis) | content.test.ts + tm4-coverage.test.ts (b) — positive-control fixture |
| 16 | next_steps | template | **T.risk.next_step** + NEXT_STEPS_MATERIALITY_TIERS + dedup law | content.test.ts + tm4-coverage.test.ts (b) |
| 17 | strengthen_items | template | T.risk.documentation.gap | content.test.ts + tm4-coverage.test.ts (b) |
| 18 | inconsistency_flags | template-cut | T.risk.review_items + **T.risk.review_items.entry** | content.test.ts + tm4-coverage.test.ts (b) — EMPTY_ARRAY otherwise |
| 19 | exception_analysis | template | T.risk.documentation.{present,gap} | content.test.ts + tm4-coverage.test.ts (b) |
| 20 | record_sufficiency | template | **T.risk.record_sufficiency.item** + RECORD_STATUS_CLAUSES | content.test.ts + tm4-coverage.test.ts (b) |
| 21 | part_a | deterministic | legacy-v3-passthrough (empty) | tm4-coverage.test.ts (c) |
| 22 | part_b | deterministic | legacy-v3-passthrough (empty) | tm4-coverage.test.ts (c) |
| 23 | gating | deterministic | legacy-v3-passthrough (empty) | tm4-coverage.test.ts (c) |
| 24 | annotations | deterministic | validator-annotations-projection (Type J) | tm4-coverage.test.ts (c) |
| 25 | requires_attorney_review | deterministic | attorney-review-flag (any Type J) | tm4-coverage.test.ts (c) |
| 26 | debug_review_notes | deterministic | debug-review-telemetry (manifest) | tm4-coverage.test.ts (c) — NONE today; post-T-M6 |
| 27 | fsor_commentary | deterministic | fsor-commentary-projection (manifest) | tm4-coverage.test.ts (c) — NONE today; post-T-M6 |
| 28 | citation_ledger | deterministic | citation-bindings-projection | tm4-coverage.test.ts (c) |
| 29 | validation_summary | deterministic | validators-v1-v8-summary (manifest) | tm4-coverage.test.ts (c) — NONE today; post-T-M6 |
| 30 | accuracy_caveat | deterministic | accuracy-caveat-literal | tm4-coverage.test.ts (c) |
| 31 | domains | deterministic | domains-jurisdiction-tag (Q4(e) rollup) | tm4-coverage.test.ts (c) |
| 32 | enforcement_context | deterministic | enforcement-context-standing-line | tm4-coverage.test.ts (c) |
| 33 | enforcement_precedents | deterministic | enforcement-precedents-projection | tm4-coverage.test.ts (c) |
| 34 | enforcement_meta | deterministic | enforcement-meta-projection | tm4-coverage.test.ts (c) |
| 35 | information_needed | template | T.risk.documentation.gap, T.risk.information_needed.b_criterion_count | content.test.ts + tm4-coverage.test.ts (b) |
| 36 | disclaimer | deterministic | standard-disclaimer-literal | tm4-coverage.test.ts (c) |
| 37 | framework_disclaimer | deterministic | framework-disclaimer-literal | tm4-coverage.test.ts (c) |
| 38 | _meta | deterministic | meta-envelope (projectMeta — positive control) | tm4-coverage.test.ts (c) |

**Count:** 24 deterministic + 2 harvest + 11 template + 1 template-cut = 38.

## 5. Sections that resisted bounded-template expression

**None.** All 38 top-level keys have bounded owners; the seven Item-222 gap rows are closed with dedicated T-M3 templates or harvest subordination guards. No key required a fresh authoring turn; no key required an escape hatch.

## 6. Risks the controller sees in the T-M5 assembler build

1. **Manifest-hydration cliff.** Three deterministic shards (`debug_review_notes`, `fsor_commentary`, `validation_summary`) project the `manifest` field, which is absent from the v1 `RenderPlan` surface. Their projections return `undefined` today. **Risk:** if T-M5 wires the assembler to read `manifest`-derived values without an existence check, three shipped-surface keys become perma-empty at cutover. **Mitigation:** T-M5 must land `manifest` on the RenderPlan (already scoped in v1 schema `weighing_frame` sibling location per Item 221) OR the assembler must treat these three keys as empty-by-finding until T-M6.
2. **Harvest subordination wire is authored but not called.** `evaluateOpeningHarvest` / `evaluateSubmissionHarvest` exist and are unit-tested (13/13); the assembler does not yet invoke them. **Risk:** T-M5 must call the guard at the harvest-write callsite, not at the serializer, or subordination becomes a paper policy. **Mitigation:** T-M5 dispatch should name the callsite explicitly and require a rejection-telemetry paste from a forced-conflict fixture.
3. **Legacy composer still owns the shipped body.** Item 218 §(b)(6) fences the cutover at T-M6 — the legacy composer produces `report_data` through T-M4/T-M5. **Risk:** any T-M5 change that observes both surfaces must not accidentally cross-write. **Mitigation:** T-M5 must be assembler-authoring-only with shadow output persisted to `_meta.internal.assembler_shadow` (mirrors the Item 221 render_plan persistence pattern).
4. **T-M5 dispatch must specify surface-guard interaction.** `evaluateShippedSurfaceGuard` + `evaluateShippedValueScreen` are post-serializer today (Items 209/213/215). When T-M5 begins producing assembler output into `_meta.internal.assembler_shadow`, guard evaluation on the shadow surface should be **telemetry-only** (mirrors the Item 213/215 rulings) until T-M6 cutover, or the assembler smoke will Branch Fail on schema-mismatch during the first shadow run.
5. **Stale enumeration assertions in `waveb.test.ts`.** T-M5 will add or move templates; the `"all 16 templates enumerated"` assertion is already stale (now 27). Left in place, it will keep failing under T-M5 and confuse controller review. **Mitigation:** roll the T-M7 cleanup for `waveb.test.ts:79–81` (stale model assertion) and the template-count assertion into the same clean-up window before T-M5 begins, OR explicitly re-affirm the T-M7 defer in the T-M5 dispatch.

## 7. Stale `waveb.test.ts` item — status

**Queued: T-M7 cleanup.** Two stale assertions in `_shared/ltp/waveb.test.ts` remain:

- Line 79–81: `PASS1_MANIFEST.model.startsWith("google/")` — stale since the CEO same-model ruling (Q3 during LEGAL-TEST-V2.1 dispatch); assertion now inverts against the correct `claude-sonnet-4-6` binding.
- `"all 16 templates enumerated"`: literal count 16 became 27 after T-M3 additions.

Both are non-gating for T-M5. Neither is a regression; both are known-stale from prior turns' correct changes. Cleanup batched to T-M7.

## 8. Files touched this turn

- **New:** `supabase/functions/_shared/ltp/section-shards/cppa-risk.tm4-coverage.test.ts` (6 tests; sweep + totality).
- **Untouched:** `pass2-templates.ts`, `harvest-guard.ts`, `cppa-risk.ts` registry, `value-screen.ts`. No template text changed; no guard logic changed.

## 9. Disposition

**CEO CHECKPOINT — HARD STOP.** No further turns until the controller relays CEO review of this courier. Next per Item 218 plan: **T-M5 — ASSEMBLER BUILD** (shadow-mode; cutover deferred to T-M6).
