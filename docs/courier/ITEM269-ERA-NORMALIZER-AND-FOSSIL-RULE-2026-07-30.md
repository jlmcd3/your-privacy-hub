# ITEM 269 — ERA NORMALIZER + FOSSIL-NOTE COHERENCE RULE (2026-07-30)

**CEO directive (verbatim, 2026-07-30):** "Keep improving the product and test accordingly. Let me know when we have 100% shippable."

**Scope observed:** `replay-cppa-risk-harness/index.ts`, `_shared/ltp/replay/era-normalize.ts` (NEW), `_shared/ltp/pass1-present-note-coherence.ts` (one rule), `_shared/ltp/item269-era-and-fossil.test.ts` (NEW), this courier, ledger. **NOT touched:** prompts, grounded-note, GTM register/grader, composers, legacy wire, snapshot. **NO harness invocation** — controller reruns.

---

## 1. VERIFY-FIRST (production normalization located, then reused)

| Anchor | File:line | What it establishes |
| --- | --- | --- |
| `resolveIntakeForTestStates` | `supabase/functions/_shared/cppa-risk-normalise.ts:282` | The **only** existing five-stage → flat key-name mapping in the tree. Synthesises `rawForStates` (lines 301–316) with exactly: `q1_revenue`, `q2_consumers`, `q5_sell_share`, `q5c_share_revenue_50pct`, `q15_sensitive_pi`, `q15c_spi_volume`, `q15b_under16_knowledge`, `q5b_profiling_observation`, `q18_admt_use`, `q18b_admt_training`, `exceptions_intake`. |
| `normaliseIntake` / `shimLegacyIntake` | `cppa-risk-normalise.ts:232` / `:83` | Direction is FLAT → five-stage (the legacy wizard shim). Not an inverse mapping; provides no additional flat keys. Discriminator `intake.triggers === undefined` (line 234) reused as the era test. |
| `resolveRevenueBand` / `resolveConsumerBand` | `_shared/bands/revenue-consumer.ts:110` / `:120` | V1→V2 band-label resolution (BAND-REALIGNMENT-T2A), already wired at `cppa-risk-normalise.ts:44` (`computeBandResolution`). |
| Ledger keys | `_shared/ltp/derive.ts` `LEDGER_KEYS` (contract-derived from `cppaRiskContract.fields[].key`) | Reads FLAT keys — the reason era rows produced an empty ledger. |
| Harness load path | `replay-cppa-risk-harness/index.ts` `loadArchivedDoc` / `processDoc` | Normalizer application point: inside `processDoc`, immediately before `modelProvider`. |

## 2. FIX 1 — ERA NORMALIZER (`_shared/ltp/replay/era-normalize.ts`)

`normalizeEraIntake(raw)` — version `era-normalize@2026-07-30-item269`.

- Era detection: `"triggers" in raw` (same discriminator as the production normaliser).
- Port **by reuse**: calls `resolveIntakeForTestStates(raw)` and copies across only those flat keys it synthesises, only when defined and only when not already present on the raw row.
- Band labels: `resolveRevenueBand` / `resolveConsumerBand` applied to the resulting `q1_revenue` / `q2_consumers` when they are not already V2 labels.
- Fail-open: unmapped legacy keys pass through untouched; any internal error returns the raw intake with `applied:false`.
- Modern (already-flat) intakes: returned byte-identical, `applied:false`.

**Telemetry (new key `pass1_usage.intake_era_normalization`):** `{applied, mapped_keys, mapped_key_names, unmapped_legacy_keys, band_labels_resolved, version}`.

**Observed on the real fixture** (doc `89ee89d5-b404-43f1-adb7-918a52d5c30c`, verbatim test output):

```
mapped_key_names: ["q2_consumers","q5_sell_share","q15_sensitive_pi","exceptions_intake"]
band_labels_resolved: ["q2_consumers: Over 10 million -> 1,000,000 or more"]
unmapped_legacy_keys: ["triggers","annual_consumer_volume","org_context","impact","exceptions","activity_details"]
```

### RESIDUAL GAP (reported verbatim, NOT invented)

No existing code maps the narrative contract fields back from the five-stage shape. The following stay **MISSING** on era rows — omission over invention:

- `q1_revenue` — deliberately NOT back-filled from `org_context.annual_revenue_threshold`; RC-A A5 single-truth rule is written into `cppa-risk-normalise.ts:302` (`// RC-A A5: no fallback to org_context.annual_revenue_threshold`). Consequence: the revenue-band and audit-cohort assertions remain unavailable on era rows even though the archived row carries `"$100M–$500M"`.
- `entity_name`, `q3_sector`, `q4_pi_categories`, `i1_processing_purpose`, `i1b_min_pi`, `i2_retention_*`, `i4_disclosure_mechanisms`, `i4b_sources`, `i6_vendors`, `i7_internal_contributors`, `i7_external_consultees`, `i9_*`, `impact_intake`, `q9_opt_out`, `q12_notice_at_collection`, `q16_sensitive_limit`, `q17_sensitive_basis`, `q19_admt_description`, `q20_admt_opt_out` — the five-stage row carries semantically adjacent narrative under `org_context` / `activity_details` / `impact`, but **no existing code establishes those correspondences**, so none were written.

**EXCLUSION (documented, per dispatch):** era docs that still mass-abort after normalization are **excluded from acceptance scoring**. The archive's oldest era (2026-07-11→13) predates the product's current intake contract; SPEC §7 comparability applies to inputs the current product accepts. The 24 modern-era ramp-3 docs remain the acceptance population; the normalizer is a best-effort recovery of the subset the existing mapping reaches, measured by the new telemetry key.

## 3. FIX 2 — FOSSIL NOTE ON PRESENT ROW (`pass1-present-note-coherence.ts`)

New rule, placed **after** the ITEM 243 defect-3 refs rule and **before** the glossary patterns:

```
if (CANONICAL_NO_EVIDENCE.test(note)) → present_in_intake:false, weight_note "no record evidence"
reason: "present row carries the canonical no-evidence note — model's own evidence statement adopted"
field_id: "(weight_note)"
```

`CANONICAL_NO_EVIDENCE = /^\s*no record evidence\s*\.?\s*$/i`. Counted in `rewrites`; the mass-absence abort (threshold 0.5) applies unchanged. Version bumped to `pass1-present-note-coherence@2026-07-30-item269-fossil-note-rule`.

This is the deterministic closure of the two modern-era ramp-3 blocks (`5b50f9c6-3e38-4523-ba57-3072c4394a89`, `1036f12c-04be-44f3-ba80-6b72e1fdda30`), whose material defect was `note_specificity:fossil_no_record_evidence` on `neg.d.coercion_dark_patterns` (and `neg.e.economic_harms` on the second).

## 4. FOUR-LENS REVIEW

- **Legal:** no legal content changed. Absent rows carry no assertion; adopting the model's own no-evidence statement can only *reduce* unsupported assertion. Band resolution is the already-ratified V1→V2 statutory-line mapping.
- **Prose:** no new customer-facing text. `"no record evidence"` is the pre-existing canonical note.
- **Product:** era rows that the existing mapping can reach now enter Pass-1 with a non-empty ledger; unreachable rows fail loudly as before and are excluded from acceptance scoring with the exclusion recorded here.
- **Engineering:** additive module; fail-open at every branch; harness-only application point (the legacy production wire is untouched). Telemetry-first — the normalizer's effect is measurable per doc before any acceptance claim rests on it.

## 5. TESTS (verbatim)

```
running 6 tests from ./_shared/ltp/item269-era-and-fossil.test.ts
item269 fix1 — era intake gains mapped modern keys via the reused production mapping ... ok (1ms)
item269 fix1 — unmapped legacy keys pass through untouched; no invention ... ok (0ms)
item269 fix1 — modern flat intake is returned untouched ... ok (0ms)
item269 fix2 — present row carrying the canonical no-evidence note is rewritten to absent ... ok (0ms)
item269 fix2 — normal present rows and already-absent rows are untouched ... ok (0ms)
item269 fix2 — fossil-note rewrites count toward the mass-absence rate ... ok (0ms)
ok | 6 passed | 0 failed (7ms)
```

Full `_shared/` regression: **510 passed | 6 failed (10s)**. The six failures are PRE-EXISTING and untouched by this turn (none imports `pass1-present-note-coherence.ts` or `replay/era-normalize.ts`):

```
CP5-CP: (a) RISK_OPENING_SLOT_ORDER is S2→S3→S4→S0→S1→S5→S6 => ./_shared/legal-test/cp5-coherence-prose.test.ts:34:6
241.1 (E1): scope_and_triggers emits five instances and engaged prongs LEAD => ./_shared/legal-test/item241-1-structural.test.ts:36:6
241.1 (E2): aggregateBalance insufficiency is documentation-gate driven — factor absence alone is NOT insufficient => ./_shared/legal-test/item241-1-structural.test.ts:84:6
content: pass2 templates present with expected ids => ./_shared/ltp/content/content.test.ts:35:6
value-screen: version stamp (Item 237) => ./_shared/ltp/value-screen.test.ts:13:6
all 34 templates enumerated (ITEM 241.3 adds 7: ...) => ./_shared/ltp/waveb.test.ts:93:6
```

## 6. DEPLOY

`replay-cppa-risk-harness` ONLY. Build stamp `replay-cppa-risk-harness-2026-07-30-item269`. Deployed 2026-07-30T05:19Z. No harness invocation.
