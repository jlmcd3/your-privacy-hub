# T-M2 — SECTION-SHARD REGISTRY (cppa-risk)

**Dispatch:** T-M2 (Item 218 §(b)(2) cutover plan, step 2 of 10).
**Ledger:** Item 222.
**Date:** 2026-07-28.
**Scope:** Registry + tests only. No new templates. No grader edits. No batch inserts. No deploy.
**Predecessors:** Items 219 (T-S1 security), 220 (T-C1 intake contract), 221 (T-M1 Pass-1 authoritative).

---

## Deliverable

`supabase/functions/_shared/ltp/section-shards/cppa-risk.ts` — 38 entries, one per top-level key of `CPPA_RISK_REPORT_SCHEMA`. Each binds:

- **(a) Template set** — Pass-2 template ids (from `content/pass2-templates.ts`), or the `deterministic` sentinel, or the `template-cut` sentinel.
- **(b) Projection function** — pure `(plan: RenderPlan) => unknown` slice for the owner to consume at T-M3/T-M4 wire-in.

"Unmapped" is not a permitted state. The **frontend contract is preserved**: the registry key set equals the report-schema top-level allow-list exactly.

## Engine-A HARVEST bindings (subordination ruling verbatim)

> "Engine B should always control. However, where there are any useful artifacts of Engine A, we should use them SO LONG AS THEY CANNOT OVERRIDE OR DIMINISH ENGINE B."

| Key | Emitter | Owner kind | Subordinated |
|---|---|---|---|
| `opening_summary` | `_shared/openings/risk-opening.ts` (T7 pilot, S0–S6) | `harvest` | ✅ |
| `submission_summary` | `_shared/ltp/cyber-audit-schedule.ts` + § 7120 crosswalk clauses | `harvest` | ✅ |

Both bindings are NOT on any deletion list (`RISK_CUT_RULINGS`) — asserted by test. Subordination enforcement (plan-conflict rejection + telemetry, never silent suppression) rides with the T-M3 wire-in; this turn declares the binding only.

## Coverage proof (unit test, green)

```
running 10 tests from ./_shared/ltp/section-shards/cppa-risk.test.ts
registry: every schema top-level key has an owner ................. ok
registry: no extra keys beyond the schema allow-list .............. ok
registry: no duplicate keys ....................................... ok
registry: key count equals schema top-level count ................. ok
registry: every entry has a non-empty template_ids list ........... ok
registry: every entry exposes a callable projection ............... ok
harvest: opening_summary binds to T7 emitter, subordinated ........ ok
harvest: submission_summary binds to § 7121(a) + § 7120 crosswalk . ok
harvest: neither opening_summary nor submission_summary is on any CUT list ok
gap-report: shape is valid and refers only to registry keys ....... ok
ok | 10 passed | 0 failed (28ms)
```

## Gap report — T-M3/T-M4 scoping input

Sections whose owner is `kind: "template"` but whose template ids are reused from other sections (i.e. no dedicated shape authored yet), plus the two harvest sections awaiting subordination wire.

| Key | Reason | Note |
|---|---|---|
| `executive_summary` | template-set-needs-authoring | Opening group exists; cross-activity aggregation not a dedicated template. |
| `priority_actions` | template-set-needs-authoring | Reuses `documentation.{gap,present}`; dedicated shape needed for `deadline_basis` owner-slot fidelity. |
| `next_steps` | template-set-needs-authoring | Reuses `documentation.{gap,present}`; ordering + dedup vs `priority_actions` unauthored. |
| `record_sufficiency` | template-set-needs-authoring | Reuses `documentation.{gap,present}`; per-record shape unauthored. |
| `inconsistency_flags` | template-cut-needs-review-items | `EMPTY_ARRAY` unless `T.risk.review_items` produces bounded content. |
| `opening_summary` | harvest-needs-subordination-wire | T7 present; plan-conflict rejection + telemetry lands with T-M3. |
| `submission_summary` | harvest-needs-subordination-wire | cyber-audit-schedule + § 7120 crosswalk present; subordination guard rides T-M3. |

Sections already covered by first-class templates (no gap): `scope_confirmation`, `scope_and_triggers`, `risk_assessment_by_activity`, `assessment_summary`, `strengthen_items`, `exception_analysis`, `information_needed`.

## Deterministic-owned sections (24 of 38)

`schema_version`, `overall_score`, `risk_level`, `document_metadata`, `attestation_block`, `disclaimer`, `framework_disclaimer`, `accuracy_caveat`, `domains`, `_meta`, `risk_register`, `top_risks`, `part_a`, `part_b`, `gating`, `annotations`, `requires_attorney_review`, `debug_review_notes`, `fsor_commentary`, `citation_ledger`, `validation_summary`, `enforcement_context`, `enforcement_precedents`, `enforcement_meta`.

## Files touched

- **Added:** `supabase/functions/_shared/ltp/section-shards/cppa-risk.ts` — registry, coverage helpers, gap report.
- **Added:** `supabase/functions/_shared/ltp/section-shards/cppa-risk.test.ts` — 10 tests, all green.

## Deferred (not fixed this turn — noted for T-M7)

`supabase/functions/_shared/ltp/waveb.test.ts:79–81` still asserts `PASS1_MANIFEST.model.startsWith("google/")`. Stale since the CEO Q3 same-model ruling landed the direct-Anthropic client. Not in T-M2 scope; **queued for T-M7 cleanup**.

## Disposition

**HARD STOP** after courier + ledger. Next per Item 218 cutover plan: T-M3 (per-section template wire-in + harvest subordination guard).
