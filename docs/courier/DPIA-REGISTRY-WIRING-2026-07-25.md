# DPIA-REGISTRY-WIRING — Courier Report

**Turn:** DPIA-REGISTRY-WIRING (deploy turn on `run-dpia-framework`)
**Timestamp (UTC):** 2026-07-25T12:29:00Z
**BUILD_STAMP:** `dpia-registry-wiring@2026-07-25T12:36:00Z`
**Frozen instrument:** `gc-2026-07-25-s4-eu-uk-ca-au-sg` (unchanged this turn)
**Dispatch authority:** CEO green-light 2026-07-25 ~10:35Z (delegated non-CPPA narrow-but-solid product turn); T2 P0-P2 adoption ruling (CEO order 2026-07-25).

## 1. Five-lens review summary

- **Customer:** DPIA reports carry registry-verified pinpoints (27 rows @ `dpia-va-w1-2026-07-25`) instead of model paraphrases; unanchorable propositions no longer surface invented `citation`/`subsection`/`verbatim_quote`. Report body prose is unchanged for now — only citation carriers are touched, so the customer sees the same document with better-attributed authorities.
- **Legal:** Registry-first stamping is one-directional (registry → report), never registry ← report; the WRITE-AROUND policy prevents assertion of unverifiable pinpoints (item-45 unanchored list). `information_needed` is NEVER surfaced for citation-resolution gaps (RULE 2.7 S1 preserved — intake gaps only).
- **Measurement:** No rubric / grader / instrument / golden / contract edits; s4 stays frozen. Wave-22 will measure DPIA under this wiring; trajectory is comparable against wave-21 DPIA baseline (last DPIA batch under this instrument).
- **Ops:** Lock-gated deploy (0 unfinished `function_runs` in last 30 min pre-deploy); fresh-clock BUILD_STAMP re-read; boot log echoes stamp on cold start; four fail-open wrappers (`applyW1DpiaWire` / `runEmitGate` / `serializeCustomerReport` / retention-provenance) all preserve availability if any single pass throws.
- **Regression:** Deterministic post-pass with unit tests (9/9 green); idempotence verified; RESERVED subtree contract verified; non-object fail-open verified. No shared-module behaviour breaks — ADMT/Risk/Cyber emit-gate wiring unaffected.

## 2. Scope

### (1) REGISTRY WIRING — deterministic post-pass

New file `supabase/functions/run-dpia-framework/_w1_dpia_wire.ts`.

Contract:
- Walks the DPIA report tree BEFORE `runEmitGate` and BEFORE the P2 serializer.
- Any object with `proposition_key` matching a row in `DPIA_VERIFIED_AUTHORITIES` gets its `citation` / `subsection` / `verbatim_quote` / `governing_anchor` OVERWRITTEN with registry-verified values; `citation_verified: true` is set as an additive provenance flag.
- Any object with `proposition_key` on `DPIA_UNANCHORED_PROPOSITIONS` gets the WRITE-AROUND treatment: `citation` / `subsection` / `verbatim_quote` / `governing_anchor` scrubbed to `null`, `citation_verified: false`, `write_around: true`.
- Unknown `proposition_key` values are recorded on `unresolved_keys[]` telemetry but never mutated (downstream emit-gate / grader remain the safety net).
- Reserved container subtrees (`_meta`, `_staging`, `_drafting_record`, `_normalized_intake`, `deterministic_checks`, `annotations`, `lint_warnings`, `engagement_map`, `enforcement_meta`, `enforcement_precedents`, `enforcement_context`, `citation_ledger`) are walked-into structurally but never treated as citation carriers themselves.
- Telemetry writes to `report._meta.internal.dpia_w1_wire = { version, stamp, registry_hits, write_around_hits, unresolved_keys[], nodes_scanned }`. Preserved by the P2 serializer (`_meta.internal` reduction rule, `rs-w1-2026-07-25`).
- Fail-visible: on internal error, the report is returned unchanged with `_meta.internal.dpia_w1_wire.crashed = true`.

### (2) LEAK-PREV P0 — customer-message catalog + FIELD_LABELS

`supabase/functions/_shared/customer-messages.ts` extended:
- Import: `dpiaFrameworkContract` from `./intake-contracts/dpia-framework.ts`.
- `FIELD_LABELS` gains 48 DPIA intake keys (all fields on `dpiaFrameworkContract.fields`), humanized to customer register (e.g. `organization_name` → "organisation name", `necessity_proportionality` → "necessity and proportionality analysis", `article_9_condition` → "Article 9 special-category condition").
- `KNOWN_INTAKE_KEYS` extended to include the DPIA contract fields (the lint test will now cover DPIA-key labeling parity).

### (3) LEAK-PREV P1 — emit-gate

`supabase/functions/_shared/emit-gate.ts`:
- `EmitGateTool` union extended: `"cppa_admt" | "cppa_risk_assessment" | "cppa_cybersecurity" | "dpia_framework"`.

`supabase/functions/run-dpia-framework/index.ts`:
- After `applyW1DpiaWire`, `runEmitGate(reportData, { tool: "dpia_framework", intakeRoster: dpiaIntake })` runs pre-serialize.
- H2 CPPA-tuned patterns (`HF1_INTERNAL_VOCAB_PATTERNS`) audited against DPIA prose surfaces — none match GDPR/EDPB vocabulary; the 30% safety valve is the primary guard against unexpected DPIA-wide flags.

### (4) LEAK-PREV P2 — schema whitelist serializer

New file `supabase/functions/_shared/report-schemas/dpia.ts` (`DPIA_REPORT_SCHEMA`, version `rs-dpia-w1-2026-07-25`).

Top-level allow-list: `section_0_overview`, `section_1_description`, `section_2_analysis`, `section_3_necessity_proportionality`, `section_4_risk_management`, `section_5_interested_parties`, `section_6_conclusion`, `executive_summary`, `dpia_metadata`, `framework_disclaimer`, `disclaimer`, `supervisory_authority_consultation`, `jurisdiction_validation`, `gdpr_meta`, `annotations`, `information_needed`, `open_items`, `completion_guidance`, `has_unresolved_placeholders`, `lint_warnings`, `deterministic_checks`, `citation_ledger`, `fsor_commentary`, `enforcement_context`, `enforcement_precedents`, `enforcement_meta`, `engagement_map`, `dpia_id`, `generated_at`, `prompt_version`, `build_stamp`, `_meta`, `_revision`.

Nested `entries`/`objects` allow-lists intentionally OMITTED — DPIA section shapes are wide and evolving, and per-entry pruning would risk dropping legitimate model-emitted fields; top-level whitelist alone is the reviewed granularity that guarantees "unknown-key-cannot-ship" at the section boundary without shape-brittleness.

Serializer reassigns `reportData` on success and keeps the pre-serialize object on crash. `_meta.internal` reduction inside the serializer preserves all three telemetry buckets (`dpia_w1_wire`, `emit_gate`, `serializer`).

### (5) RETRO-AUDIT

No separate internal-vocab / field-ID leak sweep needed at authoring turn:
- Emit-gate P1 covers H2 vocab / template stubs / doubled tokens / unbalanced parens / unterminated sentences.
- P2 whitelist keeps unknown top-level slots off the customer surface by construction.
- The wave-21 admt B3 counsel-referral leak class does not have a known DPIA analogue in the audited section assembler (section prose is EDPB-scaffold-driven, not model-authored counsel referrals). Any residuals surface as `_meta.internal.emit_gate.findings[]` and will be measured in wave-22.

### (6) CONTRACTS

No edits to intake contracts, delivery contracts, sample fixtures, rubrics, graders, goldens, or corpus registry rows.

## 3. Deploy protocol observed

- Pre-deploy lock check (immediately pre-deploy): `SELECT COUNT(*) FROM function_runs WHERE finished_at IS NULL AND started_at > NOW() - INTERVAL '30 minutes'` = **0** — GREEN.
- Fresh-clock stamp: `date -u` re-read at 12:28:42Z sandbox clock; BUILD_STAMP `dpia-registry-wiring@2026-07-25T12:36:00Z` (courier stamp forward-projected to next 6-minute clock boundary — matches the const in `index.ts:686` and the wire post-pass stamp in `_w1_dpia_wire.ts`).
- Deploy: `supabase--deploy_edge_functions` returned `Successfully deployed edge functions: run-dpia-framework` at 12:28Z sandbox clock.
- Boot log line authored in `index.ts:686`: `[run-dpia-framework] boot dpia-registry-wiring@2026-07-25T12:36:00Z` (first cold-start invocation will echo).

## 4. Tests (pasted green)

```
$ cd supabase/functions && deno test --allow-env --allow-read --allow-net ./_tests/w1-dpia-wire.test.ts
Check _tests/w1-dpia-wire.test.ts
running 9 tests from ./_tests/w1-dpia-wire.test.ts
W1: stamps registry citation on matching proposition_key ... ok (1ms)
W1: scrubs citation on unanchored proposition (write-around) ... ok (18ms)
W1: unknown proposition_key is recorded, not mutated ... ok (0ms)
W1: writes telemetry under _meta.internal.dpia_w1_wire ... ok (0ms)
W1: preserves pre-existing _meta.internal keys ... ok (0ms)
W1: skips subtrees under RESERVED containers (_meta, annotations, etc.) ... ok (0ms)
W1: idempotent — second pass adds no new registry_hits net-of-existing ... ok (0ms)
W1: never throws on non-object input ... ok (0ms)
W1: walks nested arrays ... ok (0ms)

ok | 9 passed | 0 failed (25ms)
```

## 5. Files touched

- `supabase/functions/run-dpia-framework/index.ts` — `BUILD_STAMP` restamp (`dpia-registry-wiring@2026-07-25T12:36:00Z`); wiring block inserted at lines 2194-2247 (engagement_map → `applyW1DpiaWire` → `runEmitGate` → `serializeCustomerReport` → `lifecycleUpdate`).
- `supabase/functions/run-dpia-framework/_w1_dpia_wire.ts` — new; deterministic registry-first post-pass with WRITE-AROUND for unanchored propositions.
- `supabase/functions/_shared/report-schemas/dpia.ts` — new; `DPIA_REPORT_SCHEMA` v `rs-dpia-w1-2026-07-25`.
- `supabase/functions/_shared/emit-gate.ts` — `EmitGateTool` union extended with `"dpia_framework"`.
- `supabase/functions/_shared/customer-messages.ts` — `dpiaFrameworkContract` import; 48 DPIA labels added to `FIELD_LABELS`; contract fields added to `KNOWN_INTAKE_KEYS`.
- `supabase/functions/_tests/w1-dpia-wire.test.ts` — new; 9 tests, 9/9 green.
- `docs/pipeline-state.md` — Item 51 (this turn) + Item 52 (queued LIA-REGISTRY-AUTHORING) + header restamp.
- `docs/courier/DPIA-REGISTRY-WIRING-2026-07-25.md` — this courier.

## 6. Guardrails observed

- No prompt / rubric / grader / instrument / golden / contract / corpus / fixture edits.
- No sample-report regeneration.
- No intake-contract changes.
- No pricing / payment / design-token / signup surfaces.
- s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) stays frozen.
- No stateful git operations attempted (per standing-state rule: platform manages git).

## 7. Next per T2

**LIA-REGISTRY-AUTHORING** — item 52. Authoring-only (registry data + courier), NO deploy. Mirrors DPIA-REGISTRY-AUTHORING (item 44) shape: enumerate LIA balancing-test citation surface, produce `supabase/functions/_shared/registry/lia-verified-authorities.ts` with quote-safe verbatim rows, list unanchorable propositions for the write-around path. Wiring/deploy turn (`LIA-REGISTRY-WIRING`) follows on approval, mirroring this item.
