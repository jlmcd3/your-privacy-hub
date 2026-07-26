# FUTURE-BUILDING F0 — Courier (Ledger item 139)

**Dispatch:** FUTURE-BUILDING-DESIGN + F0-OBSERVATION-LAYER (CEO 2026-07-26).
**Gate:** LTP-RISK-PHASE-2 landed (item 137) — satisfied. LTP-LIA-PHASE-1 authoring (item 138) landed prior to this turn; LIA F0 wiring rides its Phase-2 turn per dispatch.
**Stamp:** 2026-07-26T09:08:39Z.

---

## §1. Design commit

`docs/design/FUTURE-BUILDING.md` — new. Establishes:

- **Principle 1** MEMOIZE THE DERIVATION, NEVER THE PROSE — pattern store holds abstract structure only (propositions, factor tables, gate outcomes, template/variant selections). Compile-time substitution re-injects the current customer's tokens; full validator battery ALWAYS runs.
- **Principle 2** VERSION-PINNED, EPOCH-INVALIDATED — every entry pins {instrument, factor-registry, corpus batch stamps, template registry}; any bump demotes to observation-only until revalidated.
- **Principle 3** PRIVACY POSTURE — store is PI-free by construction; PI-shaped keys hard-rejected at signature time. TEST-data harvesting permitted now; CUSTOMER-run harvesting reserved to the deferred production-feedback design.
- **Principle 4** QUALITY GATE — only validation-passing plans observed; clean-graded promotion; attribution-driven demotion.
- **Phases** F0 observe (built now) → F1 promote at recurrence threshold k (CEO-gated) → F2 semantic bucketing (CEO-gated).

---

## §2. F0 build

### 2.1 Scenario-signature module

`supabase/functions/_shared/future-building/signature.ts`

- SHA-256 hex over a canonical JSON of: product, jurisdiction tags (sorted), enum/band answers (deep-sorted), free-text PRESENCE map, gate outcomes, version tag `sig-v1`.
- Free-text content NEVER hashed — only presence booleans.
- PI-shaped keys (name, email, phone, address, dob, ssn, tax_id, user_id, customer_id, org_id and near-variants) are hard-rejected at compute time.
- Deno-native (Web Crypto SubtleCrypto). Zero deps.

### 2.2 Storage

Migration landed. `public.pattern_observations` created with the columns in the design doc §4. Indexes on `(product, signature)` and `created_at DESC`. RLS enabled; SELECT restricted to admins via `has_role(auth.uid(), 'admin')`; service_role has full access for edge-function writes. Anon has no access. No FK to `auth.users`.

### 2.3 Wiring — risk pipeline

`supabase/functions/run-cppa-risk-assessment/index.ts`:

- New import: `computeScenarioSignature`.
- New emission block sits directly after the LTP shadow-mode block, before the LEAK-PREV-P2 serializer.
- Guard: skip observation when the LTP telemetry is absent OR when validators emitted any error-severity issue. In either case a diagnostic `{ observed: false, reason }` lands under `_meta.internal.future_building`.
- Enum/free-text partitioning: booleans/numbers and strings ≤ 64 chars go to `enums`; longer strings and structured values go to `freeText` (presence-only).
- Registry pinning includes `ltp_stamp`, `legal_test_rev = "v2.3"`, factor/template versions, and the current risk `BUILD_STAMP` as `corpus_batch`.
- Insert is fire-and-forget (`.then()` swallows errors); the run always ships regardless.
- Success telemetry: `_meta.internal.future_building = { observed: true, signature, version: "f0" }`. Console evt `future_building_observed`.
- **NO** pattern serving. **NO** compile-path changes. Observation only.

`BUILD_STAMP` bumped `ltp-risk-p2@2026-07-26T08:50:44Z` → `ltp-risk-p2+fb-f0@2026-07-26T09:08:39Z`. Edge function deployed this turn.

### 2.4 Tests (PASTED GREEN)

`supabase/functions/_shared/future-building/signature.test.ts` — 10 tests including a PROPERTY test that asserts free-text content never appears in the canonical hash-input string:

```
running 10 tests from ./_shared/future-building/signature.test.ts
signature is deterministic across identical inputs ... ok
signature is order-independent for enum + gate maps ... ok
free-text CONTENT does not affect signature — only presence does ... ok
free-text PRESENCE change DOES shift the signature ... ok
enum change shifts the signature ... ok
jurisdiction change shifts the signature ... ok
gate-outcome change shifts the signature ... ok
PI-shaped keys in enums are REJECTED ... ok
PI-shaped keys in freeText are REJECTED ... ok
PROPERTY: canonical hashed string never contains free-text content ... ok
ok | 10 passed | 0 failed
```

---

## §3. LIA emission

Deferred to the LIA Phase-2 wiring turn (per dispatch §2 phrasing "and into lia at its Phase 2"). The signature module is product-agnostic and will accept the LIA product + `gdpr-eu` jurisdiction with no code change.

---

## §4. CEO rulings log (verbatim)

> "FUTURE BUILDING adopted (CEO 2026-07-26): F0 observation layer built into the pipeline from the start; F1/F2 CEO-gated on volume; customer-run harvesting reserved to the production-feedback design; derivation-not-prose + epoch-invalidation principles are standing law."

---

## §5. Zero-side-effect confirmation

Edits this turn: one new design doc; two new `_shared/future-building/*` files; one new migration (`public.pattern_observations` table + indexes + RLS + admin SELECT policy); two edits in `run-cppa-risk-assessment/index.ts` (import + emission block + BUILD_STAMP bump); one edge-function deploy (risk only); this courier; `docs/pipeline-state.md` item 139 + header restamp. NO prompt / rubric / grader / golden / contract / fixture / sample / registry data / corpus edits. NO customer-visible surface changes (telemetry is stripped by LEAK-PREV-P2). NO `quality_batch` launch. `run-li-assessment` untouched. Campaign `fd1be147` remains CEO-paused.

**Deviations ruled:** none — turn executed exactly per dispatch. Migration linter surfaced 62 pre-existing baseline warnings unrelated to this table; new table itself passes with `has_role`-gated admin SELECT and no anon exposure.
