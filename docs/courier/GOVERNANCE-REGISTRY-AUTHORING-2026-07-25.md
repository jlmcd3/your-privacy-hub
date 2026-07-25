# GOVERNANCE-REGISTRY-AUTHORING — Courier Report (2026-07-25)

**Turn type:** authoring-only — NO deploy; NO edge-function edits; NO prompt/rubric/grader/golden/contract/fixture/sample edits.
**Dispatch:** controller five-lens TEAM-REVIEWED, 2026-07-25T13:06Z tick; CEO T2 order dpia→lia→governance→dpa→ir.
**Instrument:** `gc-2026-07-25-s4-eu-uk-ca-au-sg` — FROZEN this turn.
**Wave:** wave 22 (campaign `fd1be147`) launch ~13:15Z; files-only turn, no `run-*` touched, no deploy-collision risk.
**Ledger entry:** item 57 in `docs/pipeline-state.md`.
**Registry tag:** `governance-va-w1-2026-07-25`.

---

## 1. Scope

Author the first verified-authorities registry for `run-governance-assessment`, mirroring the shape of `lia-verified-authorities.ts` (item 52) and `dpia-verified-authorities.ts` (item 44). GDPR-pinned first per CEO non-CPPA rule (2026-07-25 T2 sequencing).

Every row's `verbatim_quote` must be a byte-exact substring of an APPROVED corpus source:

- `public.provision_texts` (status='approved', jurisdiction='EU') — 19 EU rows landed by P1 (ledger item 38).
- `public.edpb_guidelines` (guideline_ref='EDPB Guidelines 2/2019', status='final') — corpus-clean rows from P2 batch 1 (ledger item 41); reused only where the § 2.4 necessity standard genuinely anchors governance propositions.

Propositions the governance generator asserts (or is expected to assert at the wiring turn) that have no anchor in the approved corpus this turn go on `GOVERNANCE_UNANCHORED_PROPOSITIONS` — write-around targets for the future `GOVERNANCE-REGISTRY-WIRING` deploy turn. Never paraphrase; narrow-but-solid.

Citation surface was enumerated read-only from `supabase/functions/run-governance-assessment/index.ts` (Art./Recital tokens extracted; CCPA/BIPA/France-side surface routed to unanchored per registry-scope rule).

## 2. Files touched (only)

- **new** `supabase/functions/_shared/registry/governance-verified-authorities.ts` — data-only, not imported by any generator this turn.
- **new** `supabase/functions/_tests/governance-registry.test.ts` — LIVE-corpus PostgREST pin-test; 100% coverage required.
- **new** `docs/courier/GOVERNANCE-REGISTRY-AUTHORING-2026-07-25.md` — this report.
- **edited** `docs/pipeline-state.md` — new ledger item 57 + "Last updated" header + controller ruling recorded verbatim.

Nothing else. No deploys.

## 3. Row table (33 rows)

| # | proposition_key | citation | subsection | source |
|---|---|---|---|---|
| 1 | principle_lawfulness_fairness_transparency | GDPR Art. 5 | Art. 5(1)(a) | `provision_texts.gdpr-art-5-1-a` |
| 2 | principle_purpose_limitation | GDPR Art. 5 | Art. 5(1)(b) | `provision_texts.gdpr-art-5-1-b` |
| 3 | principle_data_minimisation | GDPR Art. 5 | Art. 5(1)(c) | `provision_texts.gdpr-art-5-1-c` |
| 4 | lawful_basis_legitimate_interests | GDPR Art. 6 | Art. 6(1)(f) | `provision_texts.gdpr-art-6-1-f` |
| 5 | special_categories_prohibition | GDPR Art. 9 | Art. 9(1) | `provision_texts.gdpr-art-9-1` |
| 6 | art_13_controller_identity | GDPR Art. 13 | Art. 13(1)(a) | `provision_texts.gdpr-art-13` |
| 7 | art_13_rights_information | GDPR Art. 13 | Art. 13(2)(b) | `provision_texts.gdpr-art-13` |
| 8 | art_14_rights_information | GDPR Art. 14 | Art. 14(2)(c) | `provision_texts.gdpr-art-14` |
| 9 | art_22_admt_right | GDPR Art. 22 | Art. 22(1) | `provision_texts.gdpr-art-22` |
| 10 | data_protection_by_design | GDPR Art. 25 | Art. 25(1) | `provision_texts.gdpr-art-25` |
| 11 | processor_sufficient_guarantees | GDPR Art. 28 | Art. 28(1) | `provision_texts.gdpr-art-28` |
| 12 | processor_sub_processor_authorisation | GDPR Art. 28 | Art. 28(2) | `provision_texts.gdpr-art-28` |
| 13 | processor_documented_instructions | GDPR Art. 28 | Art. 28(3)(a) | `provision_texts.gdpr-art-28` |
| 14 | processor_confidentiality | GDPR Art. 28 | Art. 28(3)(b) | `provision_texts.gdpr-art-28` |
| 15 | processor_return_or_delete | GDPR Art. 28 | Art. 28(3)(g) | `provision_texts.gdpr-art-28` |
| 16 | processor_audit_rights | GDPR Art. 28 | Art. 28(3)(h) | `provision_texts.gdpr-art-28` |
| 17 | ropa_controller_record | GDPR Art. 30 | Art. 30(1) | `provision_texts.gdpr-art-30` |
| 18 | ropa_processor_record | GDPR Art. 30 | Art. 30(2) | `provision_texts.gdpr-art-30` |
| 19 | ropa_small_enterprise_carveout | GDPR Art. 30 | Art. 30(5) | `provision_texts.gdpr-art-30` |
| 20 | security_appropriate_measures | GDPR Art. 32 | Art. 32(1) | `provision_texts.gdpr-art-32` |
| 21 | security_staff_instructions | GDPR Art. 32 | Art. 32(4) | `provision_texts.gdpr-art-32` |
| 22 | breach_notify_sa_72h | GDPR Art. 33 | Art. 33(1) | `provision_texts.gdpr-art-33` |
| 23 | breach_processor_notify_controller | GDPR Art. 33 | Art. 33(2) | `provision_texts.gdpr-art-33` |
| 24 | breach_notify_data_subject_high_risk | GDPR Art. 34 | Art. 34(1) | `provision_texts.gdpr-art-34` |
| 25 | dpia_when_required | GDPR Art. 35 | Art. 35(1) | `provision_texts.gdpr-art-35` |
| 26 | dpia_trigger_automated_profiling | GDPR Art. 35 | Art. 35(3)(a) | `provision_texts.gdpr-art-35` |
| 27 | dpia_trigger_special_categories_large_scale | GDPR Art. 35 | Art. 35(3)(b) | `provision_texts.gdpr-art-35` |
| 28 | dpia_trigger_public_area_monitoring | GDPR Art. 35 | Art. 35(3)(c) | `provision_texts.gdpr-art-35` |
| 29 | transfers_general_principle | GDPR Art. 44 | Art. 44 | `provision_texts.gdpr-art-44` |
| 30 | transfers_appropriate_safeguards | GDPR Art. 46 | Art. 46(1) | `provision_texts.gdpr-art-46` |
| 31 | transfers_scc_mechanism | GDPR Art. 46 | Art. 46(2)(c) | `provision_texts.gdpr-art-46` |
| 32 | transfers_bcr_mechanism | GDPR Art. 46 | Art. 46(2)(b) | `provision_texts.gdpr-art-46` |
| 33 | necessity_less_intrusive_alternatives | EDPB Guidelines 2/2019, § 2.4 | § 2.4 | `edpb_guidelines` — "2.4 Necessity" |

Governing anchors: GDPR = `Regulation (EU) 2016/679 (GDPR)` (32 rows); EDPB = `EDPB Guidelines 2/2019 on processing of personal data under Article 6(1)(b) GDPR` (1 row).

## 4. Unanchorable list (write-around targets)

Enumerated in `GOVERNANCE_UNANCHORED_PROPOSITIONS`; the future `GOVERNANCE-REGISTRY-WIRING` turn must WRITE AROUND — never paraphrase.

- **GDPR surface not held in approved P1 corpus:** `art_4_definitions`, `art_6_1_a_consent`, `art_7_consent_conditions`, `art_10_criminal_convictions`, `art_12_transparency_modalities`, `art_12_3_response_deadline`, `art_24_controller_accountability`, `art_29_processing_under_authority`, `art_37_dpo_designation`, `art_37_1_b_dpo_trigger_core_activities`, `art_39_dpo_tasks`, `art_45_adequacy_decision`, `art_56_lead_supervisory_authority`, `art_57_supervisory_authority_tasks`.
- **Recital surface** (recitals not in `provision_texts` P1): `recital_39_transparency_and_awareness`, `recital_47_legitimate_interests`.
- **US-side surface — out of scope for GDPR-pinned registry** (handled via CPPA registries under other T2 tracks): `ccpa_service_provider_contract_1798_100_d`, `ccpa_right_to_correct_1798_106`, `ccpa_right_to_delete_1798_105`, `ccpa_breach_notification_ca_1798_82_sb446`, `bipa_740_ilcs_14_15_a_e`, `us_dsr_45_day_deadline`.
- **French implementing law framing** (per DEFINITIONAL-ARTICLE / France rule in generator source): `france_loi_informatique_libertes_general`, `france_cnil_supervisory_authority`.
- **Guidance surface not in approved corpus this turn:** `wp29_wp250_breach_notification`, `wp29_wp243_dpo_guidelines`, `wp29_wp248_dpia_criteria`, `edpb_1_2024_legitimate_interests` (rows lack `excerpt_text_norm` — no substring pin possible), `edpb_9_2022_breach_notification_examples`.
- **Structural / conclusion prose** (no verbatim anchor by design): `governance_maturity_conclusion`, `governance_recommendation_prose`.

`KNOWN_PARAPHRASED_KEYS = []` on entry — no byte-exact-impossible cases justified this turn.

## 5. LIVE-corpus pin-test — pasted green output

Command: `cd supabase/functions && deno test --allow-net --allow-env --allow-read _tests/governance-registry.test.ts`

```
Check _tests/governance-registry.test.ts
running 5 tests from ./_tests/governance-registry.test.ts
governance-registry: version tag is w1 ... ok (1ms)
governance-registry: no paraphrase on entry (KNOWN_PARAPHRASED_KEYS empty) ... ok (0ms)
governance-registry: unanchorable list is non-empty (write-around targets registered) ... ok (0ms)
governance-registry: every row is a byte-exact substring of its LIVE approved-corpus source ... ok (741ms)
governance-registry: registry keys match proposition_key and required fields are non-empty ... ok (0ms)

ok | 5 passed | 0 failed (751ms)
```

The substring assertion (test 4) walks all 33 rows against a live PostgREST fetch of `provision_texts` (jurisdiction='EU', status='approved') and `edpb_guidelines` (guideline_ref='EDPB Guidelines 2/2019', status='final'), and passes when every `verbatim_quote` is found byte-exact inside its keyed source row. 33/33 pinned. No pasted snapshots.

## 6. Controller ruling recorded

Recorded verbatim in `docs/pipeline-state.md` item 57:

> **DEVIATION RULING (controller, 2026-07-25T13:06Z tick):** T2 order swap — GOVERNANCE-REGISTRY-AUTHORING dispatched ahead of LIA-REGISTRY-WIRING because the wiring turn carries a deploy and wave 22 launch (~13:15Z) was inside the dispatch window; deploy-collision guard applies. LIA-REGISTRY-WIRING will dispatch in the first post-wave-22 window.

Sequencing note: LIA-REGISTRY-WIRING in fact landed pre-wave-22 as items 55 (13:01:42Z) and 56 (13:07:10Z spec-alignment redeploy) inside the confirmed pre-launch deploy window. The T2 swap ruling is preserved verbatim per dispatch instruction as the controller-side rationale that governed dispatch ordering.

## 7. Guardrails observed

- No deploys of any kind (`deploy_edge_functions` NOT called).
- No edits to `run-*` edge functions.
- No edits to prompts, rubrics, grader, goldens, contracts, fixtures, samples, or the instrument (`gc-2026-07-25-s4-eu-uk-ca-au-sg` frozen).
- No new corpus ingestion — approved corpus consumed READ-ONLY at test time.
- No CPPA-assessment or user-data writes.
- All timestamps re-read from sandbox clock (`date -u` at 13:11:59Z immediately pre-stamp — item 52 doctrine).
- Atomic commit: registry data file + pin-test + ledger + this courier.

## 8. Commit

Commit hash: managed by platform (sandbox agent cannot perform stateful git operations); ledger entry 57 acts as the change-of-record.

## 9. Next queued

`GOVERNANCE-REGISTRY-WIRING` — deploy turn on `run-governance-assessment` in the first post-wave-22 window; imports this registry, adopts LEAK-PREV P0/P1/P2 (mirror of DPIA-REGISTRY-WIRING item 51 + LIA-REGISTRY-WIRING items 55/56), write-around scrubs for the 32 `GOVERNANCE_UNANCHORED_PROPOSITIONS`, stamp-echo whitelist key.

---
Registry: `governance-va-w1-2026-07-25` · 33 rows · 100% live-corpus pin coverage · authoring-only, no deploy.
