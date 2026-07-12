# DPIA Plan B — Sectioned Generation r1b2.3

Self-reinvoke pattern (STOP #1): **CLEAR.** `run-quality-batch` uses `fetch(${SUPABASE_URL}/functions/v1/<fn>, Bearer ${SERVICE_KEY}, x-internal-resume: 1)` awaited. Mirroring it as `x-internal-unit: 1` in `run-dpia-framework`.

## Design summary
Split the single `Promise.all([genHalf(promptA), genHalf(promptB)])` at L772 into five unit invocations, each in its own isolate, coordinated through row-level state.

```text
entry (POST /run-dpia-framework)
  ├── unit=undefined → BOOTSTRAP (once)
  │     - verifyCaller, requireEntitlement, load row, resolveIntakeForTestStates
  │     - build systemWithGdpr, resolved jurisdiction, corpus fetches
  │     - persist shared context to dpia_frameworks.report_data._staging.shared
  │     - initialise _staging.units = { u1:pending, u2:pending, u3:pending, u4:blocked, u5:blocked }
  │     - fan-out: self-reinvoke U1, U2, U3 (parallel)
  │
  ├── unit="u1" | "u2" | "u3" (parallel, isolated)
  │     - skip-if-present guard on _staging.units[uX].status === 'done'
  │     - load shared context from _staging.shared
  │     - build unit prompt (shared prefix + cache_control + unit-specific tail)
  │     - callAnthropicWithContinuation with per-unit cap
  │     - atomic write: _staging.units[uX] = { status:'done', keys:{...}, elapsed_ms, output_tokens }
  │     - atomic check "am I last of {u1,u2,u3}?" → if yes, self-reinvoke U4
  │
  ├── unit="u4"
  │     - skip-if-present guard
  │     - reads U3.design_risk_impacts VERBATIM from _staging.units.u3.keys
  │     - generates section_4_risk_management (16k cap)
  │     - atomic write; self-reinvoke U5
  │
  └── unit="u5" (synthesis)
        - reads compact digests of U1–U4 from _staging.units.*.keys
        - generates section_5_interested_parties, section_6_conclusion, framework_disclaimer
        - STITCH: reportData = merge(u1.keys, u2.keys, u3.keys, u4.keys, u5.keys)
        - run EXISTING whole-doc machinery unchanged:
            residual repair (L779), methodology reconciliation (L816),
            lintReportText walk, T-1..T-5 gate, detectTestStatesLeak,
            jurisdiction validator, insufficient-info-guard, placeholder scan,
            observeCitations, recordRunMeterAndVersion
        - clear _staging; write final report_data; status='complete' (matches existing DB enum)
```

## Key → Unit partition (courier §Design, verbatim mapping)

| Unit | Keys produced | max_tokens | Depends on |
|---|---|---|---|
| U1 | `dpia_metadata`, `section_0_overview`, `section_1_description` | 12,000 | shared |
| U2 | `section_2_analysis` | 10,000 | shared |
| U3 | `section_3_necessity_proportionality` (incl. `design_risk_impacts`) | 10,000 | shared |
| U4 | `section_4_risk_management` | 16,000 | shared + U3.design_risk_impacts |
| U5 | `section_5_interested_parties`, `section_6_conclusion`, `framework_disclaimer` | 8,000 | shared + digests(U1..U4) |

## Prompt content preservation (courier §3)
Every rule in `DPIA_TOOL_MODULE.extraRules` (L60–L135+) is kept in `systemWithGdpr` verbatim — the shared prefix is built ONCE and reused for every unit. No rule text edits. Compact-cells rule stays. The per-unit prompt tail contains ONLY the JSON skeleton for that unit's keys, plucked verbatim from the current `promptA`/`promptB` JSON schemas (L580–L740). Rules that name multiple sections apply to every unit through the shared system prefix — no duplication needed.

U4's tail includes an explicit hand-off block:
```
GIVEN — U3.design_risk_impacts (verbatim, do not modify):
<JSON of u3.keys.section_3_necessity_proportionality.design_risk_impacts>

Use these design risks alongside your own incident_risk_impacts to build inherent_risk_assessment per the standing rule (L677 of the reference prompt).
```

U5's tail includes compact digests: risk-row summaries (risk + level + acceptable), measure titles, `[TO COMPLETE]` items, `information_needed[]`, metadata determinations, decision status.

## Storage — `report_data._staging` (no migration) — **DATA ONLY** (Amendment 2)
```jsonc
_staging: {
  shared: {
    // DATA ONLY — no system prompt text, no rule text, no per-unit prompt skeleton text.
    // rows are RLS-readable by their owning user; persisting prompt text would leak the
    // proprietary rule set. System blocks + per-unit skeletons are rebuilt from code
    // (deterministic given the module source) at the top of every unit invocation.
    intake, resolved, testStates, enforcementPrecedents, enforcementMeta,
    gdprMeta, gdprBlock, orgContext, orgName, generationStartedAt, gdprJurisdiction
  },
  units: {
    u1: { status:'pending'|'processing'|'done'|'error', keys?:{...}, elapsed_ms?, output_tokens?, stop_reason?, error?, started_at? },
    u2: {...}, u3: {...}, u4: {...}, u5: {...}
  },
  version: "r1b2.3"
}
```
Deleted at U5 stitch success. Sweeper (`STUCK_PROCESSING_MINUTES`) re-enters row → BOOTSTRAP sees `_staging` present and dispatches only units with `status !== 'done'` (idempotent).

## Atomic phase advance (optimistic-lock, no migration)
Each unit at entry re-reads the row, refuses if own status already `done`, transitions to `processing` via update conditioned on `updated_at` (existing column) — losing writer re-reads and yields. Phase-advance dispatch (U4 after all of U1/U2/U3 done; U5 after U4 done) uses the same optimistic-lock: only the transition setting next-unit `blocked → dispatching` wins. Any double-dispatch is caught by the next unit's own skip-if-`done`/`processing` guard.

## Failure semantics (courier §8) — **MERGE, DO NOT REPLACE** (Amendment 1)
- `AnthropicTimeoutError` or any terminal error inside a unit → write `_staging.units[uX] = { status:'error', error, unit:'uX', elapsed_ms }` **as a jsonb-merge into the existing report_data — _staging MUST survive**. Row status → `failed` via `lifecycleUpdate` with **`report_data = { ...existingReportData, _staging: mergedStaging, last_error: {unit, error, elapsed_ms} }`** — never the bare error-stub write at L1265–1273 of the pre-refactor file. `failFunctionRun` receives `{ unit, elapsed_ms }` metadata.
- Sweeper next attempt: BOOTSTRAP sees intact `_staging`, re-dispatches only units with `status !== 'done'`. Existing evidence guard unchanged.
- Any hard-key validation failure at U5 stitch → same merge-preserving path with `stage: 'stitch'`.
- **Turn-4 sandbox verify addendum**: force a unit failure (short-abort ANTHROPIC_ABORT_MS override or stalling mock), confirm the failed row still carries `_staging.units[u_done].keys.<sections>`, then invoke the sweeper (or POST bootstrap re-entry) and confirm only the missing units re-run and the doc completes.

## UI — DPIA processing page (courier §9)
Locate existing DPIA result/processing route (likely `src/pages/DPIAProcessing.tsx` or embedded in `useGenerationStatus`). While `status='processing'`, poll `report_data._staging.units.*` and render D8-compliant per-unit progress:
- "Preparing shared context — 0 of 6 steps"
- "Description & metadata complete — 1 of 6 steps" (U1)
- "Analysis complete — 2 of 6 steps" (U2)
- "Necessity & proportionality complete — 3 of 6 steps" (U3)
- "Risk assessment complete — 4 of 6 steps" (U4)
- "Consistency check — 5 of 6 steps" (U5 mid)
- "Finalising — 6 of 6 steps" (U5 stitch)

Reuses `useGenerationStatus` polling; no new architecture.

## Telemetry (courier §10)
Every unit emits exactly one line:
```
[run-dpia-framework] stage=unit:u3 elapsed=87342ms output_tokens=6210 stop_reason=end_turn
```

## Files touched (scan target for verify §7)
- `supabase/functions/run-dpia-framework/index.ts` — refactor
- `supabase/functions/_shared/` — no new files needed; if a helper is extracted for the phase-advance SQL, it lives here
- `src/pages/DPIAProcessing.tsx` (or the DPIA processing page — confirm path in turn 2) — per-unit progress UI

No changes to `_shared/anthropic-call.ts`, `cppa-test-states.ts`, `lifecycle-write.ts`, `function-run-logger.ts`, `insufficient-info-guard.ts`, jurisdiction registry, or any other generator.

## Boot marker
`stampPromptVersion("dpia-framework", "r1b2.3")` and file-header comment `qb9 dpia-r1b2.3 sectioned-generation (U1..U5)`.

## Turn plan (verify list is inherently multi-turn)
1. **This plan** — approve.
2. Refactor generator + stamp r1b2.3; typecheck; deploy.
3. Locate & update DPIA processing page for per-unit progress.
4. Sandbox end-to-end on rich intake (verify §1) — quote per-unit telemetry, wall time, T-check line.
5. dpia harness run 1/3 (verify §2a).
6. dpia harness run 2/3.
7. dpia harness run 3/3.
8. cppa-risk regression run (verify §3).
9. QL2 re-measure {dpia} with SQL + floor (verify §4). STOP on FAIL.
10. Latency ledger + diff-scan proof (verify §6, §7).

## Decisions locked (default from courier options, no user input received)
- Storage: `report_data._staging` (no migration; keeps courier scope tight).
- U4 hand-off: reads U3 output from `_staging.units.u3.keys` (same channel as shared context).

Revert either default in turn 2 if you object; otherwise proceeding as specified.
