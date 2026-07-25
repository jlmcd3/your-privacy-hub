# DPA-REGISTRY-AUTHORING — 2026-07-25 (courier report)

**Turn type:** Authoring-only. NO deploys. NO edge-function edits.
**T2 sequence:** dpia → lia → governance → dpa → ir (this turn = dpa authoring, mirror of items 44/52/57).
**Instrument:** s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` — FROZEN, not touched.
**Wave 22:** batch `8a2ec9d9`, campaign `fd1be147`, RUNNING since 2026-07-25T13:15:01Z. Deploy-collision guard applied — files-only turn.
**Fresh-clock stamp tape:** `date -u` @ 2026-07-25T13:19:58Z immediately pre-stamp (item 52 doctrine).

---

## 1. Citation-surface enumeration — `generate-dpa/index.ts`

Read-only audit of the DPA generator system prompt + assembly blocks identified the following legal-proposition citation surface (GDPR Article 28 backbone, transfer chapter, security/breach, principles applied in recitals). Every proposition below either lands as a registry row (pinned to the approved corpus) or is enumerated on `DPA_UNANCHORED_PROPOSITIONS`.

**Article 28 processor sweep (17 rows):** 28(1) sufficient-guarantees; 28(2) authorisation-required and general-authorisation change-notice; 28(3) contract-must-be-binding chapeau; 28(3)(a) documented-instructions; 28(3)(b) personnel-confidentiality; 28(3)(c) security-measures cross-ref to Art. 32; 28(3)(d) sub-processor-conditions cross-ref; 28(3)(e) assist with data-subject requests; 28(3)(f) assist with Arts. 32-36; 28(3)(g) return-or-delete-at-end; 28(3)(h) demonstrate-compliance + audit contribution; 28(3) final-subparagraph infringement-notification duty; 28(4) same-obligations flow-down; 28(4) initial-processor-remains-liable; 28(9) contract in writing; 28(10) processor-becomes-controller-if-exceeds-instructions.
**Art. 30(2)** processor RoPA duty.
**Art. 32** 32(1) chapeau + 32(1)(a)-(d) security measures + 32(4) staff-under-authority (6 rows).
**Art. 33(2)** processor breach-notify controller.
**Art. 5(1)(b)/(c)** principles applied in DPA recitals (2 rows).
**Art. 9(1)** special-category prohibition (DPA scope carve-in).
**Art. 44** Chapter V general principle.
**Art. 46(1)/(2)(b)/(2)(c)** appropriate-safeguards + BCR + SCC (3 rows).
**EDPB Guidelines 2/2019 § 2.4** necessity limb.

**Total: 33 registry rows.**

## 2. Registry file

`supabase/functions/_shared/registry/dpa-verified-authorities.ts` (new, data-only, NOT imported anywhere this turn).

- `DPA_VERIFIED_AUTHORITY_VERSION = "dpa-va-w1-2026-07-25"`
- `DPA_VERIFIED_AUTHORITIES` — 33 rows conforming to `verified-authority-resolver.ts` (`VerifiedAuthorityRow`: `proposition_key`, `citation`, `subsection`, `verbatim_quote`, `depth_class`, `governing_anchor`, `verified_on`, `primary_source_url`)
- `DPA_UNANCHORED_PROPOSITIONS` — 39 write-around targets (see §4)
- `KNOWN_PARAPHRASED_KEYS = []` — empty on entry

## 3. Row list (proposition_key → subsection)

| # | proposition_key | subsection |
|---|---|---|
| 1 | processor_sufficient_guarantees | GDPR Art. 28(1) |
| 2 | sub_processor_authorisation_required | GDPR Art. 28(2) |
| 3 | sub_processor_general_authorisation_change_notice | GDPR Art. 28(2) |
| 4 | processing_governed_by_binding_contract | GDPR Art. 28(3) |
| 5 | processor_documented_instructions | GDPR Art. 28(3)(a) |
| 6 | personnel_confidentiality | GDPR Art. 28(3)(b) |
| 7 | processor_security_measures_ref | GDPR Art. 28(3)(c) |
| 8 | sub_processor_conditions_ref | GDPR Art. 28(3)(d) |
| 9 | processor_assists_data_subject_requests | GDPR Art. 28(3)(e) |
| 10 | processor_assists_arts_32_to_36 | GDPR Art. 28(3)(f) |
| 11 | return_or_delete_at_end | GDPR Art. 28(3)(g) |
| 12 | demonstrate_compliance_and_audits | GDPR Art. 28(3)(h) |
| 13 | processor_infringement_notification_duty | GDPR Art. 28(3), final subparagraph |
| 14 | sub_processor_flow_down_obligations | GDPR Art. 28(4) |
| 15 | initial_processor_remains_liable | GDPR Art. 28(4) |
| 16 | contract_in_writing | GDPR Art. 28(9) |
| 17 | processor_becomes_controller_if_exceeds_instructions | GDPR Art. 28(10) |
| 18 | processor_ropa_duty | GDPR Art. 30(2) |
| 19 | security_appropriate_measures | GDPR Art. 32(1) |
| 20 | security_pseudonymisation_encryption | GDPR Art. 32(1)(a) |
| 21 | security_confidentiality_integrity_availability_resilience | GDPR Art. 32(1)(b) |
| 22 | security_restore_availability | GDPR Art. 32(1)(c) |
| 23 | security_regular_testing | GDPR Art. 32(1)(d) |
| 24 | staff_process_only_on_instructions | GDPR Art. 32(4) |
| 25 | processor_breach_notify_controller | GDPR Art. 33(2) |
| 26 | principle_purpose_limitation | GDPR Art. 5(1)(b) |
| 27 | principle_data_minimisation | GDPR Art. 5(1)(c) |
| 28 | special_categories_prohibition | GDPR Art. 9(1) |
| 29 | transfers_chapter_v_general_principle | GDPR Art. 44 |
| 30 | transfers_appropriate_safeguards_required | GDPR Art. 46(1) |
| 31 | transfers_bcr_safeguard | GDPR Art. 46(2)(b) |
| 32 | transfers_scc_safeguard | GDPR Art. 46(2)(c) |
| 33 | necessity_less_intrusive_alternatives | EDPB Guidelines 2/2019, § 2.4 |

## 4. Unanchored propositions (39 write-around targets)

Enumerated on `DPA_UNANCHORED_PROPOSITIONS`. Rationale per class:

- **GDPR Article surface not held in approved P1 (11):** `art_29_processor_instruction_scope`, `art_45_adequacy_decision`, `art_47_bcr_conditions`, `art_82_liability_and_compensation`, `art_83_administrative_fines`, `art_5_2_accountability_principle`, `art_5_1_d_accuracy`, `art_5_1_e_storage_limitation`, `art_5_1_f_integrity_confidentiality`, `art_9_2_exceptions_menu`, `art_10_criminal_convictions`.
- **SCC / transfer-mechanism drafting mechanics (8):** `scc_module_selection`, `scc_module_two_controller_to_processor`, `scc_module_three_processor_to_processor`, `scc_annex_i_ii_iii_population`, `transfer_impact_assessment`, `uk_idta_or_uk_addendum`, `eu_us_data_privacy_framework`, `uk_adequacy_decision_dec_2025`.
- **Recitals (5):** `recital_81_processor_selection`, `recital_82_processor_records`, `recital_87_breach_notice_scope`, `recital_39_transparency_principle`, `recital_108_appropriate_safeguards`.
- **Guidance not usable this turn (6):** `edpb_07_2020_controller_processor`, `edpb_09_2022_breach_notification`, `edpb_05_2021_scc_deference`, `edpb_02_2020_edct_supplementary_measures`, `edpb_1_2024_legitimate_interests` (empty `excerpt_text_norm`), `wp29_wp169_controller_processor`.
- **CJEU case-law (3):** `cjeu_schrems_ii_transfer_standard`, `cjeu_wirtschaftsakademie_joint_controller`, `cjeu_fashion_id_joint_controller`.
- **Commercial / structural prose without statutory anchor (6):** `sub_processor_commercial_terms`, `liability_indemnity_cap_prose`, `audit_logistics_prose`, `warranty_and_representation_prose`, `governing_law_and_forum_selection`, `termination_for_convenience_prose`.
- **Operational SLA prose without statutory anchor (2):** `return_or_delete_operational_timeline`, `audit_frequency_and_notice_prose`.
- **Conclusion / recommendation prose (3):** `conclusion_dpa_valid_summary`, `recommendation_annex_completion`, `recommendation_scc_execution`.

`KNOWN_PARAPHRASED_KEYS = []` on entry — narrow-but-solid rule holds; no byte-exact-impossible cases exist this turn.

## 5. LIVE-corpus pin-test — pasted green output

```text
$ cd supabase/functions && deno test --allow-net --allow-env --allow-read _tests/dpa-registry.test.ts
Check _tests/dpa-registry.test.ts
running 5 tests from ./_tests/dpa-registry.test.ts
dpa-registry: version tag is w1 ... ok (0ms)
dpa-registry: no paraphrase on entry (KNOWN_PARAPHRASED_KEYS empty) ... ok (0ms)
dpa-registry: unanchorable list is non-empty (write-around targets registered) ... ok (0ms)
dpa-registry: every row is a byte-exact substring of its LIVE approved-corpus source ... ok (934ms)
dpa-registry: registry keys match proposition_key on each row and required fields are non-empty ... ok (0ms)

ok | 5 passed | 0 failed (939ms)
```

Test file: `supabase/functions/_tests/dpa-registry.test.ts` — LIVE PostgREST fetch of `provision_texts` (`status=eq.approved&jurisdiction=eq.EU`) and `edpb_guidelines` (`guideline_ref=eq.EDPB Guidelines 2/2019&status=eq.final`), byte-exact `String.prototype.includes` per row (multi-body handling for section_heading shared across paragraph splits). No pasted snapshots — corpus itself is queried.

## 6. Controller ruling — verbatim

> DEVIATION RULING (controller, 2026-07-25T13:16Z tick): T2 order swap — DPA-REGISTRY-AUTHORING dispatched ahead of GOVERNANCE-REGISTRY-WIRING because the wiring turn carries a deploy and wave 22 (batch 8a2ec9d9, campaign fd1be147) is RUNNING since 13:15:01Z; deploy-collision guard applies. GOVERNANCE-REGISTRY-WIRING remains the next deploy turn, first post-wave-22 window. Mirrors the item-57 order-swap precedent.

## 7. Files touched (only)

- `supabase/functions/_shared/registry/dpa-verified-authorities.ts` — NEW (data-only; not imported anywhere)
- `supabase/functions/_tests/dpa-registry.test.ts` — NEW (LIVE-corpus pin-test)
- `docs/pipeline-state.md` — item 58 appended + header restamp
- `docs/courier/DPA-REGISTRY-AUTHORING-2026-07-25.md` — this report

Nothing else.

## 8. Guardrails observed

- NO deploys; NO edge-function/prompt/rubric/grader/golden/contract/fixture/sample edits
- Instrument s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) FROZEN
- No Fable-5 anywhere; no pricing/payment/design-token/signup/customer-revision-path changes
- Wave 22 running — no `run-*` function touched; zero deploy-collision risk
- All timestamps re-read from sandbox clock immediately pre-stamp (item 52 doctrine)
- Atomic

## 9. Queued (do NOT execute)

1. `GOVERNANCE-REGISTRY-WIRING` — deploy turn on `run-governance-assessment`, first post-wave-22 window (mirror of items 51/55/56).
2. `DPA-REGISTRY-WIRING` — deploy turn on `generate-dpa`; imports the registry, adopts LEAK-PREV P0/P1/P2 end-to-end, write-around scrubs for the 39 unanchored keys, stamp-echo whitelist key. First post-wave window after GOVERNANCE-REGISTRY-WIRING clears.
