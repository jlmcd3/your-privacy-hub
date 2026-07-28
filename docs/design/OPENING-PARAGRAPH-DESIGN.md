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
Slots (rendered in this order per §4 CUSTOMER-FIRST law, CEO-directed 2026-07-28): **S2 entity_name + q4_pi_categories + i1_processing_purpose verbatim** (customer identity + processing) → **S3 qualifiers trio** (sell-share/targeted-ads/profiling), non-silent, polarity locked → **S4 safeguards** (i4_disclosure_mechanisms/i1b_min_pi) omit-if-silent → **S0 CCPA applicability** (q1_revenue, q2_consumers semantics-verified) anchored to cppa_authorities 'Cal. Civ. Code § 1798.140' (provision_texts.ccpa-1798-140 companion) → **S1 11 CCR § 7150(b) trigger(s)** all-that-apply from q5_sell_share/q15_sensitive_pi/q18_admt_use/q5b_profiling_observation/sensitive_location_basis → **S5 § 7152 content frame** → **S6 as-of date**. Slot sources, ledger/registry provenance, polarity locks, and emitter law unchanged; only render order is reordered so the paragraph reads as the customer's story with the statute serving it, not framing it.

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

## 4. CUSTOMER-FIRST OPENING LAW (STANDING, CROSS-PRODUCT — CEO-directed 2026-07-28; CP5 addendum)
Verbatim CEO directive of record:
> "The PDF should lead with the customer, not the laws of the test."

Standing law (applies to every product's opening paragraph AND every section opener rendered by Pass-2 templates):
1. **Customer-facts first.** The opening leads with S2-class content: who the customer is (organization identity), what they process (data categories / processing description), for what purpose (stated purpose / processing activity). Then S3/S4-class qualifiers and safeguards where non-silent.
2. **Legal frame second.** Only after the customer's facts does the paragraph state what the assessment is and why it is required — S0 statutory applicability, then S1 statute-specific trigger(s) all-that-apply, then the operative content-frame (S5) and as-of date (S6).
3. **The statute serves the customer's story, never leads it.** No paragraph may open with a code section, a rule number, a framework name, or a "This assessment is required under …" clause. Statutory anchors attach to the customer's facts, not the other way around.
4. **Section-opener audit.** The same rule extends into every section opener in the prose pass (scope, balance, actions, guidance, etc.): the section states the customer's facts relevant to that section first, then the legal frame that governs them.
5. **Unchanged.** Slot laws, source-of-truth pinning (ledger row or registry row), polarity locks, omit-over-invent, all-that-apply enumeration, boundary-band rule, and deterministic-emitter provenance are UNCHANGED. Only render order and section-opener prose ordering are constrained.
6. **Per-product application.** Each product's §2 slot plan is re-read through this law; §2 cppa-risk is already reordered as the pilot. Other products are reordered in the CP5(e) prose-panel pass as content-anchored courier text for CEO review before wiring; slot inventories and sources do not change.
7. **Cross-product doc of record.** This section (§4) is the canonical statement of the customer-first law; per-product design docs and Pass-2 template authoring reference it, they do not re-state it.
