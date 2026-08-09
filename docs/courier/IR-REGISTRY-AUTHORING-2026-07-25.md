# IR-REGISTRY-AUTHORING — Courier Report

**Stamp:** 2026-07-25T13:30:27Z
**Turn type:** Authoring-only (files-only). **NO DEPLOY.** Wave 22 (batch `8a2ec9d9`, campaign `fd1be147`) RUNNING since 13:15:01Z.
**T2 sequencing:** final registry-authoring turn in the CEO T2 sequence (dpia→lia→governance→dpa→ir).
**Review:** five-lens TEAM-REVIEWED per dispatch.
**Instrument:** s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) FROZEN — untouched.

---

## 1. Files touched (only)

- `supabase/functions/_shared/registry/ir-playbook-verified-authorities.ts` — new; data-only; imported NOWHERE this turn.
- `supabase/functions/_tests/ir-registry.test.ts` — new; live-corpus pin-tests.
- `docs/courier/IR-REGISTRY-AUTHORING-2026-07-25.md` — this file.
- `docs/pipeline-state.md` — ledger item 59 appended + header restamp.

No `run-*` touched. No prompt/rubric/grader/golden/contract/fixture/sample edits. No corpus writes.

---

## 2. Registry summary

- Version tag: `IR_PLAYBOOK_VERIFIED_AUTHORITY_VERSION = "ir-va-w1-2026-07-25"`.
- Row shape mirrors `dpa-verified-authorities.ts` / `governance-verified-authorities.ts` / `lia-verified-authorities.ts` exactly; contract in `supabase/functions/_shared/verified-authority-resolver.ts`.
- `KNOWN_PARAPHRASED_KEYS = []` on entry (per narrow-but-solid rule).
- **Total rows: 34.**

### Row inventory (34)

| Grouping | Rows | Count |
|---|---|---|
| Art. 33 SA notification | `breach_notify_sa_72h`, `breach_notify_reasons_for_delay`, `processor_notify_controller_without_undue_delay`, `notification_content_describe_breach`, `notification_content_dpo_contact`, `notification_content_likely_consequences`, `notification_content_measures_taken`, `phased_notification_permitted`, `document_breaches_duty` | 9 |
| Art. 34 individual communication | `communicate_to_data_subject_high_risk`, `communication_clear_plain_language`, `exception_encryption_unintelligibility`, `exception_subsequent_measures`, `exception_disproportionate_effort`, `sa_may_require_communication` | 6 |
| Art. 32 security backbone | `security_appropriate_measures`, `security_pseudonymisation_encryption`, `security_confidentiality_integrity_availability_resilience`, `security_restore_availability`, `security_regular_testing`, `security_risk_factors_scope`, `staff_process_only_on_instructions` | 7 |
| Art. 28(3)(f)/(h) processor IR duties | `processor_assists_arts_32_to_36`, `demonstrate_compliance_and_audits` | 2 |
| Art. 30 records | `controller_ropa_duty`, `processor_ropa_duty` | 2 |
| Art. 5(1) principles | `principle_purpose_limitation`, `principle_data_minimisation` | 2 |
| Art. 9(1) special categories | `special_categories_prohibition` | 1 |
| Chapter V transfers (Art. 44/46) | `transfers_chapter_v_general_principle`, `transfers_appropriate_safeguards_required`, `transfers_bcr_safeguard`, `transfers_scc_safeguard` | 4 |
| Total (all GDPR-pinned) | | **34** |

### Source-of-truth application

- All 34 rows pinned to `public.provision_texts` rows (status=`approved`, jurisdiction=`EU`) from the P1 bootstrap (ledger item 38).
- `edpb_guidelines` "EDPB Guidelines 2/2019" was REVIEWED for the IR playbook citation surface; NO row pinned this turn. The guideline's substantive scope is Art. 6(1)(b) performance-of-contract, not incident response. On-topic EDPB Guidelines 9/2022 (breach notification) is not in approved corpus this turn and is enumerated on the unanchored list.
- No `enforcement_actions`, no pending rows, no unverified rows, no case_law, no recitals, no non-EU statutes — narrow-but-solid rule held.

---

## 3. `IR_PLAYBOOK_UNANCHORED_PROPOSITIONS` (44 write-around targets)

Every proposition the `generate-ir-playbook` generator asserts (or is expected to assert at the wiring turn) that has NO byte-exact approved-corpus anchor. Grouped with per-key reason:

**GDPR/UK GDPR structural surface not held in approved P1**
- `art_37_dpo_designation_thresholds` — Art. 37 not in approved P1 set (DPO conditional-mention framing).
- `art_55_competent_supervisory_authority` — Art. 55 not in P1 (SA competence rules).
- `art_56_lead_supervisory_authority` — Art. 56 not in P1 (one-stop-shop lead SA).
- `art_60_cooperation_lead_and_concerned` — Art. 60 not in P1 (cross-border cooperation).
- `art_83_administrative_fines` — Art. 83 not in P1 (fine-exposure framing).

**UK GDPR / DPA 2018 mirror surface not ingested**
- `uk_gdpr_art_33_mirror` — UK GDPR Art. 33 (post-Data Act 2025) not in corpus.
- `uk_gdpr_art_34_mirror` — UK GDPR Art. 34 mirror not in corpus.
- `uk_dpa_2018_ico_notification_portal` — ICO notification portal mechanics not in corpus.

**EDPB guidance the IR generator invokes but is not in approved corpus**
- `edpb_9_2022_breach_notification` — EDPB Guidelines 9/2022 not ingested.
- `edpb_9_2022_awareness_definition` — 9/2022 "reasonable degree of certainty" awareness test not ingested.
- `edpb_9_2022_breach_examples` — 9/2022 case examples (ransomware, exfiltration, availability) not ingested.
- `wp29_wp250_breach_notification` — WP250 rev.01 superseded by 9/2022; not in corpus.
- `edpb_01_2021_supersession_note` — "9/2022 replaces 01/2021" framing not in corpus.

**National SA operational surface (portals, forms, statutory contact points)**
- `garante_it_notification_portal`, `cnil_fr_notification_portal`, `ico_uk_notification_portal`, `aepd_es_notification_portal`, `dsk_de_notification_portal`, `uodo_pl_notification_portal` — national regulator portals not in corpus.
- `national_sa_registry_generic` — "consult regulator's register" prose not in statute.

**Non-EU breach-notification statutes referenced by the IR generator**
- `hipaa_breach_notification_rule` — 45 CFR §§ 164.400-414 not in corpus.
- `ca_civ_code_1798_82_pre_2026` — California pre-SB-446 regime not in corpus.
- `ca_sb_446_post_2026_regime` — California SB-446 30-day / 15-day AG copy not in corpus.
- `ny_shield_act_breach_notification` — NY GBS §899-aa not in corpus.
- `tx_bccp_breach_notification` — Texas BCC §521.053 not in corpus.
- `pipeda_breach_of_security_safeguards` — PIPEDA + SOR/2018-64 not in corpus.
- `quebec_law_25_breach_notification` — Quebec Law 25 "sans délai" regime not in corpus.
- `danish_dbl_section_12_employment` — Danish DBL §12 employment context not in corpus.
- `state_ag_notification_thresholds` — US state AG-notification headcount thresholds not in corpus.

**IR operational prose (structural, not quotable)**
- `seventy_two_hour_operational_mechanics` — 72-hour clock operational drilldown prose (descriptive, not statutory).
- `awareness_versus_detection_prose` — awareness/detection distinction drilldown (9/2022 not in corpus).
- `severity_triage_framework_prose` — severity-triage matrix / heat maps (no statutory pin).
- `containment_and_eradication_prose` — containment / eradication runbook (no statutory pin).
- `forensic_preservation_prose` — forensic-preservation guidance (no statutory pin).
- `communications_stakeholder_matrix_prose` — stakeholder-comms matrix (no statutory pin).
- `insurer_and_law_enforcement_notification` — cyber-insurance and LE notification prose (no statutory pin).
- `post_incident_review_prose` — lessons-learned / post-mortem prose (no statutory pin).
- `playbook_role_matrix_prose` — IR role/RACI matrix (no statutory pin).
- `notification_letter_template_prose` — individual-notification template copy (no statutory pin).

**Recitals not held in P1**
- `recital_85_breach_purpose_and_scope`, `recital_86_communication_content`, `recital_87_awareness_and_timing`, `recital_88_technical_and_organisational` — recitals not in `provision_texts` P1.

**CJEU case-law surface (case_law table not in scope)**
- `cjeu_c_340_21_natsionalna_agentsia` — C-340/21 breach-security-standard; not in corpus.

**Conclusion / recommendation prose (structural)**
- `conclusion_ir_playbook_summary`, `recommendation_tabletop_exercise`, `recommendation_processor_contract_review` — no verbatim anchor by design.

Total unanchored: **44 keys**. Per narrow-but-solid rule, none carry a paraphrased row.

---

## 4. Live-corpus pin-tests — pasted green output

Command: `cd supabase/functions && deno test --no-check --allow-all _tests/ir-registry.test.ts`

```
running 5 tests from ./_tests/ir-registry.test.ts
ir-registry: version tag is w1 ... ok (3ms)
ir-registry: no paraphrase on entry (KNOWN_PARAPHRASED_KEYS empty) ... ok (0ms)
ir-registry: unanchorable list is non-empty (write-around targets registered) ... ok (0ms)
ir-registry: every row is a byte-exact substring of its LIVE approved-corpus source ... ok (408ms)
ir-registry: registry keys match proposition_key on each row and required fields are non-empty ... ok (0ms)

ok | 5 passed | 0 failed (419ms)
```

All 34 rows byte-exact substring hits vs LIVE PostgREST fetch of `provision_texts` (jurisdiction=EU, status=approved). No pasted snapshots — the corpus itself is queried at test time.

---

## 5. Guardrails observed

- No deploys; no `run-*` touched; no config.toml edits.
- No prompt, rubric, grader, golden, contract, fixture, or sample edits.
- Instrument s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) untouched.
- Wave 22 in-flight — files-only rule held; the new registry is data-only and imported NOWHERE this turn.
- All stamps re-read from sandbox clock (`date -u` at 13:30:27Z immediately pre-stamp — item 52 stamp doctrine).
- No Fable-5 anywhere; no pricing/payment/design-token/signup/customer-revision-path changes.
- Atomic: registry + test + courier + ledger, nothing else.

---

## 6. Queued (do NOT execute)

Per T2 CEO order, in the first post-wave-22 window:

1. `GOVERNANCE-REGISTRY-WIRING` — deploy turn on `run-governance-assessment` (mirror of DPIA-REGISTRY-WIRING item 51 + LIA-REGISTRY-WIRING items 55/56).
2. `DPA-REGISTRY-WIRING` — deploy turn on `generate-dpa` (imports `dpa-verified-authorities.ts`; LEAK-PREV P0/P1/P2 end-to-end; write-around scrubs for the 39 unanchored keys; stamp-echo whitelist key). After governance wiring clears.
3. `IR-PLAYBOOK-WIRING` — deploy turn on `generate-ir-playbook` (imports `ir-playbook-verified-authorities.ts`; LEAK-PREV P0/P1/P2 end-to-end; write-around scrubs for the 44 unanchored keys; stamp-echo whitelist key). Last in queue.
