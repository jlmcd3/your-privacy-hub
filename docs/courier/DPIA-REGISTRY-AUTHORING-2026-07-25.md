# DPIA-REGISTRY-AUTHORING — Courier Report

**Date:** 2026-07-25T10:39:15Z
**Dispatch:** DPIA-REGISTRY-AUTHORING (first narrow-but-solid non-CPPA product turn; CEO GREEN-LIGHT 2026-07-25 ~10:35Z)
**Turn type:** authoring-only (NO deploy, NO edge-function edits — per CPPA
precedent of authoring separate from wiring)
**Team review:** five-lens (privacy-counsel / UI / tech-writing /
prompt-engineering / CS) — passed at controller review 2026-07-25T10:37Z
**Deliverable:** `supabase/functions/_shared/registry/dpia-verified-authorities.ts`
(`DPIA_VERIFIED_AUTHORITY_VERSION = "dpia-va-w1-2026-07-25"`)

---

## 1. Sources of truth (approved corpus only)

Two sources, both landed in prior ledger items — nothing pending, nothing
unverified, no `enforcement_actions` rows this turn:

| Source table | Filter | Rows in scope | Ledger reference |
|---|---|---|---|
| `public.provision_texts` | `status='approved' AND key LIKE 'gdpr-%'` | 19 (P1 bootstrap) | Item 38 — `NONCPPA-P1-BATCH-REPORT-2026-07-25.md` |
| `public.edpb_guidelines` | `status='final' AND guideline_ref='EDPB Guidelines 2/2019'` | P2 batch 1 (Guidelines 2/2019 only) | Item 41 — `NONCPPA-P2-BATCH1-2026-07-25.md` |

CEO Ruling 2 (recorded this turn): P4 Member-State `national_provisions`
ingestion is **CANCELLED**. `national_provisions` stays empty; no dependency
here.

---

## 2. Rows authored — 27 total (all green pin-test)

Row shape follows `admt-verified-authorities.ts` / `risk-verified-authorities.ts`
exactly (see `supabase/functions/_shared/verified-authority-resolver.ts`).

### Art. 35 — Data protection impact assessment (13 rows)

| `proposition_key` | pinpoint | source |
|---|---|---|
| `dpia_when_required` | GDPR Art. 35(1) | `provision_texts[gdpr-art-35]` |
| `dpia_similar_operations` | GDPR Art. 35(1) | `provision_texts[gdpr-art-35]` |
| `dpia_dpo_advice` | GDPR Art. 35(2) | `provision_texts[gdpr-art-35]` |
| `dpia_mandatory_intro` | GDPR Art. 35(3) | `provision_texts[gdpr-art-35]` |
| `dpia_mandatory_evaluation` | GDPR Art. 35(3)(a) | `provision_texts[gdpr-art-35]` |
| `dpia_mandatory_special_categories` | GDPR Art. 35(3)(b) | `provision_texts[gdpr-art-35]` |
| `dpia_mandatory_public_monitoring` | GDPR Art. 35(3)(c) | `provision_texts[gdpr-art-35]` |
| `dpia_min_content_intro` | GDPR Art. 35(7) | `provision_texts[gdpr-art-35]` |
| `dpia_content_description` | GDPR Art. 35(7)(a) | `provision_texts[gdpr-art-35]` |
| `dpia_content_necessity` | GDPR Art. 35(7)(b) | `provision_texts[gdpr-art-35]` |
| `dpia_content_risks` | GDPR Art. 35(7)(c) | `provision_texts[gdpr-art-35]` |
| `dpia_content_measures` | GDPR Art. 35(7)(d) | `provision_texts[gdpr-art-35]` |
| `dpia_review_on_change` | GDPR Art. 35(11) | `provision_texts[gdpr-art-35]` |

### Art. 5 principles (3 rows, assessed dimensions)

| `proposition_key` | pinpoint | source |
|---|---|---|
| `principle_lawfulness_fairness_transparency` | GDPR Art. 5(1)(a) | `provision_texts[gdpr-art-5-1-a]` |
| `principle_purpose_limitation` | GDPR Art. 5(1)(b) | `provision_texts[gdpr-art-5-1-b]` |
| `principle_data_minimisation` | GDPR Art. 5(1)(c) | `provision_texts[gdpr-art-5-1-c]` |

### Art. 6(1)(f), 9(1), 25, 28, 30, 32 (8 rows)

| `proposition_key` | pinpoint | source |
|---|---|---|
| `lawful_basis_legitimate_interests` | GDPR Art. 6(1)(f) | `provision_texts[gdpr-art-6-1-f]` |
| `special_categories_prohibition` | GDPR Art. 9(1) | `provision_texts[gdpr-art-9-1]` |
| `data_protection_by_design` | GDPR Art. 25(1) | `provision_texts[gdpr-art-25]` |
| `processor_sufficient_guarantees` | GDPR Art. 28(1) | `provision_texts[gdpr-art-28]` |
| `processor_written_contract` | GDPR Art. 28(3) | `provision_texts[gdpr-art-28]` |
| `processor_documented_instructions` | GDPR Art. 28(3)(a) | `provision_texts[gdpr-art-28]` |
| `processor_assists_articles_32_36` | GDPR Art. 28(3)(f) | `provision_texts[gdpr-art-28]` |
| `ropa_controller_record` | GDPR Art. 30(1) | `provision_texts[gdpr-art-30]` |
| `security_appropriate_measures` | GDPR Art. 32(1) | `provision_texts[gdpr-art-32]` |

### EDPB Guidelines 2/2019 — Art. 6(1)(b) necessity (2 rows)

| `proposition_key` | pinpoint | source |
|---|---|---|
| `edpb_2_2019_necessity_test` | EDPB Guidelines 2/2019, § 2.4 | `edpb_guidelines[2/2019 / 2.4 Necessity]` |
| `edpb_2_2019_useful_not_necessary` | EDPB Guidelines 2/2019, § 2.4 | `edpb_guidelines[2/2019 / 2.4 Necessity]` |

`KNOWN_PARAPHRASED_KEYS` is EMPTY on entry (authoring rule).

---

## 3. Deterministic pin-test output (green)

Script: parse each `verbatim_quote` in the registry, look up the matching
approved corpus row(s) by `key`/`section_heading`, assert `quote in text`
(byte-exact substring, including curly quotes and semicolons/terminators).

```
PASS: 27   FAIL: 0
  ✓ dpia_when_required                           <- provision_texts[gdpr-art-35]
  ✓ dpia_similar_operations                      <- provision_texts[gdpr-art-35]
  ✓ dpia_dpo_advice                              <- provision_texts[gdpr-art-35]
  ✓ dpia_mandatory_intro                         <- provision_texts[gdpr-art-35]
  ✓ dpia_mandatory_evaluation                    <- provision_texts[gdpr-art-35]
  ✓ dpia_mandatory_special_categories            <- provision_texts[gdpr-art-35]
  ✓ dpia_mandatory_public_monitoring             <- provision_texts[gdpr-art-35]
  ✓ dpia_min_content_intro                       <- provision_texts[gdpr-art-35]
  ✓ dpia_content_description                     <- provision_texts[gdpr-art-35]
  ✓ dpia_content_necessity                       <- provision_texts[gdpr-art-35]
  ✓ dpia_content_risks                           <- provision_texts[gdpr-art-35]
  ✓ dpia_content_measures                        <- provision_texts[gdpr-art-35]
  ✓ dpia_review_on_change                        <- provision_texts[gdpr-art-35]
  ✓ principle_lawfulness_fairness_transparency   <- provision_texts[gdpr-art-5-1-a]
  ✓ principle_purpose_limitation                 <- provision_texts[gdpr-art-5-1-b]
  ✓ principle_data_minimisation                  <- provision_texts[gdpr-art-5-1-c]
  ✓ lawful_basis_legitimate_interests            <- provision_texts[gdpr-art-6-1-f]
  ✓ special_categories_prohibition               <- provision_texts[gdpr-art-9-1]
  ✓ data_protection_by_design                    <- provision_texts[gdpr-art-25]
  ✓ processor_sufficient_guarantees              <- provision_texts[gdpr-art-28]
  ✓ processor_written_contract                   <- provision_texts[gdpr-art-28]
  ✓ processor_documented_instructions            <- provision_texts[gdpr-art-28]
  ✓ processor_assists_articles_32_36             <- provision_texts[gdpr-art-28]
  ✓ ropa_controller_record                       <- provision_texts[gdpr-art-30]
  ✓ security_appropriate_measures                <- provision_texts[gdpr-art-32]
  ✓ edpb_2_2019_necessity_test                   <- edpb_guidelines[EDPB Guidelines 2/2019 / 2.4 Necessity]
  ✓ edpb_2_2019_useful_not_necessary             <- edpb_guidelines[EDPB Guidelines 2/2019 / 2.4 Necessity]
```

---

## 4. Propositions with NO anchor — write-around targets for the wiring turn

Per NARROW-BUT-SOLID rule, any DPIA report proposition with no anchorable
corpus support gets NO registry row. These are exported from the registry
file as `DPIA_UNANCHORED_PROPOSITIONS` for the wiring turn to plan around
(generator restructures to assert only what is anchorable; unresolved-key
telemetry routed to `_meta.internal`; **NEVER** "information needed" in
customer-visible output for citation gaps — LEAK-PREV P2 rule).

| Key | Why unanchored | Recommended write-around |
|---|---|---|
| `prior_consultation_art_36` | GDPR Art. 36 not in P1-approved set (19 rows). | Wiring turn: either add Art. 36 to next `provision_texts` batch (P1 supplemental) or downgrade the current DPIA "Prior consultation" section to a heading-only pointer without conclusory claims. |
| `dpo_designation_art_37_39` | Arts. 37-39 not in P1-approved set. | Wiring turn: same as above — corpus supplement OR restructure DPO subsection to reference `dpia_dpo_advice` (Art. 35(2)) only. |
| `risk_severity_edpb_wp248` | WP248 not in P2 batch 1 (2/2019 only). | Wiring turn: queue WP248 for a future P2 batch; until then, generator uses no severity taxonomy. |
| `high_risk_criteria_edpb_wp248` | WP248 not in P2 batch 1. | Same as above. |
| `consultation_of_data_subjects_35_9` | Art. 35(9) IS in corpus but is discretionary ("Where appropriate"). Anchoring conclusory customer-facing claims to a discretionary provision is unsafe. | Wiring turn: emit only as a conditional recommendation gated on a fact-ledger signal; do NOT wire as an authority-bearing citation. |

---

## 5. Recommended wiring scope (QUEUE — do NOT execute this turn)

**Follow-on:** `DPIA-REGISTRY-WIRING` deploy turn on
`supabase/functions/run-dpia-framework/`. Sequenced after wave-21 digest and
CEO-visible courier review.

Scope should include:
1. Import `DPIA_VERIFIED_AUTHORITIES` and validate via
   `verified-authority-resolver.ts` on cold-start.
2. Adopt LEAK-PREV P0 (`customer-messages.ts`), P1 (`emit-gate.ts`), and P2
   (`report-serialize.ts`) end-to-end on `run-dpia-framework`.
3. Restructure the generator to assert only propositions with an anchor in
   `DPIA_VERIFIED_AUTHORITIES`; write-around the five unanchored keys above.
4. Retro-audit the last N `dpia_frameworks` documents against the new
   registry and emit an offending-cite drift ledger.
5. Bump `DPIA_VERIFIED_AUTHORITY_VERSION` when any row is added/edited;
   grader may pin against it (mirrors risk / ADMT convention).

---

## 6. CEO rulings recorded this turn (ledger)

- **Ruling 1 RESOLVED** — `enforcement_actions` eligibility bar = adopt the
  inventory's recommended tiering (quote-safe / row-grounded / ineligible,
  per `docs/courier/NONCPPA-CORPUS-INVENTORY-2026-07-25.md`). Shared
  eligibility helper to be built in the future enforcement-wiring turn,
  **NOT this turn**.
- **Ruling 2 RESOLVED** — Ingestion P4 (Member-State `national_provisions`)
  **CANCELLED**. CEO clarified corpus intake is EDPB + already-held EU/UK
  GDPR text only; no national-statute ingestion. `national_provisions` stays
  empty; remove P4 from plan sequencing.
- **First narrow-but-solid product turn** = GREEN-LIT (this dispatch).

---

## 7. Guardrails honored

- No deploys, no edge-function edits, no rubric/grader/golden/contract/prompt
  changes.
- Only files touched: the new registry data file, this courier report,
  `docs/pipeline-state.md` (§2 ledger append; P4 references marked
  CANCELLED).
- All stamps from re-read sandbox clock (2026-07-25T10:39:15Z).
- Wave 21 (~11:15Z) — no deploy in this turn, no collision risk.
