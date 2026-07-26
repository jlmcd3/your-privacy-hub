# LTP-LIA-PHASE-1 — Courier (Ledger item 138)

**Dispatch:** LEGAL-TEST-PIPELINE-LIA-PHASE-1 (GDPR trial; authoring-only, `run-li-assessment` untouched).
**Legal-Test rev:** v2.3 (federal-qualification; GDPR products admit NO U.S. material in any tier).
**Stamp:** 2026-07-26T09:01:46Z.
**Deploy:** NONE. Data + tests only. Phase 2 (wiring + deploy + pilot) awaits controller dispatch.

---

## §1. Corpus prep

| Source | Corpus row | State this turn |
|---|---|---|
| GDPR Art 6(1)(f) verbatim | `provision_texts.gdpr-art-6-1-f` | Pre-existing (P1), status `approved`. Verified. |
| GDPR Recital 47 verbatim | `provision_texts.gdpr-recital-47` | **INGESTED this turn** from EUR-Lex OJ L 119, 4.5.2016 (verbatim). Classified as REGULATION TEXT (not regulator guidance) — within the CEO's EDPB-only guidance ruling. Corpus row confirmed `status='approved'`, `jurisdiction='EU'`. |
| EDPB Guidelines 1/2024 (Legitimate Interests) | `edpb_guidelines` | 106 rows, all `status='final'`, `excerpt_text_norm` populated. **KNOWN GAP:** every row has `section_heading IS NULL` (coarse-indexed at ingestion). Pinpoint anchors in the factor registry + candidate index use `page_ref: null` with anchor-hint fragments already present in the excerpts. Logged to T5 as ranked re-ingestion candidate. |
| Adjacent EDPB families (2/2019, 05/2020, WP248, WP260) | `edpb_guidelines` | Available, `status='final'`. Used at **supporting tier** for boundary/adjacency reasoning (contract boundary, consent boundary, DPIA risk-severity, transparency/knowability). |
| Enforcement analogies (Art 6(1)(f)-tagged DPA rulings) | `enforcement_actions` | **EMPTY BY FINDING at binding tier**: candidate rows exist (Spain AEPD, Greece HDPA, others) but NONE are `verification_status='verified'`. Registry discipline blocks binding-tier use until verification runs land. Candidate index's `enforcement_action_edpb_analogy` bucket is empty by construction; T5 flag written. |
| ICO guidance | — | **DEFERRED** per item 136 CEO ruling. UK-tagged units render with LIMITED-GUIDANCE DISCLOSURE (see `G.uk_unit.limited_guidance_disclosure`). |

Recital-47 sourcing record retained: verbatim body fetched from EUR-Lex; ingested into `provision_texts` with `jsonb_build_object` payload identifying source, illustrations, exclusions, classification, and ingestion turn id.

---

## §2. Conclusion inventory — `_shared/legal-test/lia-conclusions.ts`

| id | R/W/J | Surface | Anchor | Notes |
|---|---|---|---|---|
| `r.lawfulness.li_available` | R | lawfulness | Art 6(1)(f) + Recital 47 | Availability gate. |
| `r.public_authority.exclusion` | R | lawfulness | Recital 47 (final sentence) + Art 6(1) closing para | Deterministic suppression. |
| `r.special_category.exclusion` | R | lawfulness | Art 6(1)(f) + Art 9 | Art 9(2) condition required additionally. |
| `r.necessity.precedes_balancing` | R | necessity | Art 6(1)(f) | Ordering gate. |
| `r.purpose.presence` | R | purpose | Art 6(1)(f) | Presence-only; adequacy is Type J. |
| `r.right_to_object.disclosure` | R | safeguards | Art 6(1)(f) → Art 21(1) | Mandatory surface. |
| `w.purpose.legitimacy` | W | purpose | Art 6(1)(f) | test.gdpr-6-1-f.purpose_legitimacy |
| `w.necessity.least_intrusive` | W | necessity | Art 6(1)(f) | test.gdpr-6-1-f.necessity |
| `w.balance.rights_not_overridden` | W | balancing | Art 6(1)(f) + Recital 47 | test.gdpr-6-1-f.balance (three-part-test core) |
| `j.validity_determination` | J | closing | Art 6(1)(f) | Reserved to customer + counsel (item 136). |
| `j.purpose_adequacy` | J | purpose | Art 6(1)(f) | Reserved. |
| `j.safeguard_sufficiency` | J | safeguards | Art 6(1)(f) | Reserved. |

All `jurisdiction_tag = "gdpr-eu"`; UK-sub-tag units reuse via the render-time UK-limited-guidance gate. **Zero U.S./CA references** (V3/V8 verified in test suite).

---

## §3. Factor registry — `_shared/factors/lia-factors.ts`

Three weighing tests declared:

- `test.gdpr-6-1-f.purpose_legitimacy` — 3 factors (`purpose.lawful`, `purpose.clearly_articulated`, `purpose.real_and_present`).
- `test.gdpr-6-1-f.necessity` — 3 factors (`necessity.targeted`, `necessity.least_intrusive_means`, `necessity.proportionate_scope`).
- `test.gdpr-6-1-f.balance` — 11 factors across five kinds: reasonable_expectation (2), relationship_context (2), nature_of_data (2), impact (3), safeguard (4).

Every factor row carries:
- **binding-tier anchor** — either `gdpr-art-6-1-f` or `gdpr-recital-47` (verbatim excerpt in-row);
- **guidance_refs[]** — one or more EDPB Guidelines 1/2024 anchor hints (binding EU tier);
- **empty_by_finding** — set on 8 of 17 factors where EDPB 1/2024's coarse indexing prevents a per-sub-factor pinpoint. All 8 gaps logged to the T5 empty-by-finding feed (this courier is the receipt).

Recital 47's status as regulation text is explicitly recorded in the factor registry file header.

---

## §4. Gate registry — `_shared/gates/lia-gates.ts`

8 gates: `G.necessity.precedes_balancing`, `G.special_category.exclusion`, `G.public_authority.exclusion`, `G.lawfulness.li_available`, `G.purpose.presence`, `G.right_to_object.disclosure`, `G.child_data.heightened_weight`, `G.uk_unit.limited_guidance_disclosure`. Structure mirrors `cppa-risk-gates.ts` (intake_fields, on_block, anchor_pinpoint). UK-unit gate is the render-time disclosure enforcer for item 136 ICO deferral.

---

## §5. Pass-G candidate index — `_shared/pass-g/lia-candidate-index.ts`

Three slices (one per weighing test). Counts:

- `purpose_legitimacy`: 3 candidates (1 primary EDPB + 2 supporting boundaries).
- `necessity`: 2 candidates (2 primary EDPB).
- `balance`: 7 candidates (5 primary EDPB + 2 supporting EDPB). **Enforcement-analogy tier empty by finding** (verified rows unavailable — T5).

Every candidate `authority_weight = "binding"`; no persuasive tier exists for GDPR products (test `LIA V8` asserts this rejection). Zero U.S./CA entries.

---

## §6. Schema + validators — reuse

Shared render-plan modules reused unchanged in behaviour. Two schema widenings (data-only, no logic change):

1. `RenderPlan.product` widened from literal `"cppa-risk-assessment"` to include `"li-assessment"` (and a fallback string) so LIA plans satisfy typechecks.
2. `WeighingFrameEntry.source` widened to include `"edpb_guideline"` and `"enforcement_action_edpb_analogy"` so GDPR-domain frame entries can be authored without CPPA-only source literals.

Validators (V1–V8) unchanged — they remain product-agnostic and are driven by `jurisdiction_tag`.

---

## §7. Test output (PASTED)

```
running 9 tests from ./_shared/render-plan/validators.lia.test.ts
LIA V3: gdpr-eu plan rejects a cppa-ca citation binding ... ok (0ms)
LIA V3: gdpr-eu plan rejects us-federal anchor (no U.S. bridge for GDPR) ... ok (0ms)
LIA V8: authority-weight — persuasive tier is unavailable on GDPR plans (no bridge) ... ok (1ms)
LIA V5: candidate closure — weighing_frame entry must belong to a known LIA test id ... ok (0ms)
LIA V4: guidance-closure passes with same-domain EDPB guidance ... ok (0ms)
LIA V6: Type-R propositions carry polarity ... ok (0ms)
LIA V7: Type-W factor completeness — three-kind coverage is checked ... ok (0ms)
LIA E2E: validateRenderPlan is clean on well-formed gdpr-eu plan ... ok (0ms)
LIA index: all three weighing tests have candidate slices ... ok (0ms)

ok | 9 passed | 0 failed (8ms)
```

Existing `_shared/render-plan/` validators + LTP integration tests remain green (re-run this turn — no regressions).

---

## §8. Empty-by-finding feed (T5 log)

Ranked ingestion candidates from this turn:

1. **EDPB Guidelines 1/2024 re-ingestion with section headings** (blocks 8 factor-row pinpoints + enables per-sub-factor Pass-G resolution). *Highest impact.*
2. **Verification runs on Art 6(1)(f)-tagged `enforcement_actions`** (Spain AEPD, Greece HDPA, others) — enables the binding-tier enforcement-analogy bucket in the balance slice.
3. **Adjacent-family section indexing** (2/2019, 05/2020, WP248, WP260) — enables supporting-tier pinpoints.
4. **ICO guidance ingestion** — CEO-deferred; when released, retires the UK limited-guidance disclosure.

---

## §9. Zero-side-effect confirmation

Only edits: two shared schema single-line widenings (product union + source union); five new `_shared/*` files (`legal-test/lia-conclusions.ts`, `factors/lia-factors.ts`, `gates/lia-gates.ts`, `pass-g/lia-candidate-index.ts`, `render-plan/validators.lia.test.ts`); one new `provision_texts` row (`gdpr-recital-47`); this courier; `docs/pipeline-state.md` (item 138 + header restamp). NO prompt / rubric / grader / golden / contract / fixture / sample / registry data / corpus edits beyond the Recital-47 ingest and the two-line schema widening; NO edge-function deploy; NO migration; NO `quality_batch` launch; NO BUILD_STAMP bumped; `run-li-assessment` untouched.

**Deviations ruled:** none — turn executed exactly per dispatch. Phase 2 (wiring + deploy + pilot) awaits controller dispatch after CEO-visible Phase-1 courier review AND after the risk trial's Wave A digest is read (per dispatch closing).
