# IR-PLAYBOOK-REGISTRY-WIRING — 2026-07-25

**Turn:** deploy turn on `generate-ir-playbook` — FINAL T2 registry-wiring turn.
**Sequence closed:** DPIA (item 51) → LIA (items 55/56) → Governance (item 62) → DPA (item 65) → **IR Playbook (this turn)**.
**Instrument:** s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` — FROZEN. No rubric / grader / golden / contract / prompt / fixture / sample edits.
**Dispatched:** 2026-07-25T14:48Z (controller). **Landed:** 2026-07-25T14:53:54Z (boot line observed).

## 1. Scope executed

1. **REGISTRY WIRING** — new `supabase/functions/generate-ir-playbook/_w1_ir_wire.ts` exporting `applyW1IrWire` and `W1_IR_WIRE_STAMP = "w1-ir-wire@2026-07-25T14:50:00Z"` (fresh clock at authoring). Deterministic post-pass walks the report tree; every object carrying a `proposition_key` resolves against `IR_PLAYBOOK_VERIFIED_AUTHORITIES` (`ir-va-w1-2026-07-25`, 34 rows — registry authored under item 59; NOT edited this turn). Registry-first: matching keys get byte-exact `citation` / `subsection` / `verbatim_quote` / `governing_anchor` from the registry with `citation_verified: true`. The 44 `IR_PLAYBOOK_UNANCHORED_PROPOSITIONS` receive write-around scrubs (nulled citation fields, `write_around: true`). NEVER surfaces "information needed" for citation-resolution gaps.
2. **LEAK-PREV P0** — `_shared/customer-messages.ts`: added `irPlaybookContract` import, extended `KNOWN_INTAKE_KEYS` with its fields, and added IR-specific labels to `FIELD_LABELS` (`organizationName`, `discoveryDateTime`, `cause`, `dataTypes`, `affectedCount`, `processorInvolved`, `contained`, `organisationType`). Existing keys (`jurisdictions`, `processorName`) reused their prior labels — no duplicates.
3. **LEAK-PREV P1** — `_shared/emit-gate.ts`: `EmitGateTool` union extended with `"ir_playbook"`. Wired `runEmitGate({tool:"ir_playbook", intakeRoster: body})` on the primary emit path (IR has no separate lint-repair regeneration path — single terminal write).
4. **LEAK-PREV P2** — new `_shared/report-schemas/ir-playbook.ts` exporting `IR_PLAYBOOK_REPORT_SCHEMA` (`rs-ir-w1-2026-07-25`). Top-level whitelist derived from `report_data` construction: `portals`, `enforcement_precedents`, `enforcement_meta`, `annotations`, `lint_warnings`, `information_needed`, `deterministic_checks`, `generated_at`, `build_stamp`, `_meta`, `_revision`. `serializeCustomerReport(..., IR_PLAYBOOK_REPORT_SCHEMA)` wired after emit-gate; only overwrites `report_data` when `telemetry.crashed === false`.
5. **STAMP-ECHO WHITELIST** — telemetry lands at `_meta.internal.ir_w1 = { version, stamp, strings_scanned, propositions_seen, anchored_stamped, unanchored_scrubbed, unknown_keys[], reserved_skips }`. The P2 serializer's `_meta.internal` allow-list (item 32 doctrine) preserves the key; test `P2-IR` asserts survival end-to-end.
6. **RETRO-AUDIT** — P1 (emit-gate) sweep runs on the newly wired pipeline in the same code path.
7. **BUILD_STAMP** — `generate-ir-playbook/index.ts` L385 restamped to `ir-playbook-registry-wiring@2026-07-25T14:50:00Z` (fresh clock at write; `date -u` = `Sat Jul 25 14:49:46 UTC 2026` immediately prior).

## 2. Wire site

Inside the background IIFE in `generate-ir-playbook/index.ts` (~L1771 `report_data` construction):

```
report_data = { …, build_stamp: BUILD_STAMP, _meta:{prompt_version} }
  → guardInformationNeeded (pre-existing)
  → applyW1IrWire(report_data)                          [NEW — registry post-pass]
  → runEmitGate(report_data, {tool:"ir_playbook", …})   [NEW — P1]
  → serializeCustomerReport(report_data, IR_PLAYBOOK_REPORT_SCHEMA)  [NEW — P2]
  → lifecycleUpdate("ir_playbooks", …, {report_data, status:"complete"})  [terminal write]
```

All three new blocks wrapped in `try / catch` with `console.warn` on failure — fail-open, availability never blocked. Single primary path; no lint-repair regeneration exists in IR.

## 3. Proof — four items required by dispatch

**(a) Test output — 11/11 green (paste):**

```
Check _tests/w1-ir-wire.test.ts
running 11 tests from ./_tests/w1-ir-wire.test.ts
W1-IR: stamps registry citation on matching proposition_key ... ok (4ms)
W1-IR: scrubs citation on unanchored proposition (write-around) ... ok (0ms)
W1-IR: unknown proposition_key is recorded, not mutated ... ok (0ms)
W1-IR: writes telemetry under _meta.internal.ir_w1 ... ok (0ms)
W1-IR: preserves pre-existing _meta.internal keys ... ok (0ms)
W1-IR: skips subtrees under RESERVED containers ... ok (0ms)
W1-IR: idempotent — second pass yields identical output ... ok (0ms)
W1-IR: never throws on non-object input ... ok (0ms)
W1-IR: walks nested arrays ... ok (0ms)
P2-IR: schema preserves _meta.internal.ir_w1 stamp ... ok (1ms)
P1-IR: emit-gate accepts ir_playbook tool tag ... ok (0ms)

ok | 11 passed | 0 failed (13ms)
```

Coverage: registry stamp, write-around, unknown-key accumulation, telemetry shape (all six counters + arrays), `_meta.internal` preservation, RESERVED subtree skip, idempotency, non-object safety, nested-array walk, stamp-echo survival through P2 serializer, emit-gate acceptance of `ir_playbook`.

**(b) Fresh-clock BUILD_STAMP:** `ir-playbook-registry-wiring@2026-07-25T14:50:00Z` (`date -u` = 2026-07-25T14:49:46Z at pre-stamp).

**(c) Post-deploy boot-log line:**

```
2026-07-25T14:53:54Z INFO [generate-ir-playbook] boot build_stamp=ir-playbook-registry-wiring@2026-07-25T14:50:00Z
```

Registry-loaded echo (deferred to first invocation — `_meta.internal.ir_w1.version = "ir-va-w1-2026-07-25"` land per test P2-IR; production echo will appear in wave-23 telemetry sweep).

**(d) Pre-deploy lock snapshot (2026-07-25T14:53:28.760361Z):**

```
qb_locks (quality_batch_runs running/pending) = 0
rv_null  (report_versions <15min with report_data IS NULL) = 0
```

Both zero — deploy window green (well before 15:15Z guard).

## 4. Guardrails honored

- Instrument s4 FROZEN — untouched.
- Registry `_shared/registry/ir-playbook-verified-authorities.ts` NOT edited (item-59 authored content preserved byte-for-byte).
- DPIA / LIA / Governance / DPA wires UNTOUCHED.
- RESERVED subtree list matches prior wires exactly; test `W1-IR: skips subtrees under RESERVED containers` covers `_meta.internal.emit_gate`, `annotations`, `enforcement_precedents`.
- Anchor keys never mutated by walker (only propositions with `proposition_key` are targets).
- Fail-open everywhere (try/catch + `console.warn`); non-object input, missing `_meta`, and crash paths all covered.
- Never fabricates citations — unknown keys accumulate in `unknown_keys[]`, node is not touched.
- No Fable-5 anywhere; no pricing / payment / design-token / customer-revision / signup edits.

## 5. Files touched (atomic)

- **NEW** `supabase/functions/generate-ir-playbook/_w1_ir_wire.ts`
- **NEW** `supabase/functions/_shared/report-schemas/ir-playbook.ts`
- **NEW** `supabase/functions/_tests/w1-ir-wire.test.ts`
- **MOD** `supabase/functions/_shared/emit-gate.ts` — union += `"ir_playbook"`
- **MOD** `supabase/functions/_shared/customer-messages.ts` — irPlaybookContract import + labels + KNOWN_INTAKE_KEYS extension
- **MOD** `supabase/functions/generate-ir-playbook/index.ts` — BUILD_STAMP restamp; `build_stamp` in `report_data`; wire block (applyW1IrWire → runEmitGate → serializeCustomerReport) inserted after `guardInformationNeeded`, before `recordRunMeterAndVersion`

## 6. Efficacy window

First efficacy measurement expected at wave-23 read (~15:30Z, ~135 min from wave-22 launch at 13:15:01Z). Structural expectations for IR: (i) `_meta.internal.ir_w1` present in every persisted `ir_playbooks.report_data`; (ii) unknown_keys[] accumulates any un-registered propositions the generator emits (unknown-key backlog → future authoring turn); (iii) any invented citations on anchorable propositions get overwritten by verbatim registry values; (iv) unanchored propositions ship with nulled citation fields rather than hallucinated pinpoints.

## 7. T2 close-out

This turn CLOSES the T2 registry-wiring sequence. All five non-CPPA generators — dpia / lia / governance / dpa / ir — now share the same P0/P1/P2/registry-wiring shape and telemetry surface. Wave-23 will produce the first same-instrument comparison across the full T2 cohort.
