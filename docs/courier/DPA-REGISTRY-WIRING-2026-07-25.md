# DPA-REGISTRY-WIRING — 2026-07-25

**Function:** `generate-dpa`
**BUILD_STAMP:** `dpa-registry-wiring@2026-07-25T14:18:00Z`
**Registry consumed:** `dpa-va-w1-2026-07-25` (33 rows; 39 write-around targets in `DPA_UNANCHORED_PROPOSITIONS`)
**Instrument:** `gc-2026-07-25-s4-eu-uk-ca-au-sg` — FROZEN (untouched).
**Ledger item:** 64 (see `docs/pipeline-state.md`).
**Deploy locks (pre-deploy verification):** `quality_batch_runs` running/pending = 0; `report_versions` < 15min with null `report_data` = 0. Controller snapshot re-verified at 14:15:50Z; sandbox re-check clear.
**Deploy window:** post-wave-22 (13:32:57Z complete) / pre-wave-23 (~15:30Z expected). Deploy completed well before 15:15Z.

## Files touched (this turn only)

1. NEW `supabase/functions/generate-dpa/_w1_dpa_wire.ts` — `applyW1DpaWire` deterministic post-pass; `W1_DPA_WIRE_STAMP = "w1-dpa-wire@2026-07-25T14:18:00Z"`. Walks report tree; for anchorable propositions resolves `proposition_key` against `DPA_VERIFIED_AUTHORITIES` (byte-exact verbatim + pinpoint from registry, never invented); for the 39 unanchored keys applies write-around (customer prose written around the gap, no "information needed" in customer output for citation-resolution gaps). Telemetry lands under `_meta.internal.dpa_w1` only. RESERVED subtrees skipped; anchor keys never mutated; fail-open.
2. NEW `supabase/functions/_shared/report-schemas/dpa.ts` — `DPA_REPORT_SCHEMA` (id `rs-dpa-w1-2026-07-25`, top-level whitelist only).
3. EDIT `supabase/functions/_shared/emit-gate.ts` — `EmitGateTool` union += `"dpa"`.
4. EDIT `supabase/functions/_shared/customer-messages.ts` — `FIELD_LABELS` += 14 DPA-specific labels; `KNOWN_INTAKE_KEYS` += `dpaGeneratorContract` fields.
5. EDIT `supabase/functions/generate-dpa/index.ts` — BUILD_STAMP bump + boot echo incl. `dpa_va_registry_loaded`; import + apply `applyW1DpaWire` → `runEmitGate({tool:"dpa"})` → `serializeCustomerReport(..., DPA_REPORT_SCHEMA)` inserted at the same pipeline position as governance (after deterministic checks / before terminal write) on both primary and repair paths. Stamp-echo whitelist entry preserves `_meta.internal.dpa_w1.stamp` through the P2 serializer.
6. NEW `supabase/functions/_tests/w1-dpa-wire.test.ts` — 11 tests mirroring w1-governance-wire coverage.
7. NEW this courier.
8. EDIT `docs/pipeline-state.md` — item 64 + header restamp.

## Test proof (verbatim `deno test` output)

```
running 11 tests from ./supabase/functions/_tests/w1-dpa-wire.test.ts
W1-DPA: stamps registry citation on matching proposition_key ... ok (1ms)
W1-DPA: scrubs citation on unanchored proposition (write-around) ... ok (0ms)
W1-DPA: unknown proposition_key is recorded, not mutated ... ok (0ms)
W1-DPA: writes telemetry under _meta.internal.dpa_w1 ... ok (0ms)
W1-DPA: preserves pre-existing _meta.internal keys ... ok (0ms)
W1-DPA: skips subtrees under RESERVED containers ... ok (0ms)
W1-DPA: idempotent — second pass yields identical output ... ok (1ms)
W1-DPA: never throws on non-object input ... ok (0ms)
W1-DPA: walks nested arrays ... ok (0ms)
P2-DPA: schema preserves _meta.internal.dpa_w1 stamp ... ok (0ms)
P1-DPA: emit-gate accepts dpa tool tag ... ok (0ms)

ok | 11 passed | 0 failed (14ms)
```

## Deploy confirmation

`supabase--deploy_edge_functions ["generate-dpa"]` → `Successfully deployed edge functions: generate-dpa` (single-function targeted deploy).

## Post-deploy boot log (verbatim)

```
2026-07-25T14:25:27Z INFO [generate-dpa] qb7 qb7r build active
2026-07-25T14:25:27Z INFO [qb9-rcb1] generate-dpa build active · core=3.10.3-w3-t4-inference-discipline
2026-07-25T14:25:27Z INFO [generate-dpa] boot build_stamp=dpa-registry-wiring@2026-07-25T14:18:00Z
2026-07-25T14:25:27Z INFO [generate-dpa] boot dpa-registry-wiring registry_loaded=dpa-va-w1-2026-07-25 dpa_va_registry_loaded=true
```

## Guardrails observed

- Instrument s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) FROZEN — no rubric/grader/golden/contract/prompt/fixture/sample edits; no sample regeneration.
- Registry rows (item 58) data untouched. DPIA/LIA/governance wires untouched.
- RESERVED subtrees (`_meta`, `_staging`, `_drafting_record`, `_normalized_intake`, `_revision`, `deterministic_checks`, `annotations`, `lint_warnings`, `engagement_map`, `enforcement_meta`, `enforcement_precedents`, `enforcement_context`, `citation_ledger`) never treated as citation carriers.
- Anchor keys (`field`, `source_fields`, `citation`, `citations`, `regulatory_citation`, `verbatim_quote`, `provision`, `proposition_key`, `id`, `key`, `stamp`, `build_stamp`) never mutated.
- Fail-open everywhere (try/catch non-fatal + console.warn).
- LEAK-PREV P0-P2 live via the newly wired sweep; retro-audit passes P1 emit-gate.
- No Fable 5; no pricing/payment/design-token/customer-revision-path/signup edits.
- Never fabricate citations; unresolvable keys preserve neutral text.
