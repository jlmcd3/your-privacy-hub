# Deterministic Opening Paragraphs — Design (CEO-approved 2026-07-25)

## 1. Design rules (apply to every product)
1. The model never writes or edits the opening paragraph. A deterministic slot builder assembles it; the emit-gate replaces the opening slot with that build before write. The model reads it and generates the rest of the report conditioned on it.
2. Every slot has exactly one source of truth: a fact-ledger row (customer intake, verbatim, polarity locked) or a registry row (verbatim quote pin-tested against the product's native corpus table).
3. Omission over invention. A silent intake fact drops its clause; grammar via pre-written clause-subset variants, not string surgery. Missing facts surface later as customer questions in the normal intake-gap section — never in the opening.
4. All-that-apply enumeration for legal qualifications (CCPA business criteria, § 7150(b) triggers), in statutory order; never implies unresolved criteria are unmet.
5. Operative figures come from corpus text, never hard-coded (e.g., the CPI-adjusted § 1798.140(d)(1)(A) threshold — quote the corpus string incl. the § 1798.199.95(d) adjustment cross-reference).
6. Semantic honesty: an intake field fills a slot only when its legal meaning matches (e.g., "consumers processed" cannot support the (d)(1)(B) bought/sold/shared count; (B) requires the buys/sells/shares verbs disjunctive with consumers-or-households object; reject (B) when the record shows no sell/share activity).
7. Boundary-band rule: a band asserts a threshold only when it unambiguously clears it; straddling bands are handled in the body.

## 2. Per-product slot plans
(as approved; field names verified vs live DB 2026-07-25; re-verify at wiring)

### cppa-risk (PILOT — full spec in scheduled-task T7 + WAVE ledger)
Slots: S0 CCPA applicability (q1_revenue, q2_consumers semantics-verified) anchored to cppa_authorities 'Cal. Civ. Code § 1798.140' (provision_texts.ccpa-1798-140 companion); S1 11 CCR § 7150(b) trigger(s) all-that-apply from q5_sell_share/q15_sensitive_pi/q18_admt_use/q5b_profiling_observation/sensitive_location_basis; S2 entity_name + q4_pi_categories + i1_processing_purpose verbatim; S3 qualifiers trio (sell-share/targeted-ads/profiling), non-silent, polarity locked; S4 safeguards (i4_disclosure_mechanisms/i1b_min_pi) omit-if-silent; S5 § 7152 content frame; S6 as-of date.

### cppa-admt
Report identity + §§ 7200–7222 subchapter; organization_name/system_name/system_type/system_description (first clause); decision_domains verbatim anchored to § 7001(ddd) + § 7150(b)(3); profiling_use/human_review/training_data_use qualifiers; notice_delivery/opt_out_exception posture clause anchored to §§ 7220–7222; as-of date.

### cppa-cyber
§ 7120 applicability from profile thresholds (semantics pass required — nested profile); § 7121(a)(1)–(3) cohort ONLY when band unambiguous (corpus cppa-7121); org + controls domains enumerated anchored to § 7123; § 7122 independence/thoroughness frame; as-of date.

### dpia
Art 35(1) identity (jurisdictions selects GDPR/UK GDPR); organization_name/processing_activity_name/controller_country; data_categories/data_subjects/purpose verbatim; legal_basis_proposed AS PROPOSED (not concluded), EDPB 2/2019 where 6(1)(b)); article_9_condition only if affirmed; volume_frequency + retention_period verbatim; Art 35(7) frame; as-of date.

### lia
Art 6(1)(f) verbatim frame; organization_name + stated_purpose verbatim; processing_description first clause + data_categories; relationship_type verbatim enum; jurisdictions frame; three-part-test statement; as-of date.

### governance
Art 24 accountability frame; organization_name/sector/org_size; scope enumerates DOMAINS REVIEWED from intake (dpo_status/dpia_status/dpa_status/transfer_status/training_status/dsr_capability) — never conclusions; data context (data_categories/special_category/eu_uk_data non-silent); as-of date.

### dpa
Art 28(3) verbatim lead-in; controllerName/processorName + jurisdictions; services + dataCategories verbatim; retention + transferMechanism (only if includeTransferClause); Art 28(3)(a)–(h) frame; as-of date.

### ir_playbook
Identity + jurisdiction-selected notification frame (Art 33(1) verbatim 72-hour rule for EU); organizationName/organisationType/cause/dataTypes; affectedCount/discoveryDateTime/contained polarity-locked; processorInvolved only if affirmed (Art 33(2)); as-of date.

### registration
Identity (Art 27/Art 37 labels); organization_name/organization_country/markets_served/has_eu_establishment/has_uk_establishment/eu_lead_member_state; employee_count/industry; AI posture only if affirmed (uses_ai_systems/ai_high_risk/ai_general_purpose_provider, anchored to AI-Act registry rows once verified); as-of date. GATE: AI-Act registry verification.

### biometric — STATUTE-LIGHT until biometric statute corpus lands
orgName/orgType; biometricTypes + purpose verbatim; jurisdictions + other_state_names enumerated; NO statutory assertions in the locked paragraph until registry can anchor them. GATE: biometric statute ingestion (deferred corpus task).

## 3. Rollout order (CEO-approved)
1. cppa-risk pilot → measured by the wave following deploy (intake-contradiction + hallucination classes are the primary read, headline score secondary at batch-3 noise).
2. cppa-admt, cppa-cyber (CPPA priority), each its own five-lens turn.
3. European products in registry-maturity order: dpia → lia → dpa → ir → governance.
4. registration (after AI-Act registry verification); biometric last (after statute corpus).
Each rollout is a full turn: contract/schema surfaces + fixtures + goldens + REGEN flag + five-lens + REPORT FLOW rule. No new intake fields required for any opening above; criterion (C) intake field deliberately deferred.
