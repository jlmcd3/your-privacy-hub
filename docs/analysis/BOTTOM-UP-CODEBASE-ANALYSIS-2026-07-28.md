# BOTTOM-UP CODEBASE ANALYSIS — LTP / cppa-risk

Item 239 · authored 2026-07-28 · ANALYSIS ONLY (zero code changes, zero
deploys). Every claim below cites a file:line read this turn. Where a
file was not opened this turn it is flagged `NOT-READ` and the claim
withheld.

Files opened this turn (context inventory):
- `supabase/functions/_shared/render-plan/schema.ts` (1-137)
- `supabase/functions/_shared/render-plan/validators.ts` (1-514)
- `supabase/functions/_shared/ltp/derive.ts` (1-152)
- `supabase/functions/_shared/ltp/pass1-llm.ts` (1-252)
- `supabase/functions/_shared/ltp/content/pass1-derive-prompt.ts` (1-36)
- `supabase/functions/_shared/ltp/content/renderplan-wire-schema.ts` (1-228)
- `supabase/functions/_shared/ltp/content/pass2-templates.ts` (grep only; lines 33, 52, 146, 208, 258, 438)
- `supabase/functions/_shared/ltp/closeness.ts` (1-51)
- `supabase/functions/_shared/ltp/pass2-render.ts` (1-315 including L35-60, 229, 258, 307)
- `supabase/functions/_shared/ltp/slot-resolver.ts` (1-162)
- `supabase/functions/_shared/ltp/pass2-assembler.ts` (1-583 incl. L70, 442, 479, 515, 533, 570)
- `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts` (1-323 incl. L55, 135, 307)
- `supabase/functions/_shared/ltp/section-shards/cppa-risk.ts` (1-644 incl. L155-205, 411-430, 583-633)
- `supabase/functions/_shared/ltp/composition-finalize.ts` (1-578 incl. L313-350, 411, 431-577)
- `supabase/functions/_shared/ltp/composition-hook-audit.ts` (1-93)
- `supabase/functions/_shared/ltp/retry-budget.ts` (1-159)
- `supabase/functions/_shared/ltp/harvest-guard.ts` (1-385 incl. L138-168, 170, 261)
- `supabase/functions/_shared/ltp/value-screen.ts` (1-225 incl. L39, 86, 122, 164)
- `supabase/functions/_shared/openings/risk-opening.ts` (1-338)
- `supabase/functions/run-cppa-risk-assessment/index.ts` (spot-reads L23, 63-80, 3450-3800; grep coverage of `report_data`, `_origin`, `_meta`, `assembleReport`)
- `supabase/functions/generate-cppa-suite-pdf/index.ts` (1-344; detail L40-160)

NOT-READ this turn (claims involving these paths are withheld or flagged):
- `supabase/functions/generate-report-pdf/index.ts` (2595 lines; single-report PDF exporter — LEAK-PREV-P2 serializer wiring lives here per index.ts comments but was not opened this turn).
- The LEAK-PREV-P2 serializer module itself.
- `_tests/` and Deno assembler/harvest/e2e test files.

---

## 1 · OWNERSHIP MAP

### 1.1 `RenderPlan` schema fields (schema.ts 108-121)

| Field | Author on OK path | Author on write-around path | Reader(s) | Judgment vs Deterministic |
|---|---|---|---|---|
| `plan_version` | `pass1-llm.ts` model JSON (parsed L184) | `derive.ts:123` (`"v1"`) | validators, wire-schema | Deterministic literal — model has no discretion; safe to inject. |
| `product` | model | `derive.ts:124` | assembler, telemetry | Deterministic (const per edge fn). Inject-only. |
| `build_stamp` | model | `derive.ts:125` | telemetry | Deterministic (from BUILD_STAMP `index.ts:23`). Inject-only. |
| `jurisdiction_tag` | model | `derive.ts:126` | V4/V5/V8 validators (`validators.ts` domain checks) | Deterministic per product. Inject-only. |
| `intake_ledger` | **model** (`pass1-llm.ts:184` parses; wire schema requires it — `renderplan-wire-schema.ts:200`) | `derive.ts:127` via `pickLedger` using `LEDGER_KEYS` (`derive.ts:32-47`, `49-63`) | V1 closure `validators.ts:46-62`; harvest-guard grounding `harvest-guard.ts:138-168` | **DUAL AUTHOR-BY-PATH.** Deterministic in nature (verbatim intake echo). |
| `citation_bindings` | model | `derive.ts:128` via `pickCitationBindings` (`derive.ts:65-82`) seeding from `CPPA_RISK_CONCLUSIONS` | V2, V4, V8 | Deterministic (registry-anchored). Inject-only candidate. |
| `propositions` | model | `derive.ts:129` via `pickPropositions` (`derive.ts:84-101`) — CPPA_RISK_CONCLUSIONS × ledger | V1/V2/V4/V5/V6/V8 | **Judgment** (which conclusions apply is legal reasoning). Model must author on OK path. |
| `factor_table` | model | `derive.ts:130` via `pickFactorTable` (`derive.ts:103-113`, note `present_in_intake:false` per shadow rule L108) | V3/V7 | **Judgment on `present_in_intake` + `intake_ledger_refs`**; row set (id/kind/jurisdiction/anchor/guidance_refs) is deterministic from CPPA_RISK_FACTORS registry — should be inject-only. |
| `weighing_frame` | model | `derive.ts:131` (`[]` — populated by Guide stage) | V3, `closeness.ts:14`, `pass2-assembler.ts` (`anyCloseBalance`), section-composers | Deterministic given weighing-tests + gates. Inject candidate. |
| `gate_outcomes` | model | `derive.ts:121, 132` via `evaluateCppaRiskGates` | assembler exit checks | Deterministic (pure over intake). Inject-only. |
| `conservative_write_around` | model, then **overridden** by adapter (`pass1-llm.ts` on ok path — grep hit for "forces triggered=false on ok", index.ts:3581) | `derive.ts:133`/`147` | finalize (index.ts:3731), hook-audit | Deterministic (adapter authority). Correctly adapter-owned already. |

**Model-authored fields that are deterministic in nature** (candidates for inject-only, removing them from the wire-schema output shape shrinks model output and eliminates dual-authorship):
`plan_version`, `product`, `build_stamp`, `jurisdiction_tag`, `intake_ledger`, `citation_bindings`, `factor_table` (row scaffold; only `present_in_intake` needs judgment), `gate_outcomes`.

**Fields the model must own** (legal judgment):
`propositions` (which conclusions apply, polarity for Type-R, weighing_frame_ref for Type-W), `factor_table[].present_in_intake` (semantic mapping from intake to factor), `weighing_frame` narrative selection (source/anchor_hint/pinpoint/tier_label/closeness_contribution).

### 1.2 Shared constants / thresholds / vocabularies

| Datum | Definition site | Reader(s) | Dual-author? |
|---|---|---|---|
| `LEDGER_KEYS` | `derive.ts:32-47` (17 keys) | `pickLedger` (derive.ts:49) only | Single-def, but **not fed into the Pass-1 prompt** (`pass1-derive-prompt.ts` L1-36 contains no LEDGER_KEYS reference), so the model's emitted `intake_ledger` is unconstrained by this list. Not a duplicate definition — a **contract gap** (see §2). |
| `FIRM_VARIANT_CLOSENESS_MAX` | `content/pass2-templates.ts` (grep hits L146/208/258/438; single definition, imported elsewhere) | `pass2-render.ts:16` `assertCalibrationMatch` (L307), `closeness.ts` (via `chooseVariant` default 0.6 `closeness.ts:46`), section-composers, assembler | Single-def in templates BUT `closeness.ts:46` hard-codes the default `0.6` in `chooseVariant` signature rather than importing the constant → **duplicate literal**. |
| Closeness computation | `closeness.ts:14` `computeCloseness` (scalar), Item-237 unified with `max(weighted_scalar, maxFrame)` L38-42 | `section-composers/cppa-risk.ts:135` `balanceInstance` calls it | Single scalar computation. |
| Close-balance predicate | `pass2-assembler.ts` `anyCloseBalance` (per index-grep) AND `section-composers/cppa-risk.ts:55` locally | assembler exit guard; composer selection | **DUPLICATE PREDICATE.** Both operate on `closeness_contribution` per-frame; Item 237 unified `computeCloseness`, but these per-plan predicates were not consolidated. |
| `WriteAroundOrigin` enum | `composition-hook-audit.ts:43` — `"clock_cap" \| "timeout" \| "pass1_abort_timeout" \| "test_forced" \| "unknown"` (AUTHORIZED_ORIGINS L45-50 excludes "unknown") | hook-audit only | **DUAL DEFINITION.** `index.ts:3592` re-declares an inline union `"clock_cap" \| "test_forced" \| "pass1_abort_timeout" \| null` narrower than the canonical enum — no `"timeout"`, no `"unknown"`. Then coerces null → `"unknown"` when calling `buildTypeJWriteAroundBody` (index.ts:3603). No `pass1_validator_reject` variant anywhere. |
| `REQUIRED_PLAN_SLOTS` | `pass2-render.ts:35-60` | `renderTemplate` L229, `omit_empty_required_slot` L258 | Single-def. |
| Slot resolver (symbolic slot → plan/context data) | `slot-resolver.ts:86` `resolveSlot` (L93-117 prefers `ctx.benefit_summary_tokens` etc.) | `pass2-render.ts` | Single-def. |
| `LEAK_LEXICON` | `value-screen.ts:39` | `runValueScreen` L164, finalize L331, `evaluateShippedValueScreen` L411 | Single-def. |
| `TRUNCATED_SLOT_VALUE_SET` | `value-screen.ts:86` | `runValueScreen` | Single-def. |
| Harvest source-prefix vocabulary | Implicit — `harvest-guard.ts:138-168` accepts entries in `plan.intake_ledger[].intake_field`; `risk-opening.ts:192,234,247,285,299,304,307,315,322` emits `cppa_authorities:`, `provision_texts:`, `intake:`, `runtime:` prefixes | harvest-guard | **NO SHARED ENUM.** Producer (`risk-opening.ts`) and consumer (`harvest-guard.ts`) agree by convention only — contract-less seam. |
| `COMPOSITION_SHAPE_DECLARATION` | `pass2-assembler.ts:70` | index.ts:3660 telemetry | Single-def. |
| `CPPA_RISK_SECTION_SHARDS` (38 top-level keys) | `section-shards/cppa-risk.ts:155` | assembler `assembleCore` L442 | Single-def registry. |
| `EXPECTED_EMISSION_MAP` | `section-shards/cppa-risk.ts:583-633` | assembler structural-completeness check | Single-def. |
| `PASS2_TEMPLATES` catalog + `plan_slots` requirements | `content/pass2-templates.ts:52` | `renderTemplate` (pass2-render.ts:229) | Single-def. |
| `PASS2_FORBIDDEN_TOKENS` | `content/pass2-templates.ts:33` | pass2-render linter | Single-def. |
| `PASS1_ABORT_TIMEOUT_ERROR` sentinel | `pass1-llm.ts` (exported per index.ts:63 import) | index.ts:3594, 3736 | Single-def. |
| Post-Pass-2 clock budgets | `retry-budget.ts:30-53` (`ISOLATE_CEILING_MS`, `POST_LINT_LLM_BUDGET_MS`, `POST_LINT_PASS1_TIMEOUT_MS`, `MAX_ELAPSED_FOR_RETRY_MS`, `POST_RETRY_RESERVE_MS`) | index.ts (Pass-1 skip guard L3476, timeout injection L3527) | Single-def, but see §3 — labels ("POST_LINT_LLM") predate the single-call Pass-2 cutover. |

---

## 2 · SEAM INVENTORY

End-to-end path with contract locations and joint-test presence.

| # | Seam | Contract site (file:line) | Joint test |
|---|---|---|---|
| 1 | HTTP intake → `req.json()` | `index.ts` request handler (grep-only; not opened this turn) — NONE (payload shape lives in caller docs, not runtime schema). | NONE observed. |
| 2 | Intake → contract validation (band vocab, `bought_sold_shared_count`, etc.) | Distributed in `run-cppa-risk-assessment/index.ts` `guardInformationNeeded` (L1778), band-resolution `bandResolution` (L3201). No single-file contract module. | NONE end-to-end; unit tests on individual validators exist (assistedInput tests etc.) — not opened. |
| 3 | Intake → shadow-ledger | `derive.ts:49-63` `pickLedger` over `LEDGER_KEYS` L32-47 | `derive.test.ts` (grep; not opened this turn) |
| 4 | Intake → Pass-1 prompt | `content/pass1-derive-prompt.ts:23-36` `PASS1_DERIVE_USER_TEMPLATE` — inlines full intake JSON | NONE — prompt does not enumerate LEDGER_KEYS or require the model's `intake_ledger` to cover any specific field set. |
| 5 | Pass-1 wire schema | `content/renderplan-wire-schema.ts` `RENDERPLAN_WIRE_SCHEMA` (L179-208; `additionalProperties:false` L181) | `renderplan-wire-schema.test.ts` (referenced in file header L13; not opened this turn) |
| 6 | Model output → parse → validate | `pass1-llm.ts:184` `JSON.parse`; L199 `validateRenderPlan` | Unit tests on validators (not opened). |
| 7 | Pass-1 → assembler input | `pass1-llm.ts` return object → `runPass1Llm` at `index.ts:3523`; plan passed to `assembleReport(_pass1.plan, …)` at `index.ts:3631` | NONE joint (assembler tests use synthesised plans, not Pass-1 outputs). |
| 8 | Plan → section-shard projections | `section-shards/cppa-risk.ts:155` binds keys to owner ∈ {template, harvest, deterministic}; boilerplate L158-205 | Section-shard tests (`section-shards/__tests__` per repo layout; not opened this turn). |
| 9 | Plan → composers | `section-composers/cppa-risk.ts:307` `composeSection` dispatch | (as above) |
| 10 | Composer → template render | `pass2-render.ts:229` `renderTemplate`; `REQUIRED_PLAN_SLOTS` L35-60; slot-resolver `slot-resolver.ts:86` | Not opened. |
| 11 | Assembler → exit checks | `pass2-assembler.ts:479-480` (`shipped_surface`, `shipped_value_screen`), harvest decisions L697+ (grep). | Not opened. |
| 12 | Assembler body → `report_data` cutover | `index.ts:3642-3648` preserves `_`-prefixed keys, overwrites all others | Explicit invariant embedded in code comment L3640-3646 — no test. |
| 13 | `report_data` → finalize | `index.ts:3739` `safeFinalizeComposition({reportData, hookValue, writeAroundEntered, writeAroundOrigin, mode})`; enforcement site `composition-finalize.ts:411` `evaluateShippedValueScreen` | Not opened. |
| 14 | Finalize → hook-audit | `composition-hook-audit.ts:74` `assertCompositionHookConformance`; truth table L16-23 | Not opened. |
| 15 | Finalize → serializer (LEAK-PREV-P2) | index.ts comments L2960, 2987, 3016, 3049 assert "serializer preserves `_meta.internal` unmodified" — the serializer module was **NOT READ** this turn; contract lives in that module. | UNKNOWN. |
| 16 | Serialized `report_data` → persist | `supabase.from("cppa_assessments").update` at `index.ts:3507` (worker liveness) and terminal persist site (not opened this turn) | NONE observed. |
| 17 | Persisted row → PDF export (suite) | `generate-cppa-suite-pdf/index.ts:45` `renderRisk(row)` reads `row.report_data.executive_summary` **as a string** (L60 `esc(r.executive_summary)`), `scope_confirmation` object L47, `domains[]` L48, `top_risks[]` L49, `next_steps[]` L50, `overall_score` L57, `risk_level` L58, `enforcement_context` L72, per-domain fields `domain/score/status/finding/regulatory_basis/remediation/priority` L76-82 | NONE. Guard L279-287 rejects if `!Array.isArray(rd.domains) && domains.length > 0`. |
| 18 | Persisted row → PDF export (single) | `generate-report-pdf/index.ts` (2595 lines) — **NOT READ** this turn. Consumed fields unknown from evidence gathered this turn. | UNKNOWN. |
| 19 | Grader input | Not opened this turn. | UNKNOWN. |

**Empty-section behaviour in the suite PDF (17):** every block is guarded by `array.length` or object-truthy conditionals (`${domains.length ? …}`, `${top.length ? …}`, `${next.length ? …}`, `${r.executive_summary ? …}`). Missing sections silently drop from the HTML → the exporter degrades gracefully to a header-only PDF; no error is surfaced when the body is empty (only the pre-render guard `renderRisk` guard at L286 hard-rejects on empty `domains`).

**PDF ↔ assembler shape mismatch flag:** the suite exporter reads `executive_summary` as a **string** (L60 `esc(r.executive_summary)`), but the section-shard registry / composer produces `executive_summary` per `EXPECTED_EMISSION_MAP` — shape not verified this turn (`pass2-templates.ts` and `composeExecutive` not fully opened). If the assembler emits an array/object, `esc()` will stringify to `"[object Object]"` in the PDF. Flagged for verify-first before any fix.

---

## 3 · ASSUMPTIONS INVENTORY

Constants and labels with legacy provenance, evaluated against the single-call Pass-2 world:

| Item | Site | Current value | Assessment |
|---|---|---|---|
| `POST_LINT_LLM_CALL_TIMEOUT_MS` | `retry-budget.ts:35` | 120_000 | **Fossil label.** "POST_LINT_LLM" predates the Pass-2 cutover (single Pass-1 model call now). Value still used as a fallback timeout for non-Pass-1 LLM sites (forward-path/CoT retries), but those sites are **retired** per index.ts:1490,1536 (`forward_path_retry_skipped_retired`, `cot_leak_retry_skipped_retired`). Dead code path. |
| `POST_LINT_LLM_BUDGET_MS` | `retry-budget.ts:51` | 300_000 (5 min) | Fossil label; still guards the Pass-1 skip decision at index.ts:3476. Value is defensible for Pass-1 (2×240s worst case) but the NAME misleads. |
| `POST_LINT_LLM_MAX_CALL_MS` | `retry-budget.ts:44` | 240_000 | Fossil; unused by Pass-1 (which uses `POST_LINT_PASS1_MAX_CALL_MS` L45). Grep would show whether any live site references it. |
| `MAX_ELAPSED_FOR_RETRY_MS` | `retry-budget.ts:32` | 240_000 | Multi-call era assumption. In single-call Pass-2, there is no post-lint retry — this constant only gates a code path that never fires. |
| `POST_RETRY_RESERVE_MS` | `retry-budget.ts:33` | 180_000 | Pre-Pass-2 provisioning; the deterministic Pass-2 assembler + finalize does not need 3 min. |
| `MIN_RETRY_WINDOW_MS` | `retry-budget.ts:34` | 30_000 | Legacy. |
| `SAFE_FINALIZE_BUDGET_MS_DEFAULT` | `composition-finalize.ts:455` | 15_000 | Reasonable for pure post-processing. |
| `withRetryPersistFirst` | `retry-budget.ts:127` | Exported helper | Zero live callers in the Pass-2 world (retries retired per index.ts:1490,1536). Fossil. |
| `assembleReportShadow` | `pass2-assembler.ts:507` (grep hit) | Exported for T-M5 back-compat per header note | Fossil after T-M6 cutover. |
| Shadow-preview slot `_meta.internal.legal_test_pipeline.enforce_preview` | index.ts:3536, 3724 | Populated on every run | Comment L3535 declares "retained for T-M2..T-M5 back-compat"; T-M6 has landed. Fossil consumer. |
| Wave suppression stamps `w20/w21/w22/w23/w24` | index.ts:2942-3086 | Fire on every run, telemetered under `_meta.internal.risk_w##a` | Wave-era fossils; the surface they suppress is now assembler-owned. Not evidence-of-harm but pure noise in the post-cutover shape. |
| `w4/w5/w6/w9/w10` fix modules | index.ts:2412-2450 | Fire on every run | Same class. |
| Legacy V1 band labels in `risk-opening.ts:53-56, 70-73` | `REVENUE_BANDS_CLEAR_A`, `BOUGHT_SOLD_SHARED_BANDS_100K_OR_MORE` | Retained "until the T2C data migration" per comment L48 | Justified as long as stored V1 rows exist; retire after data migration. |
| `chooseVariant` default threshold `0.6` | `closeness.ts:46` | Hard-coded literal | Should import `FIRM_VARIANT_CLOSENESS_MAX` from `content/pass2-templates.ts` (already the constant of record — grep hits L146/208/258/438). Duplicate-literal risk. |
| `_origin` inline union at index.ts:3592 | Local const type | `"clock_cap" \| "test_forced" \| "pass1_abort_timeout" \| null` | Diverges from canonical `WriteAroundOrigin` (`composition-hook-audit.ts:43`): missing `"timeout"` and `"unknown"`; no `"pass1_validator_reject"`. See §4. |
| `part_a`/`part_b`/`gating` empty-by-design shards | `section-shards/cppa-risk.ts` (per Item 237 note; L411-430 area) | Emit `{}` | Legacy V3 pass-through placeholders now correctly emit empty. Fossil scaffolding. |

---

## 4 · VALIDATOR-REJECT ROOT CAUSE (Item 238) — DIAGNOSE ONLY

**Controller hypothesis:** the T-M9.7 `LEDGER_KEYS` extension (8 fields added at `derive.ts:37-46`) changed the derivation contract; the model's returned `intake_ledger` (built from the OLD key list) no longer satisfies ledger closure against the extended expectation → V1 fails identically on both attempts (≈140s each, matching the run-#172 signature).

**Code evidence gathered this turn:**

1. `derive.ts:32-47` defines `LEDGER_KEYS` and it is consumed **only** by `pickLedger` (`derive.ts:49-63`), called from `derivePlan` (`derive.ts:117`) — the SHADOW derivation.
2. `pass1-llm.ts:184` parses the model output with `JSON.parse(raw)`; L199 runs `validateRenderPlan` on that parsed plan. On the OK path the model's own `intake_ledger` is used verbatim; only `conservative_write_around` is force-corrected by the adapter (per grep hit / index.ts:3581 comment "Pass-1's upstream fix (pass1-llm.ts) forces triggered=false on ok").
3. `content/pass1-derive-prompt.ts:1-36` — the full prompt file — contains **zero references to `LEDGER_KEYS`**. `PASS1_DERIVE_SYSTEM` (L10-16) does not enumerate required ledger keys; `PASS1_DERIVE_USER_TEMPLATE` (L23-36) inlines intake JSON only.
4. `content/renderplan-wire-schema.ts:44-54` (`intakeLedgerEntrySchema`) requires `ledger_id/intake_field/value/display` per row but places **no constraint on which intake fields must appear**. `additionalProperties:false` at the row level does not force presence.
5. `validators.ts:46-62` — `validateIntakeLedgerClosure` (V1) checks that every `p.intake_ledger_refs` value on every `plan.propositions[]` resolves to some `plan.intake_ledger[].ledger_id` on the **same plan**.

**Verdict:** the controller's hypothesis is **REFUTED by the code as it exists this turn.** Extending `LEDGER_KEYS` in `derive.ts` cannot cause `pass1-llm.ts` to fail V1, because:
- `LEDGER_KEYS` is not fed into the Pass-1 prompt or wire schema;
- V1 closure is intra-plan (proposition refs vs same-plan ledger ids), not cross-plan (model plan vs shadow derive plan).

The real V1-failure signature is a plan where the **model** emits `propositions[].intake_ledger_refs` referencing ledger ids **the model itself did not include** in `intake_ledger`. That is a Pass-1 prompt-conformance defect, not a `LEDGER_KEYS` extension defect. Alternate hard-reject classes with matching ≈140s×2 determinism: V6 (Type-R proposition missing `polarity`, `validators.ts` — file was read fully but the specific line was not spot-cited here; grep on `validators.ts` would confirm), V7 (Type-W missing `weighing_frame_ref`), V2 (`citation_binding_refs` pointing at a binding not in `citation_bindings`).

**What would confirm which validator issue fired:** the assessment row for run #172 records `_meta.internal.render_plan.telemetry` (index.ts:3551) which includes `validator_issues` count only. To name the issue class, either:
- (a) the plan itself is inspected in `_meta.internal.render_plan.plan` (index.ts:3549) and run through `validateRenderPlan` locally; or
- (b) `pass1-llm.ts` is extended (in the follow-up correction turn) to persist the first `validator_issues[].code` and `.pointer` alongside the count.

Without one of (a)/(b) the exact V-code cannot be named from evidence read this turn. Diagnosis stops here per docs-only mandate.

---

## RANKED SCOPE FOR THE CONSOLIDATED CORRECTION TURN

### Dual-authorship instances (author-of-record ambiguity)

1. **`intake_ledger` — model vs `derive.ts:pickLedger`.** OK-path uses model output; write-around path uses shadow. Adapter-owned ledger (Item 234 principle) would eliminate the ambiguity and remove ~8 fields' worth of model output.
2. **`WriteAroundOrigin` — `composition-hook-audit.ts:43` vs `index.ts:3592` inline union.** Two definitions, narrower at the call site, missing `"pass1_validator_reject"` variant needed to distinguish V-reject from clock-cap.
3. **Close-balance predicate — `pass2-assembler.ts:anyCloseBalance` vs `section-composers/cppa-risk.ts:55:anyCloseBalance` vs `closeness.ts:14:computeCloseness`.** Item 237 unified the scalar; the per-plan predicates were not consolidated. Selection seam risk repeats.
4. **`FIRM_VARIANT_CLOSENESS_MAX` — canonical constant in `content/pass2-templates.ts` vs `0.6` literal default at `closeness.ts:46`.** One-line import fix.
5. **`plan_version` / `product` / `build_stamp` / `jurisdiction_tag` / `citation_bindings` / `gate_outcomes` / `factor_table` scaffold — model vs deterministic authority.** All are model-authored today per wire schema; all are deterministic. Injecting them shrinks model output and eliminates a class of Pass-1 rejects.

### Contract-less seams (implicit conventions)

6. **Pass-1 prompt ↔ V1 closure.** Prompt does not enumerate the ledger keys the model must include; V1 rejects when it doesn't. Add explicit prompt constraint OR (preferred) move `intake_ledger` to adapter (fixes both 1 and 6).
7. **Harvest source-prefix vocabulary — `risk-opening.ts` producer vs `harvest-guard.ts` consumer.** Convention only; no shared enum. Extract `HARVEST_SOURCE_PREFIXES` constant.
8. **PDF-export shape ↔ assembler output shape.** `generate-cppa-suite-pdf/index.ts:60,76-82,88-92` consumes specific field shapes (`executive_summary: string`, `domains[].domain/score/status/finding/…`, `top_risks[].title/description/deadline/consequence`) with no shared type contract with the assembler / section-shards. `generate-report-pdf/index.ts` was **NOT READ** — full inventory pending.
9. **Persist → serializer (LEAK-PREV-P2).** Referenced by comment (`_meta.internal preserved unmodified`) but the serializer module was not opened this turn — no verifiable contract site.

### Fossils (safe-to-retire; verify-first each)

10. `assembleReportShadow` (`pass2-assembler.ts:507`).
11. Shadow-preview slot `_meta.internal.legal_test_pipeline.enforce_preview` (index.ts:3536, 3724).
12. `withRetryPersistFirst` + `POST_LINT_LLM_*` constants (`retry-budget.ts:34-51, 127`) — zero live consumers post-cutover; forward-path/CoT retries retired (index.ts:1490,1536).
13. Wave suppression stamps `w20/w21/w22/w23/w24` and w4/w5/w6/w9/w10 fix modules firing on every run (index.ts:2412-3086) — the surfaces they suppress are now assembler-owned; keep the safety belt or retire deliberately.
14. Legacy V1 band labels in `risk-opening.ts:53-56, 70-73` — retire after T2C data migration completes.
15. `part_a`/`part_b`/`gating` empty-by-design shards — retire when downstream consumers no longer expect the keys.

### Open evidence (do NOT act without further reads)

- V-code of the run-#172 validator reject (§4). Requires either the persisted plan or a pass1-llm change to record the issue code.
- `generate-report-pdf/index.ts` full field consumption inventory (seam 18).
- LEAK-PREV-P2 serializer contract (seam 15).
- Grader input inventory (seam 19).

---

Author: agent · this turn only · HARD STOP after ledger append.
