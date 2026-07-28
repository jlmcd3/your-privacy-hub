## Item 239 — Bottom-Up Codebase Analysis (docs-only)

Zero code changes. Zero deploys. Produce one analysis document plus a ledger entry. Every claim in the document must cite `file:line` read this turn; no assertions from memory or prior couriers.

### Deliverables

1. `docs/analysis/BOTTOM-UP-CODEBASE-ANALYSIS-2026-07-28.md` — four inventories (below).
2. `docs/pipeline-state.md` — append Item 239 pointing at the analysis doc.

### Read plan (this turn, before writing)

Batched reads, grouped by inventory. Each file gets a fresh read this turn; nothing is asserted from context summaries.

**Schema + shared constants (Inventory 1 — Ownership Map)**
- `supabase/functions/_shared/render-plan/schema.ts` — walk every field.
- `supabase/functions/_shared/render-plan/validators.ts` — writer/reader surface.
- `supabase/functions/_shared/ltp/derive.ts` — `LEDGER_KEYS`, plan construction.
- `supabase/functions/_shared/ltp/pass1-llm.ts` (and any `pass1-*.ts`) — model-authored fields.
- `supabase/functions/_shared/ltp/content/renderplan-wire-schema.ts` — wire projection.
- `supabase/functions/_shared/ltp/closeness.ts` — `FIRM_VARIANT_CLOSENESS_MAX`, `computeCloseness`, `chooseVariant`.
- `supabase/functions/_shared/ltp/pass2-render.ts` — `REQUIRED_PLAN_SLOTS`, slot vocabularies.
- `supabase/functions/_shared/ltp/slot-resolver.ts` — resolution vocabulary.
- `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts` — composer authorship.
- `supabase/functions/_shared/ltp/section-shards/cppa-risk.ts` — shard registry + `COMPOSITION_SHAPE_DECLARATION`.
- `supabase/functions/_shared/ltp/harvest-guard.ts` — provenance source formats.
- `supabase/functions/_shared/ltp/value-screen.ts` — leak lexicon.
- `supabase/functions/_shared/ltp/pass2-assembler.ts` — WriteAroundOrigin, telemetry.
- `supabase/functions/_shared/openings/risk-opening.ts` — T7 provenance format.

**Seam inventory (Inventory 2)**
- `supabase/functions/run-cppa-risk-assessment/index.ts` — full end-to-end wiring (intake→persist).
- `supabase/functions/_shared/ltp/pipeline.ts` — pipeline seams.
- PDF-export seam: locate via `rg` for `pdf`, `html-to-docx`, `renderPdf`, `report_data` consumers under `supabase/functions/`.
- Test files under `supabase/functions/_shared/ltp/*.test.ts` — enumerate which seams have joint tests.

**Assumptions inventory (Inventory 3)**
- `supabase/functions/_shared/ltp/retry-budget.ts` — timeouts, budgets.
- Any `constants.ts` / `POST_LINT_PASS1_TIMEOUT_MS` / clock caps under `_shared/ltp/`.
- `run-cppa-risk-assessment/index.ts` — `BUILD_STAMP`, stage timeouts, labels.
- Grep for legacy labels (`shadow`, `wave`, `v3`, `v4`, `harvest_legacy`) to flag fossils.

**Validator-reject diagnosis (Inventory 4)**
- Re-read `_shared/render-plan/validators.ts` end-to-end.
- Re-read `_shared/ltp/derive.ts` — `pickLedger` construction and its intersection with Pass-1 propositions.
- Re-read `_shared/ltp/pass1-llm.ts` — whether the model constructs its own ledger or receives one.
- Cross-reference: does extending `LEDGER_KEYS` in derive.ts change any Pass-1 contract input? Trace via file:line.

### Document structure

```
# Bottom-Up Codebase Analysis — 2026-07-28 (Item 239)

## 1. Ownership Map
### 1.1 RenderPlan fields
| field | writer(s) file:line | reader(s) file:line | dual-authored? |
### 1.2 Shared constants/vocabularies
| name | definition site file:line | consumers file:line | dual-defined? |
### 1.3 Pass-1 model authorship decomposition
| wire field | model-authored? | judgment vs deterministic | evidence file:line |

## 2. Seam Inventory
For each seam (intake → contract → ledger → prompt → wire → validators → plan →
projections → composers → templates → assembler → guards → serializer → persist →
PDF export → grader input): contract location (file:line or NONE), joint test
(file or NONE). PDF-export seam gets a dedicated subsection with the render
function, consumed fields, and missing-section behavior.

## 3. Assumptions Inventory
| item | value | set at file:line | justified in single-call Pass-2? | fossil evidence |

## 4. Validator-Reject Root Cause (run #172)
Trace of validator_issues:1 with file:line evidence; hypothesis (LEDGER_KEYS
extension vs Pass-1 contract) confirmed/refuted.

## Consolidated Correction Scope (ranked)
1. Dual-authorship instances (ranked by blast radius)
2. Contract-less seams (ranked by failure mode)
3. Fossils (ranked by drift risk)
```

### Ledger entry

Append to `docs/pipeline-state.md`:

```
### Item 239 — BOTTOM-UP CODEBASE ANALYSIS (docs-only, controller dispatch)
Doc: docs/analysis/BOTTOM-UP-CODEBASE-ANALYSIS-2026-07-28.md
Scope: OWNERSHIP MAP · SEAM INVENTORY · ASSUMPTIONS · VALIDATOR-REJECT ROOT CAUSE
Status: READY-FOR-CONTROLLER-SPOT-VERIFY. HARD STOP.
```

### Discipline

- Every table row carries a `file:line` citation read this turn.
- No claim carried forward from prior couriers, memory, or the ledger.
- No code edits; no deploy; no test runs.
- Ends with HARD STOP.
