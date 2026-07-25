# Non-CPPA Corpus Usage Inventory

**Prepared:** 2026-07-25T08:42:10Z (sandbox clock, read immediately before write)
**Scope:** Per-table review of every `public.*` table that can serve as a **non-CPPA** authority corpus for the product generators (`generate-ir-playbook`, `run-dpia-framework`, `run-li-assessment`, `generate-dpa`, `run-governance-assessment`, `check-biometric-compliance`, and the registration/RoPA/EU-notice family). CPPA-only corpora (`cppa_authorities`, `cppa_deadlines`, `cppa_source_registry`, `cppa_fsor_commentary`) are covered only where they overlap non-CPPA products (e.g. cross-jurisdictional CCPA references).
**Access:** read-only SQL via managed `psql`; no writes; no deploys; no edits outside `docs/`.
**Reviewers:** privacy-counsel (inventory only, no customer data — public statutory samples + aggregate counts), tech-writing (structure below), prompt-eng (scope locked to one courier doc + one ledger item).

---

## 0. Method

For each table:

1. **Schema summary** — pulled from `information_schema.columns` (key columns and their roles only; full DDL not reproduced).
2. **Row counts + populated-vs-null** — `count(*) FILTER (WHERE …)` on every text-bearing column.
3. **VERBATIM-NESS** — sampled ≥5 rows per table where rows exist. For statutory-text tables (`gdpr_articles`, `gdpr_recitals`, `edpb_guidelines`), a known passage was spot-checked against the official EUR-Lex / EDPB text. For enforcement/guidance tables, the extraction-method field (where present) and prose shape were inspected.
4. **Coverage** — jurisdictions, article ranges, packages, years, states.
5. **Quality/verification** — where the table carries verification metadata.
6. **Fitness tier** — one of:
   - **TIER-1 VERBATIM-PIN** — exact substring registry (CPPA-style `verified-authority-resolver` pattern) is safe.
   - **TIER-2 VERBATIM-EXCERPT** — text is exact source text but PDF-extraction artifacts (line breaks, page numbers, TOC lines) present; safe to pin against a normalized form only.
   - **TIER-3 ROW-GROUNDED FACTS** — cite structured field values only (dates, names, effective dates, thresholds); no direct quoting.
   - **TIER-4 EMPTY / PENDING** — treat as `information_needed` until ingested.
7. **Per-product mapping** — which product surfaces would draw on this table.

All row counts and samples are as of the timestamp at the top of this doc.

---

## 1. Per-table inventory

### 1.1 `gdpr_articles` — **TIER-1 VERBATIM-PIN (EU) / TIER-2 (UK)**

**Schema (12 cols):** `id`, `jurisdiction` (`eu` | `uk`), `article_number`, `article_title`, `chapter`, `body_text`, `source_url`, `content_hash`, `embedding`, `embedding_model`, `created_at`, `updated_at`.
Key columns: `jurisdiction`, `article_number`, `body_text`, `source_url`.

**Rows:** 180 total — 99 `eu`, 81 `uk`. Article ranges: EU 1–99 (complete), UK 1–96 (fits UK-GDPR renumbering; verify 3 missing article slots vs UK-GDPR table before pinning UK cites).
**Populated:** `body_text` non-null / non-empty on 180/180 (0 empty). `body_text` length: min 110, avg 1,921, max 9,423 chars.

**Verbatim-ness:** Spot-checked EU Art. 5, Art. 6, Art. 17, Art. 32 against EUR-Lex 2016/679 consolidated text — exact substring match on the leading clauses ("1. Personal data shall be:", "1. The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay…", "1. Taking into account the state of the art, the costs of implementation…"). PDF-extraction artifacts visible: sub-point letters ("(a)") isolated on their own lines with surrounding blank lines; this is cosmetic but breaks naive `position()`-based substring lookups if the pin includes a sub-point boundary. **Safe pattern:** collapse runs of whitespace + newlines to single spaces before pinning; store the normalized form alongside `body_text`.

**Fitness:** **TIER-1 VERBATIM-PIN for EU** (with whitespace-normalized comparison). **TIER-2 for UK** until the 3 missing article slots are reconciled.

**Per-product mapping:**
- `run-dpia-framework`: Art. 5, 6, 9, 22, 24, 25, 32, 35, 36, 37–39 (DPO), Recital 75/76/91/92 (via `gdpr_recitals`).
- `run-li-assessment`: Art. 6(1)(f) + WP29 three-part test (see `edpb_guidelines`).
- `generate-dpa`: Art. 28 (processor duties), Art. 32, Art. 33 (breach), Chapter V (transfers).
- `generate-ir-playbook`: Art. 33 (72-hr notification), Art. 34 (subject notification).
- `run-governance-assessment`: Art. 5 (accountability), Art. 24, 30 (RoPA), 35 (DPIA), 37 (DPO).

---

### 1.2 `gdpr_recitals` — **TIER-1 VERBATIM-PIN**

**Schema (9 cols):** `id`, `jurisdiction`, `recital_number` (int), `body_text`, `source_url`, `content_hash`, `embedding`, `embedding_model`, `created_at`.
**Rows:** 173. Recital numbers 1–173 (complete). All `body_text` populated.
**Verbatim-ness:** Spot-checked recital 1, 26, 32 against EUR-Lex — exact match. Fewer PDF artifacts than articles (recitals are single-paragraph).
**Coverage caveat:** `jurisdiction` value distribution not surveyed here — verify EU-only vs mixed before injecting into UK-GDPR product surfaces.
**Fitness:** **TIER-1 VERBATIM-PIN**.
**Per-product mapping:** `run-dpia-framework` (R.75/76/84/89/90/91/92 for risk methodology), `run-li-assessment` (R.47 for legitimate-interest reasonable-expectation test), `generate-dpa` (R.81), `generate-ir-playbook` (R.85/86/87/88).

---

### 1.3 `edpb_guidelines` — **TIER-2 VERBATIM-EXCERPT**

**Schema (15 cols):** `id`, `guideline_ref`, `title`, `adopted_date`, `doc_version`, `status`, `related_articles` (text[]), `topic_tags` (text[]), `section_heading`, `excerpt_text`, `source_url`, `content_hash`, `embedding`, `embedding_model`, `created_at`.
**Rows:** 893. `excerpt_text` populated on 893/893. `status`: all 893 = `final`. **`section_heading` is NULL on every sampled row** (verify globally before relying on it for pin narrowing).

**Coverage — top guideline_refs:**
| guideline_ref | rows | topic |
|---|---|---|
| EDPB Guidelines 01/2022 | 157 | right of access / DSAR |
| EDPB Guidelines 07/2020 | 126 | controller / processor / joint-controllers |
| EDPB Guidelines 1/2024 | 109 | Article 6(1)(f) — legitimate interest |
| EDPB Recommendations 01/2020 | 107 | Schrems II supplementary measures |
| WP260 rev.01 | 88 | transparency / privacy notices |
| EDPB Guidelines 05/2020 | 80 | consent |
| EDPB Guidelines 9/2022 | 74 | breach notification |
| EDPB Guidelines 3/2018 | 72 | territorial scope |
| WP248 rev.01 | 46 | DPIA |
| EDPB Guidelines 2/2019 | 34 | Article 6(1)(b) — contract |

Top topic tags (partial): `lawful-basis` 223, `dsar` 157, `data-subject-rights` 157, `right-of-access` 157, `processor` 126, `controller` 126, `joint-controllers` 126, `legitimate-interest` 109, `supplementary-measures` 107, `schrems-ii` 107, `international-transfers` 107, `transparency` 88, `privacy-notice` 88, `consent` 80, `incident-response` 74.

**Verbatim-ness:** Sample excerpts (e.g. Guidelines 1/2024 §2) match the adopted EDPB PDF text but carry heavy PDF-extraction artifacts: cover-page metadata ("Version 1.0 Adopted on 8 October 2024 2 Adopted - version for public consultation EXECUTIVE SUMMARY"), TOC lines ("I. Introduction ..................... 4 II. …"), and mid-sentence page-break debris. Chunks are paragraph-scale (not sentence-scale). **Pin pattern:** normalized-whitespace substring match against a per-guideline concatenated text; do NOT pin across sub-chunks; skip rows whose `excerpt_text` matches the TOC signature (`\.{5,}\s*\d+`).

**Fitness:** **TIER-2 VERBATIM-EXCERPT** with normalization + TOC-row filter. Would upgrade to TIER-1 once (a) `section_heading` is populated and (b) TOC/cover-page rows are excluded at ingest.

**Per-product mapping:** `run-li-assessment` (Guidelines 1/2024, WP217 successor), `generate-dpa` (Guidelines 07/2020 for processor + joint-controller anchors), `generate-ir-playbook` (Guidelines 9/2022 for breach), `run-dpia-framework` (WP248 rev.01), `run-governance-assessment` (WP260 rev.01 transparency), Schrems II transfer sections (Recs. 01/2020) for any transfer-mechanism surface.

---

### 1.4 `enforcement_actions` — **TIER-3 ROW-GROUNDED (default) / TIER-2 (verified only)**

**Schema (70 cols, key subset):** `id`, `etid`, `regulator`, `subject`, `jurisdiction`, `violation`, `law`, `fine_amount` / `fine_eur` / `fine_eur_equivalent`, `decision_date`, `source_url`, `sector`, `action_type`, `data_categories` (text[]), `violation_types` (text[]), `industry_sector`, `key_compliance_failure`, `preventive_measures`, `tool_relevance` (text[]), `breach_related` / `biometric_related` / `dpa_related` booleans, `raw_text`, `statutory_provisions` (text[]), `statutory_provisions_extraction_method`, `disposition_type`, `appeal_status`, plus (not in `information_schema` output but referenced in dispatch) `verification_status`, `fine_verified`, `source_document_text`, `memo_eligible`.

**Rows:** 5,480.

**Verification distribution:**
| verification_status | rows |
|---|---|
| unverified | 3,007 |
| requires_review | 2,260 |
| failed | 176 |
| verified | 37 |

`fine_verified = true` on 5,477/5,480 (nearly universal — that flag is NOT a proxy for row provenance; it just says the numeric fine parsed).
`source_document_text` populated on **2,092** rows (verified 14 / requires_review 58 / failed 91 / **unverified 1,929**). `memo_eligible = true` on 1,804.

**Statutory-provisions extraction method:**
| method | rows |
|---|---|
| no_pattern_found | 2,081 |
| pattern_per_regulator_verified | 1,770 |
| none | 1,162 |
| pattern_per_regulator_verified_kcf_unverified | 207 |
| source_extracted | 94 |
| candidate_unverified | 85 |
| pattern_per_regulator | 79 |
| regex_high_confidence | 2 |

Only **1,864** rows (`pattern_per_regulator_verified` + `source_extracted` + `regex_high_confidence`) carry statutory-provisions extractions we can cite by article without further review; ~3,616 rows would need row-grounded (non-quoted) treatment.

`key_compliance_failure` populated on 3,311. `preventive_measures` populated on 3,311. `raw_text` populated on 3,345. `tool_relevance` non-empty on 3,199. `statutory_provisions` non-empty on 2,263.

**Coverage — top jurisdictions (of 5,480):** Spain 1,175, Poland 733, Italy 549, Alberta 430, Romania 294, United States 232, Germany 218, Canada 141, Hungary 121, California 102, Belgium 98, Illinois 97, Greece 96, Denmark 92, Czech Republic 87. Long tail into ~40 jurisdictions.
**Coverage — years:** 2017: 10, 2018: 17, 2019: 170, 2020: 389, 2021: 495, 2022: 570, 2023: 596, 2024: 333, 2025: 316, 2026: 215.

**Verbatim-ness:** `violation`, `key_compliance_failure`, `preventive_measures` are LLM-enrichment paraphrases (see `enrichment_version` column) — NEVER quote directly. `source_document_text` is the extracted decision PDF text (unnormalized) — verbatim substring-eligible only for the 14 `verified` rows without further human review; unverified `source_document_text` (1,929 rows) MAY contain OCR/format errors and unrelated boilerplate.

**Recommended eligibility bar for citation** (also in §3):
- **Quote-safe (TIER-2 VERBATIM-EXCERPT):** `verification_status='verified'` AND `source_document_text IS NOT NULL` — **14 rows**. Pin against normalized `source_document_text`; cite by `etid` + `source_url`.
- **Row-grounded facts (TIER-3):** `verification_status IN ('verified','requires_review')` — **2,297 rows**. Cite `regulator` + `decision_date` + `fine_eur` + `statutory_provisions` (when `_extraction_method` is one of the three trusted values); NO direct quotation of `violation` / `key_compliance_failure` / `preventive_measures`.
- **Ineligible for any citation:** `verification_status IN ('unverified','failed')` — **3,183 rows**. Even with `source_document_text` populated, source is not confirmed to match the decision.

**Fitness:** **TIER-3 by default, TIER-2 for the 14-row verified-with-source-text subset.**

**Per-product mapping:** `generate-ir-playbook` (breach precedents where `breach_related=true`), `run-li-assessment` (LI regulator positions where `tool_relevance` contains `li`), `run-governance-assessment` (accountability failures), `check-biometric-compliance` (`biometric_related=true`), `generate-dpa` (`dpa_related=true`). **All uses must respect the eligibility bar above** — the current 176 "failed" and 3,007 "unverified" rows are exactly the type case for the ADMT/Risk hallucination class the LEAK-PREV program addresses.

---

### 1.5 `legislation_bills` — **TIER-3 ROW-GROUNDED**

**Schema (24 cols):** `id`, `source`, `external_id`, `jurisdiction`, `iso2`, `jurisdiction_slug`, `region`, `bill_name`, `bill_number`, `stage`, `summary`, `key_provisions` (text[]), `source_url`, `source_name`, `introduced_at`, `source_last_action_at`, `last_seen_at`, `last_changed_at`, `status` (`active` | `stale`), `raw_payload` (jsonb), `matched_keywords` (text[]), `created_at`, `updated_at`, `feed_promoted_at`.

**Rows:** 399 (371 active, 28 stale). `summary` populated 398/399; `raw_payload` populated 399/399.
**Stages:** committee 198, introduced 146, enacted 51, proposed 2, withdrawn 2.
**Top jurisdictions:** United States 220, Brazil 80, European Union 59, United Kingdom 8, California 8, Kentucky 4, Utah 3, plus long tail.

**Verbatim-ness:** `summary` is aggregator-generated (LegiScan / national feeds), NOT the bill text. `raw_payload` may carry the source-provided bill title and status metadata; the bill text itself is not stored. **Do not quote `summary`.**

**Fitness:** **TIER-3 ROW-GROUNDED**. Cite `bill_name` + `bill_number` + `stage` + `last_changed_at` + `source_url`; label as "pending / in transition" for any stage other than `enacted`.

**Per-product mapping:** Weekly Brief / horizon-intelligence surfaces (not a per-product corpus); may inform "monitoring items" callouts in `run-governance-assessment` and `generate-ir-playbook` state-selection surfaces. NOT a substantive authority for any obligation.

---

### 1.6 `regulator_profiles` — **TIER-3 ROW-GROUNDED (config/metadata table)**

**Schema (21 cols):** ingestion-configuration table (canonical_name, jurisdiction, regulatory_family, law_canonical, default_language, date_formats, case_reference_pattern, currency_code, fetch strategy stack, field recipes, `llm_extraction_model`, `coverage_assessment`, `known_issues`, `active` boolean).
**Rows:** 11 regulators (AEPD, ANSPDCP, CNIL, FTC, Garante, HDPA, NAIH, OAIC, HHS OCR, ÚOOÚ, UODO). 5 marked `active=true`, 6 inactive.
**Verbatim-ness:** N/A — this is ingestion configuration, not authority text.
**Fitness:** **TIER-3 ROW-GROUNDED** — safe to cite `canonical_name` + `jurisdiction` when naming a regulator; do not treat as an authority corpus.
**Per-product mapping:** cross-cutting metadata for "which regulator enforces what" callouts.

---

### 1.7 `us_state_privacy_laws` — **TIER-3 ROW-GROUNDED**

**Schema (15 cols):** `state_code`, `state_name`, `law_name`, `framework_type`, `effective_date`, `is_active`, `applicability_threshold` (text), `has_opt_out_right`, `has_correction_right`, `has_appeal_right`, `requires_gpc`, `has_sensitive_data_category`, `notes`, `enforcement_body`, `enforcement_url`.
**Rows:** 24 states + 4 pending (IL, MA, NY, PA). Effective dates span 2023-01-01 (CA, VA) through 2026-01-01 (IN, KY, RI). `is_active` = false for the 4 pending frameworks.
**Verbatim-ness:** `applicability_threshold` + `notes` are curated summaries, not statute text. Structured booleans are curator-set.
**Fitness:** **TIER-3 ROW-GROUNDED** — safe to cite the boolean facts + effective dates + `enforcement_body`; do not quote `notes`.
**Per-product mapping:** `run-governance-assessment` (US-state selection), `generate-dpa` (US-state controller/processor variants), `generate-ir-playbook` (US-state breach-notification surface), `check-biometric-compliance` (state-selection preamble), `run-dpia-framework` (US-state applicability preflight). **This table is the canonical anchor for the "which state applies" question**, and it is well-populated.

---

### 1.8 `jurisdiction_requirements` — **TIER-3 ROW-GROUNDED**

**Schema (26 cols):** structured requirements per jurisdiction — `jurisdiction_code`, `jurisdiction_name`, `region`, `law_name`, `authority_name`, `authority_url`, `registration_required`, `registration_threshold`, `ai_registration_required`, `ai_threshold`, `dpo_required`, `dpo_threshold`, `representative_required`, `representative_threshold`, `filing_fee_cents`, `filing_currency`, `renewal_period_months`, `language_requirements` (text[]), `online_filing_available`, `filing_portal_url`, `notes`, `last_verified_at`, `filing_steps` (jsonb).
**Rows:** 54 across 54 distinct jurisdictions. Regions: EU 28, APAC 6, EEA 3, MENA 3, Africa 3, Latin America 3, North America 3, us 3, Europe 2. (Note: mixed casing on `region` — `us` vs `North America` — needs canonicalization before grouping.)
**Verbatim-ness:** All curated structured fields; `notes` and `filing_steps` are summaries. Do not quote.
**Fitness:** **TIER-3 ROW-GROUNDED** — safe for boolean/threshold/fee/deadline citations; freshness gated by `last_verified_at`.
**Per-product mapping:** `registration-*` family, `run-governance-assessment` (DPO / representative surfaces), `generate-dpa` (representative clause), `run-dpia-framework` (prior-consultation surfaces).

---

### 1.9 `jurisdiction_canonical` — **TIER-3 (reference table)**

**Schema (7 cols):** `canonical_name`, `iso_country_code`, `iso_subdivision_code`, `display_name`, `is_subnational`, `parent_jurisdiction`, `notes`.
**Rows:** 47.
**Fitness:** **TIER-3 ROW-GROUNDED** — canonical join key. Not an authority corpus.
**Per-product mapping:** join key for every product's jurisdiction resolution.

---

### 1.10 `eu_privacy_frameworks` — **TIER-3 ROW-GROUNDED**

**Schema (10 cols):** `framework_code`, `framework_name`, `region`, `full_law_name`, `template_type`, `is_active`, `effective_date`, `enforcement_body`, `enforcement_url`, `notes`.
**Rows:** 12.
**Fitness:** **TIER-3 ROW-GROUNDED** — reference table for EU/EEA framework selection.
**Per-product mapping:** `generate-eu-notice`, `run-governance-assessment` (EU-selection screen), `run-dpia-framework`.

---

### 1.11 `provision_texts` — **TIER-4 EMPTY / PENDING (BLOCKING)**

**Schema (10 cols):** `key`, `citation`, `verbatim_excerpt`, `plain_requirements` (jsonb), `jurisdiction`, `status`, `last_verified_at`, `approved_by`, `created_at`, `updated_at`.
**Rows:** 41 — status: `approved` **1**, `pending` **40**. Populated `verbatim_excerpt`: **1/41**. Jurisdiction: US-CA 20, EU 19, (blank) 2.
**Sample keys (all pending, all `length(verbatim_excerpt)=0`):** `gdpr-art-5-1-a`, `gdpr-art-5-1-b`, `gdpr-art-5-1-c`, `gdpr-art-6-1-f`, `gdpr-art-9`, `gdpr-art-13`, `gdpr-art-14`, `gdpr-art-22`, `gdpr-art-25`, `gdpr-art-28`, …
**Verbatim-ness:** N/A — table is a stub. Confirmed the dispatch's known finding (41 rows, all-empty except one).
**Fitness:** **TIER-4** until ingested. **Blocking** for a CPPA-style verified-authority registry on non-CPPA products because this was the intended anchor for pinpoint EU/US-CA quotes.
**Per-product mapping:** intended anchor for `run-dpia-framework`, `run-li-assessment`, `generate-dpa`, `run-governance-assessment` verified-authority registries. Until populated, non-CPPA products cannot ship a CPPA-parity substring pin registry — they must either (a) pin against `gdpr_articles.body_text` (EU-only, TIER-1) with a per-article whitelist, or (b) stay TIER-3 row-grounded.

---

### 1.12 `national_provisions` — **TIER-4 EMPTY**

**Schema (24 cols):** rich provisions table (instrument, language, translation_status, authority_type, source, citation, title, `full_text`, `plain_summary`, `topics`, `defines_terms`, `binding`, `authority_weight`, `effective_date`, `status`, `version`, `supersedes_id`, `official_url`, `verified_by`, `verified_at`, `search_vector`).
**Rows:** **0**. Confirmed the dispatch's known finding.
**Fitness:** **TIER-4**. Blocking for any national-derogation surface (Member-State Art. 6(2)/(3) implementations, national breach thresholds, national biometric statutes beyond the current registry).
**Per-product mapping:** would serve `run-governance-assessment` (national derogations), `generate-eu-notice` (national supplements), `check-biometric-compliance` (non-US biometric statutes).

---

### 1.13 `regulatory_guidance` — **TIER-4 EMPTY**

**Schema (14 cols):** `regulator`, `jurisdiction`, `regulatory_family` (text[]), `title`, `document_type`, `source_url`, `effective_date`, `summary`, `full_text`, `source_document_hash`, `verification_status`, `last_source_fetch_at`, `created_at`.
**Rows:** **0**. Confirmed empty.
**Fitness:** **TIER-4**. Blocking for non-EDPB regulator guidance (ICO, CNIL national, PDPC, PIPC, ANPD, OAIC, HHS-OCR bulletins). Today `edpb_guidelines` covers EDPB only; there is NO backing store for other regulators' guidance.
**Per-product mapping:** would serve every non-CPPA product for regulator-specific guidance cites.

---

### 1.14 `state_law_overrides` — **TIER-3 ROW-GROUNDED**

**Schema (9 cols):** `state_slug`, `state_name`, `statute_status`, `statute_name`, `effective_date` (text — NOTE non-date type), `authority_name`, `statute_url`, `confirmed_at`, `confirmed_by`.
**Rows:** 10 (all `Enacted`): Alabama, Kentucky, Louisiana, Maryland, Minnesota, Nebraska, New Hampshire, New Jersey, Oklahoma, Rhode Island.
**Verbatim-ness:** Curator-confirmed structured facts; no statute text.
**Fitness:** **TIER-3 ROW-GROUNDED** — safe as "confirmed enactment" overlay on `us_state_privacy_laws`. Reconcile the `effective_date TEXT` vs `us_state_privacy_laws.effective_date DATE` before joining.
**Per-product mapping:** all US-state surfaces (see §1.7).

---

### 1.15 `cppa_fsor_commentary` — **TIER-2 VERBATIM-EXCERPT (CPPA-scoped; non-CPPA overlap is narrow)**

**Schema (15 cols):** `id`, `fsor_package`, `regulation_citation`, `related_citations` (text[]), `topic_tags` (text[]), `comment_summary`, `agency_response`, `page_ref`, `source_url`, `embedding`, `embedding_model`, `content_hash`, `created_at`, `updated_at`, `agency_position_summary`.
**Rows:** 1,318. Populated: `comment_summary` 1,316/1,318, `agency_response` 1,318/1,318.
**Packages:** `ccpa-2025-cyber-risk-admt` 916, `ccpa-2023-original` 181, `CCPA Updates, Cyber, Risk, ADMT, Insurance 2025 FSOR` 123, `CCPA Updates 2023 FSOR` 83, `dbr-2024-registration` 15.
**Verbatim-ness:** `comment_summary` is a paraphrase ("Commenter argues the AI definition is vague, overbroad…") — DO NOT quote. `agency_response` samples appear to be lifted extracts from the Final Statement of Reasons ("As stated in the ISOR, this definition is necessary to operationalize…") — quote-eligible only after human review of individual rows.
**Fitness:** **TIER-2 for `agency_response` (after row-level review); TIER-3 for `comment_summary` (paraphrase-only)**.
**Per-product mapping (non-CPPA overlap):** only where a non-CPPA product references CCPA (multi-jurisdiction DPA templates, cross-referenced state maps in governance). Overwhelmingly a CPPA corpus.

---

### 1.16 `regulatory_family_mapping` — **TIER-3 (reference table)**

**Schema (6 cols):** `id`, `regulator`, `jurisdiction`, `regulatory_family`, `primary_statute`, `notes`.
**Rows:** 32. Families: `gdpr` 25, `ccpa` 2, `cubi` 1, `bipa` 1, `uk_gdpr` 1, `mhmda` 1, `tdpsa` 1.
**Fitness:** **TIER-3 ROW-GROUNDED** reference table (regulator → family/statute).
**Per-product mapping:** join key for all products' regulator/family resolution.

---

### 1.17 `regulatory_milestones` — **TIER-3 ROW-GROUNDED**

**Schema (13 cols):** `id`, `law_slug`, `milestone_type`, `milestone_date`, `title`, `description`, `jurisdiction`, `source_url`, `verified_at`, `superseded_by`, `notes`, `created_at`, `updated_at`.
**Rows:** 12 (spans 2026-01-01 to 2027-01-01). Verified statutory-date anchors: Indiana SB 5 (2026-01-01), Kentucky HB 15 (2026-01-01), Rhode Island HB 6122 (2026-01-01), Colorado SB 24-205 AAA (2026-02-01), Maryland MODPA (2026-04-01), EU AI Act high-risk (2026-06-15), Minnesota HF 2309 (2026-07-01), EU AI Act full impl (2026-08-02), LGPD ANPD transfer rules (2026-09-01), Nebraska LB 1074 (2026-10-01), CPRA ADMT enforcement (2027-01-01), California SB 362 Delete Act (2027-01-01).
**Fitness:** **TIER-3 ROW-GROUNDED** — deadline/effective-date anchor.
**Per-product mapping:** every product's date-citation surface (never memorize dates in prompts — resolve from this table).

---

### 1.18 `dpia_frameworks` — **NOT A CORPUS (excluded)**

**Schema:** user-scoped assessments table (user_id, intake_data, report_data, purchase_price_cents, pdf_url, retry_count, etc.). 190 rows are user assessments, not authority text. **Confirmed the dispatch's known finding.**
**Exclusion rationale:** contains customer intake + generated reports; must never be treated as an authority corpus.

---

### 1.19 `regulatory_entities` — **TIER-4 EMPTY**

**Schema (6 cols):** `id`, `entity_type`, `name`, `jurisdiction`, `metadata` (jsonb), `created_at`. **Rows: 0.**
**Fitness:** TIER-4. Intended graph node for regulator/law/tool relationships; nothing to draw on today.

---

### 1.20 `entity_relationships` — **TIER-4 EMPTY**

**Schema (6 cols):** `id`, `from_entity_id`, `to_entity_id`, `relationship`, `source_article`, `created_at`. **Rows: 0.**
**Fitness:** TIER-4. Empty edge table for the above.

---

## 2. Per-product corpus draw

| Product | TIER-1 pins available | TIER-2 excerpts available | TIER-3 row-grounded | TIER-4 blocked-on |
|---|---|---|---|---|
| `generate-ir-playbook` | GDPR Art. 33/34 + Recitals 85–88 | EDPB Guidelines 9/2022 (breach) | `us_state_privacy_laws` (state breach), `state_law_overrides`, `enforcement_actions` (breach_related, verified subset), `regulatory_milestones` | `regulatory_guidance` (ICO/CNIL/PDPC breach), `national_provisions` |
| `run-dpia-framework` | GDPR Art. 5/6/9/22/24/25/35/36 + Recitals 75/76/84/89–92 | EDPB WP248 rev.01, Guidelines 1/2024 | `us_state_privacy_laws`, `jurisdiction_requirements`, `regulatory_milestones` | `provision_texts` (intended EU/US pinpoint anchor), `regulatory_guidance` |
| `run-li-assessment` | GDPR Art. 6(1)(f) + Recital 47 | EDPB Guidelines 1/2024 (LI) | `enforcement_actions` (tool_relevance='li', verified subset) | `provision_texts`, `regulatory_guidance` |
| `generate-dpa` | GDPR Art. 28 + Chapter V + Recital 81 | EDPB Guidelines 07/2020, Recs. 01/2020 (transfers) | `us_state_privacy_laws` (controller/processor state variants), `state_law_overrides`, `enforcement_actions` (dpa_related, verified subset) | `provision_texts`, `national_provisions` |
| `run-governance-assessment` | GDPR Art. 5/24/30/35/37 + Recital reference set | EDPB WP260 rev.01 (transparency) | `us_state_privacy_laws`, `state_law_overrides`, `jurisdiction_requirements`, `regulator_profiles`, `regulatory_family_mapping`, `regulatory_milestones` | `provision_texts`, `national_provisions`, `regulatory_guidance` |
| `check-biometric-compliance` | (statute registry is in `_shared/registry/biometric-statute-registry.ts`, not a DB corpus) | — | `us_state_privacy_laws`, `enforcement_actions` (biometric_related, verified subset) | `national_provisions` (non-US biometric statutes) |
| `registration-*` / `generate-eu-notice` / `generate-us-notice` | — | — | `jurisdiction_requirements`, `us_state_privacy_laws`, `state_law_overrides`, `eu_privacy_frameworks`, `jurisdiction_canonical` | `regulatory_guidance` |

---

## 3. Ranked gap list (must be ingested / populated before each product's corpus turn)

Ordered by **blast radius across products**:

1. **`provision_texts`** — 40/41 rows pending. Blocks CPPA-parity verified-authority registries for `run-dpia-framework`, `run-li-assessment`, `generate-dpa`, `run-governance-assessment`. **Highest priority** because this is the CPPA-precedent anchor pattern; without it, non-CPPA products must fall back to `gdpr_articles.body_text` pins (works for EU/UK only, no US-CA parity).
2. **`regulatory_guidance`** — 0 rows. Blocks non-EDPB regulator guidance cites for every product. Populate at least ICO, CNIL (national output beyond EDPB), CPPA (already covered via `cppa_fsor_commentary`), PDPC, ANPD, HHS-OCR before shipping regulator-specific advisory surfaces.
3. **`national_provisions`** — 0 rows. Blocks Member-State derogation surfaces (Art. 6(2)/(3), Art. 88 employment context) and non-US biometric statutes. Lower blast radius than #1/#2 but a known LEAK-PREV over-enforcement source (guards fire on "unsupported" national-law claims that would otherwise be supportable).
4. **`enforcement_actions` verification queue** — 2,260 `requires_review` rows carrying `source_document_text` on 58 of them; only 14 verified rows are TIER-2 quote-safe today. Human-in-the-loop review pipeline needs a throughput target before enforcement narrative citations become routinely available to non-CPPA products.
5. **`edpb_guidelines.section_heading`** — NULL on every sampled row. Populate at ingest to enable narrower pin scope (currently the pin has to normalize + skip TOC rows).
6. **`state_law_overrides.effective_date TEXT` vs `us_state_privacy_laws.effective_date DATE`** — type mismatch; standardize before joining these two tables in generator code.
7. **`regulator_profiles`** — only 11 rows, 5 active. Populate the missing majors (ICO, CPPA, DPC-Ireland, PDPC-Singapore, PIPC-Korea, ANPD-Brazil, PPC-Japan) if they will be cited by name in product outputs.
8. **`legislation_bills.summary`** provenance — currently aggregator paraphrase; add `raw_payload.official_summary` extraction or a `summary_source` provenance column before any product cites it directly.

---

## 4. Recommended eligibility bar for `enforcement_actions` citation

To be applied by any non-CPPA product that draws from `enforcement_actions`:

- **Quote-safe (direct-quote allowed):**
  `verification_status = 'verified' AND source_document_text IS NOT NULL AND source_document_text <> ''`
  → **14 rows today.** Pin against normalized (whitespace-collapsed) `source_document_text`; cite `etid` + `regulator` + `decision_date` + `source_url`.
- **Row-grounded facts allowed (no direct quotation of paraphrased fields):**
  `verification_status IN ('verified','requires_review')`
  → **2,297 rows today.** May cite `regulator`, `decision_date`, `fine_eur` (only when `fine_verified = true`), `statutory_provisions` (only when `statutory_provisions_extraction_method IN ('pattern_per_regulator_verified','source_extracted','regex_high_confidence')` — 1,866 rows), `jurisdiction`. May NOT quote `violation`, `key_compliance_failure`, `preventive_measures`, or paraphrased `summary`-shaped fields.
- **Ineligible for citation at all:**
  `verification_status IN ('unverified','failed')`
  → **3,183 rows today.** May be surfaced in internal telemetry / horizon scanning but must NOT appear in customer-facing narrative or citation surfaces.

Recommendation for controller: encode this as a shared helper `_shared/enforcement-eligibility.ts` before wiring `enforcement_actions` into any non-CPPA generator's context assembly, so the bar is uniform across products (same failure mode CPPA solved with the verified-authority resolver).

---

## 5. Open questions for CEO ruling

1. **Sequence for `provision_texts` population.** CPPA-parity requires a curated pinpoint corpus. Do we (a) commission a curator pass to populate the 40 pending rows (EU + US-CA), or (b) authorize a bootstrap path that lifts pinpoints directly from `gdpr_articles.body_text` (EU-only) with a whitelist? Option (b) unblocks EU-anchored generators immediately but does not close US-CA parity.
2. **Non-EDPB regulator guidance.** `regulatory_guidance` is empty. Ranking of first regulators to populate: ICO / CNIL national / DPC-Ireland / PDPC / ANPD / HHS-OCR / CPPA. CEO to rank.
3. **`enforcement_actions` verification throughput.** With only 14 quote-safe rows today, non-CPPA products either (a) wait for the review queue to drain 2,260 `requires_review` rows before enforcement-narrative surfaces ship, or (b) ship row-grounded (TIER-3) enforcement callouts now with the eligibility bar in §4. CEO to authorize the interim rule.
4. **Uniform eligibility helper.** Authorize `_shared/enforcement-eligibility.ts` as a follow-on authoring turn — no product wiring in the same turn — so the bar in §4 is applied identically before any non-CPPA generator draws from `enforcement_actions`.
5. **LEAK-PREV extension to non-CPPA generators.** The CEO standing order (2026-07-25) requires P0+P1+P2 adoption on every product's next T2 turn. Non-CPPA generators today lack a verified-authority corpus (see gaps #1–#3), which means their emit-gate would have less to enforce against. Confirm: does non-CPPA P0/P1/P2 adoption ride the corpus-population turns, or does it precede them (adopting the machinery with the current TIER-3-heavy footprint)?

---

## 6. Deviation note (folded from dispatch)

The WAVE19-FIX TURN B (cppa-risk) deploy at 2026-07-25T08:30:18Z landed §2 item 35 as DEPLOYED but did **not** restamp the ledger's `**Last updated:**` header. That deviation is corrected by the header restamp associated with THIS turn (see `docs/pipeline-state.md`) — the header now reflects the sandbox clock at the write of this ledger item, and the § 2 item 35 stamp is unchanged.

---

**End of inventory.**
