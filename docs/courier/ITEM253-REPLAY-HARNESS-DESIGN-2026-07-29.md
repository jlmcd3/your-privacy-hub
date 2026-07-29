# ITEM 253 — REPLAY HARNESS DESIGN (Stage A)

Date: 2026-07-29
Status: Stage A build LANDED (core modules + deterministic-provider tests). Stage B (archive export + model-provider ramp) NOT started; every model-provider execution is CEO-released.

## Four-lens design record (team-unanimous)

### Computer-science lens
Pure modules under `supabase/functions/_shared/ltp/replay/` — `types.ts`, `providers.ts`, `substance-gates.ts`, `runner.ts`, `side-by-side.ts`. A `Pass1Provider` seam (`(input: DeriveInput) => Promise<Pass1Result>`) is the single injection point: the harness runs identically over `deterministicProvider` (wraps `derivePlan`) for pipeline smoke or `modelProvider` (wraps `runPass1Llm`, verified self-contained: env-gated `LTP_ENFORCE_ENABLED`, `ANTHROPIC_API_KEY`, Single-Writer injection, screens, validators) for real measurement. No wire changes; no new entrypoints; the customer path is untouched.

### Privacy-law lens
No customer-facing surface is created. Harness output is internal telemetry only. Archived intakes are processed in place; harness result records carry doc ids and metrics (`presence_rate`, `shortfall_keys`, hard-failure strings), NOT intake values. No PII is copied out of the archive by any Stage-A module.

### Prompt-engineering lens
The model provider consumes the existing PASS1 prompt and adapter untouched — the harness MEASURES, never MODIFIES, the contract. Any prompt change discovered necessary later is a separate A/B experiment per SPEC §3.7/§7.3 and requires an independent courier.

### Prose lens
No customer prose is authored. Gate evaluators consume existing registries and quotas verbatim: `CPPA_RISK_GOLDEN_QUOTAS`, `KIND_OPENERS`, `evaluateGoldenShape`. The golden-shape hard-assert obligation from SPEC §6, per Ruling A (`docs/courier/ITEM250-RULING-A-GOLDEN-SHAPE-GATE-LOCATION-2026-07-29.md`), lives here in the harness — NOT in the deterministic e2e suite where model-authored richness structurally cannot be produced.

## Stage-A deliverables (this turn)
- `types.ts` — `ReplayDoc`, `Pass1Provider`, `PerDocResult`, `AggregateReport`, `PresenceRateDistribution`, `SideBySideRow`, `SubstanceGateConfig`. No behavior.
- `providers.ts` — `deterministicProvider` (documented pipeline-smoke-only), `modelProvider` (Stage-B only; increments module-scope counter so tests can assert zero invocation).
- `substance-gates.ts` — `presenceRate`, `noteSpecificity`, `actionDiversity`, `goldenShapeHard`, and aggregate `evaluateSubstance`. Presence-band values arrive from Stage-B archive mining; Stage A takes config only, no hardcoded band. Ratified stems (`KIND_OPENERS` values) are exempt from prefix checks per SPEC §6; the evaluator only fails on full stem+label duplication in CONSECUTIVE actions.
- `runner.ts` — `runReplayDoc` (never throws; catches into `hard_failures ["harness_error:<msg>"]`), `runReplayBatch` (aggregates hard-failure counts, per-gate counts, presence-rate distribution min/p25/median/p75/max, side-by-side rows).
- `side-by-side.ts` — `compareDoc(perDocResult, legacyReport)`; tolerates missing legacy keys by recording `legacy_key_missing:<key>` in `deltas.missing_legacy_keys`.
- `replay.test.ts` — DETERMINISTIC-PROVIDER TESTS ONLY. modelProvider MUST NOT be invoked; module-scope call counter enforces this at the end of the suite.

## Stage B scope (declared; NOT started)
- Archive export of cppa-risk intakes (last N shipped runs) with their legacy shipped reports for side-by-side.
- Presence-band mining from archived distributions to populate `SubstanceGateConfig.min_presence_rate`.
- Run-release protocol: every model-provider execution is CEO-released with a cost estimate; ramp 1 → 10 → 50 → full distribution. Each ramp is a separate courier + ledger entry with the aggregate report attached.

## Live-call declaration
No live LLM calls occurred in Stage A. No deploys. No DB writes. No grader edits. Track-1 wire and `supabase/_rebuild-snapshot-item244/` are untouched.
