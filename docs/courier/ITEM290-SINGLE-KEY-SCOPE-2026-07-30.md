# ITEM 290 — SINGLE-KEY SCOPE EMISSION (2026-07-30)

Authority: CEO ruling 2026-07-30 — "emit one key only, and keep the detector
untouched, per the teams' recommendation." Track 2, cppa-risk. The GTM
duplication detector and the grader instrument were NOT touched.

## 1. Renderer evidence (read before any edit)

| Surface | Key read | file:line | Reads BOTH? |
|---|---|---|---|
| On-screen LTP viewer | `scope_and_triggers` first, `scope_confirmation` only as fallback | `src/components/cppa/RiskAssessmentReportLTP.tsx:130` (`report?.scope_and_triggers ?? report?.scope_confirmation`), rendered once at `:191` | No — single `<ListSection>`, one block |
| PDF exporter, LTP branch | `scope_and_triggers` first, `scope_confirmation` only as fallback | `supabase/functions/generate-report-pdf/index.ts:1190-1191` (both coerced), emitted once at `:1249` (`listSection("scope_and_triggers", …, scopeTrig \|\| scopeConf)`) | No — one `<section>` |
| PDF exporter, legacy V4 branch | `scope_confirmation` (legacy OBJECT shape) | `generate-report-pdf/index.ts:1003` | n/a (legacy) |
| CPPA suite PDF (legacy) | `scope_confirmation` object, list fallback to `scope_and_triggers` | `generate-cppa-suite-pdf/index.ts:59-60` | No |
| Legacy result pages | `scope_confirmation` object | `src/pages/CPPARiskAssessmentResult.tsx:328`, `src/pages/CPPASuiteResult.tsx:66` | No |

**Finding:** no customer ever saw the block twice — every renderer emits the
scope section exactly once. The twin was invisible on the shipped surfaces and
visible only to the GTM duplication detector, which blocked correctly.

**Key decision:** the renderers do NOT diverge — both Track-2 surfaces read
`scope_and_triggers` FIRST. The surviving key is therefore
**`scope_and_triggers`**; `scope_confirmation` is retired from Track-2
emission. No minority reader had to be updated.

Content witness: on the standard fixture
`src/test/fixtures/cppa-risk-assembled-report.json`, the two keys are
byte-identical (`JSON.stringify` equal, 847 chars, 6 items) — the retirement
removes a duplicate, never content.

## 2. Emitter changes (old → new)

| File:line | Old | New |
|---|---|---|
| `_shared/ltp/section-shards/cppa-risk.ts:285-296` | `{ key: "scope_confirmation", owner: {…applicability.engaged/not_engaged}, project: projectPropositionsByType("R") }` shard | shard DELETED; ITEM-290 comment block in its place |
| `_shared/ltp/section-shards/cppa-risk.ts:616` (`EXPECTED_EMISSION_MAP`) | `scope_confirmation: "conditional",` | entry DELETED (no stub, fill-or-omit) |
| `_shared/ltp/section-composers/cppa-risk.ts:1536` | `case "scope_confirmation": return composeScope(plan);` | case DELETED — dispatch returns `null` |
| `_shared/ltp/pass2-assembler.ts:235` (`NARRATIVE_CLASS_KEYS`) | `"scope_confirmation",` | DELETED |
| `_shared/ltp/pass2-assembler.ts:693` (degraded-report skeleton) | `scope_confirmation: [],` | DELETED (no empty stub) |

## 3. Serializer (dispatch step 4) — ONE DOCUMENTED DEVIATION

The dispatch directs the P2 whitelist serializer to drop the retired key.
`_shared/report-schemas/cppa-risk.ts` is shared by BOTH engines: the
production Track-1 function imports it at
`supabase/functions/run-cppa-risk-assessment/index.ts:3678-3679`. Deleting
`scope_confirmation` from `topLevel` would strip a LIVE production section from
legacy reports read at `CPPARiskAssessmentResult.tsx:328`,
`CPPASuiteResult.tsx:66`, `generate-cppa-suite-pdf/index.ts:59` — a legacy
behaviour change, which this dispatch forbids.

Resolution implemented: the key is retired from the **Track-2 registry view**
of the schema, not from the legacy whitelist.

- `_shared/report-schemas/cppa-risk.ts:72` — key retained, annotated
  LEGACY-ONLY with the three reader cites and the retirement condition
  ("retire from the whitelist when Track 1 is decommissioned").
- `_shared/ltp/section-shards/cppa-risk.ts` — new export
  `CPPA_RISK_LEGACY_ONLY_KEYS = ["scope_confirmation"]`; `schemaTopLevelKeys()`
  filters it out, so the shard-registry ↔ schema parity invariants
  (`coverageReport`, `deriveTopLevelAllowedKeys`) hold with the twin gone.
- `_shared/report-contracts/cppa-risk-shape.ts:52` — header-map entry retained
  for legacy/pre-fix rows, annotated as retired for Track 2.

Net effect on Track-2 assembled reports: `scope_confirmation` is not emitted at
all, in any form.

## 4. Tests

New — `supabase/functions/_shared/ltp/item290-single-key-scope.test.ts`:
no-twin shard pin, allow-list pin (`deriveTopLevelAllowedKeys` / `shardKeys`),
composer-dispatch-returns-null pin.

Amended — `_shared/legal-test/item241-1-structural.test.ts` (E1): the
"`scope_confirmation` must ship as an array" assertion is replaced by the
no-twin assertion on the assembled report (`hasOwnProperty` false).

Extended — `src/test/cppaRiskViewerPdfParity.test.tsx` (Item-274 five-test
pattern → +5): byte-identical content regression (surviving key == pre-fix
retired key), NO-TWIN PIN, viewer renders the scope block exactly once from the
surviving key, viewer parity pre-fix vs post-fix report (identical text), shape
discriminator unaffected.

### Verbatim output

```
running 3 tests from ./supabase/functions/_shared/ltp/item290-single-key-scope.test.ts
ITEM 290 — no scope_confirmation shard is declared ... ok (3ms)
ITEM 290 — the retired key is absent from every derived allow-list ... ok (0ms)
ITEM 290 — composer dispatch returns null for the retired key ... ok (0ms)

ok | 3 passed | 0 failed (7ms)
```

```
 ✓ src/test/cppaRiskViewerPdfParity.test.tsx (13 tests) 134ms
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

Full `_shared/ltp/` + `_shared/legal-test/` + `report-serialize.tools.test.ts`
run after the fix — remaining failures, ALL pre-existing and none touched this
turn (tolerated inventory per the Item-287 courier, plus two legal-test items
outside that run's scope):

- `content: pass2 templates present with expected ids`
- `ITEM 276: processing narrative and rationale name the primary activity`
- `value-screen: version stamp (Item 237)`
- `all 36 templates enumerated (…)`
- `241.1 (E2): aggregateBalance insufficiency is documentation-gate driven` (aggregateBalance, unrelated to scope)
- `CP5-CP: (a) RISK_OPENING_SLOT_ORDER is S2→S3→S4→S0→S1→S5→S6` (slot-order constant, unrelated to scope)

`241.1 (E1)` — previously failing on the old twin assertion — PASSES with the
no-twin assertion. No test that passed before this turn fails now.

## 5. Deploy

`replay-cppa-risk-harness` deployed (only function deployed). No harness
invocation — the controller runs the batch.

## 6. Double-check

- Detector untouched: `grep` over `_shared/ltp/replay/` and any
  gtm-grader / materiality-register module shows NO diff and no scope-key edit;
  the only `scope_confirmation` hit under `replay/` is the pre-existing test
  fixture `replay/replay.test.ts:140`.
- Grader instrument untouched: `golden-shape-quotas.ts` NOT edited — its
  `scope_confirmation` quota (line 53) is left exactly as-is per the "do not
  touch the instrument" order. It will now report a shortfall observation for a
  key Track 2 no longer emits; flagged for the four lenses as a measurement-only
  follow-up (it is an observation, not the GTM block class).
- Diff limited to: LTP emitters (shards / composers / assembler), the schema +
  shape-contract annotations, viewer-parity and structural tests, the new
  Item-290 test, and docs.
- No prompt change, no validator change, no legacy engine edits, no DPA files.
