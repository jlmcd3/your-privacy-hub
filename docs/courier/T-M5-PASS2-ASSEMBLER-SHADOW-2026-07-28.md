# T-M5 — PASS-2 SECTION-SHARDED ASSEMBLER (SHADOW MODE)

**Ledger item:** 225
**Dispatch:** T-M5 (CEO-released after T-M4 checkpoint 2026-07-28)
**Scope:** cppa-risk only. Shadow-mode. NO writes to shipped surface. Legacy composer untouched.
**Cutover:** Deferred to T-M6.

## What Shipped

### New module — `supabase/functions/_shared/ltp/pass2-assembler.ts`
- `assembleReportShadow(plan, harvest?) → { version, report, telemetry }`
- Walks `CPPA_RISK_SECTION_SHARDS` (38 keys) and dispatches by owner kind:
  - **template** → iterates `template_ids`, calls `renderTemplate(id, plan)`, aggregates non-empty text into an array; captures `render_errors` per section.
  - **harvest** → invokes `evaluateOpeningHarvest` / `evaluateSubmissionHarvest` AT the write callsite (T-M4 mitigation #2). On rejection: omit + telemeter, never silently suppress. Missing `submission_summary` auto-defaults to `renderCyberAuditSchedule()`.
  - **deterministic** → calls `shard.project(plan)`; MANIFEST-GATED keys (`debug_review_notes`, `fsor_commentary`, `validation_summary`) gated by `hasManifest(plan)` existence check (T-M4 mitigation #1).
  - **template-cut** → empty-by-design (validator-derived population lands in T-M6).
- **Assembler-exit checks:**
  - §2.5 flat-certainty on close balance: if any activity closeness ≥ `FIRM_VARIANT_CLOSENESS_MAX`, `assertCalibrationMatch` runs per rendered template; violations reject the section (omit + telemeter).
  - PII regex (email/phone) on narrative-class surfaces; hit rejects the section.
  - `evaluateShippedSurfaceGuard` + `evaluateShippedValueScreen({ mode: "observe" })` run against the shadow report in TELEMETRY-ONLY mode (T-M4 mitigation #4). Mirrors Items 213/215 rulings; enforce stays on the legacy shipped projection.
- **Shadow persistence:** `run-cppa-risk-assessment` writes `_meta.internal.assembler_shadow = { version, build_stamp, report, telemetry }` immediately after the authoritative `RenderPlan` write (T-M4 mitigation #3). Wrapped in try/catch (non-fatal); zero writes to any shipped surface.

### Stale-test fixes (CEO-approved fold-in, T-M5 dispatch §5)
`supabase/functions/_shared/ltp/waveb.test.ts`:
- Model assertion: `PASS1_MANIFEST.model === "claude-sonnet-4-6"` (was `startsWith("google/")`).
- Template count: 27 (was 16).
- The `retry-budget.branch-correction` failure stays queued for T-M7.

### Ping surface
`GET /?ping=1` now includes `pass2_assembler_shadow` = `ltp-pass2-assembler-2026-07-28-tm5-shadow`. Live paste:

```json
{"fn":"run-cppa-risk-assessment","build_stamp":"ltp-risk-item221-t-m1-derive-authoritative@2026-07-28T05:00:00Z","ltp_mode":"enforce","pass1_authoritative":"1","pass1_model":"claude-sonnet-4-6","pass1_stamp":"ltp-pass1-llm-2026-07-27-anthropic-direct","pass2_assembler_shadow":"ltp-pass2-assembler-2026-07-28-tm5-shadow"}
```

## Tests

`supabase/functions/_shared/ltp/pass2-assembler.test.ts` — 6 tests, all green:

1. `full-report fixture yields all 38 top-level shard keys touched` — every registry key appears in section telemetry; emitted report keys are a subset of `CPPA_RISK_REPORT_SCHEMA.topLevel`.
2. `manifest-hydration existence check omits debug_review_notes when absent` — asserts T-M4 mitigation #1.
3. `submission_summary harvest auto-defaults to renderCyberAuditSchedule and is accepted` — includes `SCHEDULE_MARKER`.
4. `forced-conflict opening_summary harvest is REJECTED with telemetry (paste)` — see paste below.
5. `assembler produces emission across the shard registry (fixture)` — at least one template + deterministic + harvest section emitted.
6. `shipped guards run in TELEMETRY-ONLY mode on shadow output` — `enforce_violation: false`, surface guard returns an evaluation object.

### Forced-conflict harvest rejection paste

```
[tm5-forced-conflict-paste] {"guard_version":"harvest-guard@2026-07-28-tm3","harvest_key":"opening_summary","artifact_present":true,"artifact_len":56,"rejection_reason":"harvest_intake_ref_not_in_plan_ledger","evidence":["ungrounded_intake_ref:s1_prong=nonexistent_intake_field_zzz"]}
```

### Full LTP suite

`deno test --no-check --allow-env --allow-read _shared/ltp/`:

```
ok | 196 passed | 1 failed (2s)
FAILURES:
  computeRetryBudget: skip when remaining wall-clock < reserve+minWindow  (queued T-M7)
```

Only the pre-existing retry-budget branch-correction failure remains, per T-M5 dispatch §5.

## Deployment

`supabase--deploy_edge_functions ["run-cppa-risk-assessment"]` executed twice (initial assembler wire + ping surface addition). Both successful. Ping paste above.

## Design lineage

- Section-shard registry — `_shared/ltp/section-shards/cppa-risk.ts` (T-M2, Item 222)
- Template catalog — `_shared/ltp/content/pass2-templates.ts` (T-M3, Item 223, 27 templates)
- Harvest guard — `_shared/ltp/harvest-guard.ts` (T-M3)
- Shipped guards (telemetry-only on shadow) — `_shared/ltp/composition-finalize.ts` (Items 213 / 215 rulings)
- Pure emitters used at assembler-exit — `_shared/ltp/cyber-audit-schedule.ts`, `_shared/ltp/risk-level-map.ts`, `_shared/ltp/slot-resolver.ts` (Item 218 §(b)(4))

## Next

T-M6: assembler cutover. Read `_meta.internal.assembler_shadow` in parity mode against the legacy composer; when parity holds, promote assembler output to the shipped body.

## HARD STOP.
