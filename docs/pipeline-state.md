# Pipeline Coordination Ledger

**Purpose:** Single source of truth for parallel pipeline controllers (this session, scheduled ticks, human dispatchers). Read this file from a fresh clone BEFORE dispatching, green-lighting, or deploying. A green-light contradicting an ACTIVE HOLD must name the hold and state why it is released.

**Stamp doctrine:** Re-read the sandbox clock (`date -u`) immediately before writing any timestamp — including this ledger's "Last updated" field and any function BUILD_STAMP. Never carry a stamp forward from an earlier turn.

**Last updated:** 2026-07-24T18:28:25Z — `SAMPLES-CONTRACT-biometric` (8/8) DONE (frontend/test only, no deploy). Reconciled `F_BIO_US` (audited surface `invoke_body_extras` per SAMPLE_MAP) and its supplemental clone `F_BIO_US_SUPP` in `src/lib/sampleFixtures.ts` against `biometricCheckerContract`. REMOVED unknown key `is_free_tier` (live-form audit of `src/pages/BiometricChecker.tsx` L64-68 form state + submit path confirms the form does NOT emit `is_free_tier`; the field is a DB column set server-side by `check-biometric-compliance/index.ts` L1346/L2077 from body — fixture-only literal was inert; governance `sample_run` precedent applies, not LIA mechanical-column precedent because live form does not emit it). Normalized `biometricTypes: ["fingerprint"]` → `["Fingerprint / palm print"]` (BIO_TYPES literal); `orgType: "logistics-technology company"` → `"Employer (employee biometrics)"` (BIO_ORG best-fit — enrolled workers on employer-owned time-clocks); `purpose` free-text narrative → `"Time & attendance / workforce management"` (BIO_PURPOSE literal). `jurisdictions: ["Illinois, USA (BIPA)"]` ✓ unchanged. Required-always keys all present after normalization (`orgName`, `biometricTypes`, `orgType`, `purpose`, `jurisdictions`). Preserved every dropped free-text string VERBATIM in the fixture's non-audited `scenario_summary` (biometric contract has no narrative slot; used the top-level SampleFixture prose surface per the ir_playbook 7/8 precedent): original `orgType` prose, full `purpose` narrative including vendor/DPA terms, standalone written BIPA §15(b) release wording, published policy, retention/destruction schedule with quarterly attestation. Supplemental clone inherits normalized parent via `withSupplemental`; supplemental `supplemental_responses`/`supplemental_context` remain allowed-extras. No unknown-key STOP triggered — after `is_free_tier` removal every audited-surface key belongs to the contract. Flipped `biometric` out of `SAMPLE_ADVISORY_TOOLS` in `supabase/functions/_tests/contract-surface-audit.test.ts` → FATAL tier; counter updated to `..., ir_playbook (7/8), biometric (8/8)`; remaining ADVISORY set: `dpa` only. **Tests green:** deno `contract-surface-audit.test.ts` 3/3 ok (biometric absent from both ADVISORY drift log and FATAL failures); vitest `sampleFixtures.shape.test.ts` 50 passed / 2 failed (both = pre-existing `cppa_cyber/us-supplemental`, OUT OF SCOPE). No edge deploy this turn (wave-13 batch `7a4923fe` in-flight).

---

## 1. Active Holds

_None at this time._

Historical release: `ADMT-FIX-W9` released with wave-10 spec amendments and shipped as `run-admt-checker` build stamped `w9-admt-preemit` (real deploy ~11:49Z; future-dated `@…T12:30:00Z` marker was DISCHARGED at TURN C deploy 17:11:54Z with fresh-clock stamp `w12-admt-turnc@2026-07-24T17:10:43Z`).

## 2. Queue Order (as currently dispatched)

1. **DONE PRIOR TURN** — `RECOVERY-BATCH-FIXES / TURN A` (cppa-cyber A1 + A2) — deployed 12:25Z.
2. **DONE PRIOR TURN** — `RECOVERY-BATCH-FIXES / TURN B` (cppa-risk B1a field-provenance + B1b claims guard) — deployed 12:39Z.
3. **DONE PRIOR TURN** — `SAMPLES-CONTRACT-dpia` (4/8) — frontend/test only, no deploy.
4. **DONE PRIOR TURN** — `SAMPLES-CONTRACT-lia` (5/8) — frontend/test only, no deploy.
5. **DONE THIS TURN** — `WAVE12-FIX TURN C` (cppa-admt): deployed `run-admt-checker` at 2026-07-24T17:11:54Z (boot log confirmed), fresh-clock BUILD_STAMP `w12-admt-turnc@2026-07-24T17:10:43Z`. Registry `access_timeline` row removed (fabricated §7222(c) quote); `_w9_admt_slots.buildDeadlineTable` now emits `information_needed:true` with empty citation/quote when a pk is unresolved (never fabricates); terminal write strips top-level underscore-prefixed telemetry (`_w6_admt_fix`, `_w9_admt_wire`, `_w9_admt_slots`, `_w9_admt_regen`, `_w9_admt_pre_emit`, any future `_w<digits>_*`) into `_meta.internal` and removes per-entry `_va_stamp`, `_va_stamp_unresolved`, `_w9_regen`; `walkAnchorGuard` adds a §7001-chain dedupe; `ADMT_COVERAGE.rubric_citation_misapplied.prevented_by` pruned of `access_timeline`. **C1 leak-guard test** `_w12_c1_leak_guard.test.ts` added (2/2 green: (i) `_w<digits>_*` telemetry moved to `_meta.internal`, entry diagnostics scrubbed; (ii) no customer-surface key matches `/^_w\d+_/` after strip). C3 fallback-density deferred: wave-12 evidence delivered headline count only, not underlying propositional list — logged as follow-up (§6 + §2 item 13). Tests: leak-guard 2/2 + w6_admt_fix 16/16 + registry 13/13 + turn2 parity 2/2 all green.
6. **DONE THIS TURN** — `WAVE12-FIX TURN D` (cppa-risk): deployed `run-cppa-risk-assessment` at 2026-07-24T17:25:03Z (boot log confirmed), fresh-clock BUILD_STAMP `w12-risk-turnd@2026-07-24T17:23:28Z`. **D1** T-1 gate switched from `fiveStage.annual_consumer_volume` (q2_consumers/CONSUMER_OPTS — aligned to the 250k breakpoint, HID straddle) to `rawIntake.i3_ca_consumer_band` (CA_CONSUMER_BAND — genuinely straddles 250k). New band mapping: below={Fewer than 10,000; 10,000–100,000}, above={More than 1,000,000}, straddle-or-Unsure={100,000–1,000,000; Unsure}. Wave-12 doc `9ce32381` (q2="100,000–249,999" but i3="100,000–1,000,000") no longer resolves definitively — any "met"/"not met" claim is a violation. **D2** bidirectional profiling guard added to `_w10_risk_b1.ts` (`W12_RISK_D2_STAMP`, `guardProfilingDenials`, `guardDenialsDeep`, `PROFILING_DENIAL_RE`); scrubs "no profiling", "no ... inferences", "profiling is/are not", "does not perform/conduct/engage in profiling", "not performing profiling", "no systematic observation" — ONLY when `q5b_profiling_observation` starts with "Yes". Denials become "The intake asserts systematic-observation profiling (q5b_profiling_observation = Yes); the earlier statement that … is not supported by the intake and must be reconciled." Telemetry `profiling_denials_scanned`/`profiling_denials_downgraded` in `_w10_risk_b1.counters`. Fail-open (existing B1b overclaim guard preserved, direction complementary). **D3** PRECISE DEFINITION CITES prompt rule (`index.ts:495`) now includes `§ 1798.140(ai) ('third party')` and an explicit "post-CPRA lettering for the 'third party' definition is § 1798.140(ai) — never § 1798.140(ad) (which is 'sell')" clause. Verified against `cppa_authorities` corpus `Cal. Civ. Code § 1798.140`: subsection (ai) = "Third party"; (ad) = "Sell"; (ah) = "Share". **Tests (green — pasted):** 17/17 passed (`_w10_risk_b1.test.ts` 6/6 + `_w12_turnd.test.ts` 11/11): stamp check, D2 stamp export, D1 wave-12 exact bands (straddle+not-met→violation), D1 below-band+met, D1 above-band+not-met, D1 straddle+indeterminate-prose→pass, D1 Unsure×2, D2 downgrade-when-Yes, D2 leave-alone-when-No, D2 alternate phrasing, D3 prompt-cite regression.
7. **DONE THIS TURN** — `WAVE12-FIX TURN E` (cppa-cyber, deploy turn): deployed `run-cppa-cybersecurity` at 2026-07-24T17:34:54Z, fresh-clock BUILD_STAMP `w12-cyber-turne@2026-07-24T17:32:35Z`. E1a root cause in `_w6_cyber_fix.ts`: sentence splitter switched from `(?<=[.;])` to `(?<=[.!?])` so "governs;" no longer orphans its preposition; orphan-prep rewrites (verb-phrase ending in bare preposition before terminator) roll back the counter and OMIT the transformed clause. E1b new `_w12_cyber_e1.ts` (`sanitizeCrosswalkText`, `applyW12CyberE1`, stamp `w12-cyber-e1@2026-07-24T17:32:35Z`) walks all string surfaces on the terminal report (top-level narratives, `top_risks`, `next_steps`, controls narrative slots, `enforcement_context`, etc.): (i) pre-pass strips mid-string orphan-prep-then-terminator stubs (`\b(on|of|for|to|in|at|with|by|from|as)\s*[;:]\s+(?=[A-Z0-9]|$)`) — catches the exact wave-12 fragment; (ii) drops sentences whose end-terminator is bare `;` or `:`; (iii) drops sentences with unbalanced `()`; (iv) dedupes exact operative sentences with whitespace/case normalisation. Fail-open — any throw returns input unchanged. Telemetry counters land at `report._meta.internal.crosswalk` ONLY; TURN C `_w<digits>_*` strip continues to guard customer surfaces. **Retro-audit (TURN A):** `stripLiteralNPlaceholder` and `attachCyberAggregates` unchanged and functioning. **MEDIUM boilerplate-remediation finding remains deferred** (queued below). **Tests (green — pasted):** 45/45 (`_w12_turne.test.ts` 16/16 [stamp export, index restamp, wave-12 exact fragment scrubbed, bare-`;` sentence drop, dangling `)` drop, unclosed `(` drop, balanced parens survive, exact-duplicate dedupe, case/whitespace-insensitive dedupe, well-formed pass-through, empty/null fail-open, full-report walker + telemetry placement + no-customer-surface-leak, root-cause `_w6` no orphan stubs, root-cause complete-sentence rewrite still fires, root-cause split no longer breaks on `;`] + `_w6_cyber_fix.test.ts` 25/25 + `_w10_cyber_aggregates.test.ts` 5/5). Boot log capture pending post-deploy first invocation; `supabase--deploy_edge_functions` returned success at 17:34:54Z sandbox clock.
8. **DONE THIS TURN** — `REGISTRY-VERBATIM-AUDIT` (dropped-order restore). See §4 for details; see `docs/courier/REGISTRY-VERBATIM-AUDIT-2026-07-24.md` for the per-row report.
9. **DONE THIS TURN** — `SAMPLES-CONTRACT-governance` (6/8). Frontend/test only, no deploy. See §4 for full scope. Pre-existing 2 `cppa_cyber/us-supplemental` shape-test failures explicitly OUT OF SCOPE per dispatch (not folded in this turn).
10. **DONE THIS TURN** — `SAMPLES-CONTRACT-ir_playbook` (7/8). Frontend/test only, no deploy. Reconciled `F_IR_EU`/`F_IR_US` in `src/lib/sampleFixtures.ts` against `irPlaybookContract` (audited surfaces `invoke_body_extras` / `invoke_body` per SAMPLE_MAP); added missing required `organizationName` to both; normalized 5 drifted values per fixture to IR_CAUSES / IR_DATA_TYPES / IR_COUNTS / IR_CONTAINED / IR_ORG_TYPES literals; preserved every dropped/normalized string verbatim in each fixture's non-audited `scenario_summary`. No unknown-key STOP triggered — live-form audit of `src/pages/IRPlaybook.tsx` (form state L91-97; `.functions.invoke` L144) confirms the form emits only the 10 contract keys. Flipped `ir_playbook` out of `SAMPLE_ADVISORY_TOOLS` → FATAL; counter now `7/8`; remaining ADVISORY set: `dpa`, `biometric`. Tests green: deno `contract-surface-audit.test.ts` 3/3 ok (ir_playbook absent from ADVISORY drift and FATAL failures); vitest `sampleFixtures.shape.test.ts` 50 passed / 2 failed (both pre-existing `cppa_cyber/us-supplemental`, OUT OF SCOPE).
11. **DONE THIS TURN** — `SAMPLES-CONTRACT-biometric` (8/8). Frontend/test only, no deploy. Reconciled `F_BIO_US` + `F_BIO_US_SUPP` in `src/lib/sampleFixtures.ts` against `biometricCheckerContract` (audited surface `invoke_body_extras` per SAMPLE_MAP). REMOVED unknown key `is_free_tier` (governance `sample_run` precedent — live-form audit of `src/pages/BiometricChecker.tsx` L64-68 confirms the form does not emit it; DB column is set server-side in `check-biometric-compliance/index.ts` L1346/L2077 from body — fixture literal was inert). Normalized 3 drifted values to BIO_TYPES / BIO_ORG / BIO_PURPOSE literals; jurisdictions already contract-conformant. Full free-text preserved verbatim in non-audited `scenario_summary` (biometric contract lacks narrative slot). Flipped `biometric` out of `SAMPLE_ADVISORY_TOOLS` → FATAL; counter now `8/8`; remaining ADVISORY set: `dpa` only. Tests: `contract-surface-audit` 3/3 ok (no biometric rows in ADVISORY or FATAL); `sampleFixtures.shape` 50/52 (2 pre-existing cppa_cyber/us-supplemental failures, out of scope).
12. **NEXT** — `SAMPLES-CONTRACT-dpa` closes the series (frontend/test only; not deploy-locked).

12. Then — ADMT registry corpus-anchored corrections, batched by section (§ 7001 defs+FSOR overlays; § 7150/7155/7157 RA; § 7200; § 7220 notice; § 7221 opt-out; § 7222 access; Civ. Code § 1798.140/§ 1798.185). Each correction turn extracts actual subsection text from `cppa_authorities.full_text`, rewrites the row, removes the key from `KNOWN_PARAPHRASED_KEYS`. Target: set empty.
13. After samples 8/8 — `REGISTRATION-INTAKE-CONTRACT-RAIL-MAP` (pre-approved authoring turn per overnight standing order: shared contract + rail-map + corpus-cited rails + dummy data).
14. Deferred — orchestrator → `delivery_contracts` wiring (queued between waves; priority raised — second isolate death in one day, see §5-adjacent).
15. Deferred — WAVE12-FIX TURN C / C3 (fallback-density expansion) — needs wave-12 propositional list; queue for morning CEO or next wave's finding digest.

_Note:_ `CPPA-CYBER-FIX-CN-PLACEHOLDER` is **SUPERSEDED** — identical scope shipped as TURN A. Do not re-queue.

## 3. Deploy Locks

**Standing rule:** Deploying any edge function requires:
- (a) No in-flight customer-path generation on that function — query the relevant product table for rows created in the last 15 minutes with a NULL report/document payload.
- (b) No `quality_batch_runs` row in `running` or `pending` status that dispatches the function.

If either check returns a row, the deploy WAITS until the run reaches a terminal state (`complete`, `error`, `cancelled`).

**Current lock state (2026-07-24T17:34:54Z):**
- `run-cppa-cybersecurity` **unlocked** post-TURN E deploy. All other functions unlocked.
- Deferred: MEDIUM cyber boilerplate-remediation across 16/18 controls (own future turn — not co-located in the crosswalk assembler).

## 4. Last Completed Turn

- **Turn:** `SAMPLES-CONTRACT-governance` (6/8) — team-reviewed dispatch (five-lens).
- **Real-time:** 2026-07-24T17:55:49Z (sandbox `date -u`).
- **Scope (frontend/test only, no edge deploy):**
  - **Audited surface:** `insert.intake_data` per SAMPLE_MAP in `_tests/contract-surface-audit.test.ts`. Only intake keys are validated — row-level `status: "pending"` at `insert` root is not walked; no `ALLOWED_TOPLEVEL_EXTRAS` change needed for governance (contrast with LIA 5/8, whose `insert` root itself was the audited surface).
  - **Contract source of truth:** `governanceContract` in `_shared/intake-contracts/governance-assessment.ts`; option lists inline (`GOV_SECTORS`, `GOV_SIZES`, `GOV_JURISDICTIONS`, `GOV_TOOLS`, `GOV_DATA_CATS`, `GOV_SPECIAL_CATS`, `PRIVACY_POLICY`, `PRIVACY_NOTICE_COVERAGE`, `DPO_STATUS`, `DPIA_STATUS`, `DPIA_AI_COVERAGE`, `INCIDENT_RESPONSE`, `TRAINING_STATUS`, `TRAINING_AI_COVERAGE`, `TOOL_INSTRUCTION`, `DPA_STATUS`, `DPA_ART28`, `TRANSFER_STATUS`, `TRANSFER_MECHANISM`, `TECHNICAL_CONTROLS`, `TECHNICAL_CONTROLS_LIST`, `DSR_CAPABILITY`, `DSR_RIGHTS_TESTED`, `INVENTORY_AUDIT`).
  - **Form source of truth:** `src/pages/GovernanceAssessment.tsx` `buildIntake()` L200-224; `.insert({...})` at L237-247. `sample_run` verified NOT present in either.
  - **Per-key audit + classification** (F_GOV_EU + F_GOV_US, both `insert.intake_data`):
    - `organization_name` — contract ✓; unchanged.
    - `sector` — free text ("Logistics / e-commerce fulfilment", "Logistics / SaaS") NOT in `GOV_SECTORS` → normalized to `"Other"` (form uses fixed radio list; there is no free-text "Other: …" fold-in for sector). Sector prose preserved verbatim in `additional_context`. Cite: `GovernanceAssessment.tsx` renders sector as Radio group over `GOV_SECTORS`; contract L125.
    - `org_size` — `"51-250"`, `"251-1000"` ✓; unchanged.
    - `jurisdictions` — `"EU (GDPR)"`, `"California (CCPA/CPRA)"` ✓; `"Ireland (Data Protection Act 2018)"`, `"Colorado (CPA)"`, `"Virginia (VCDPA)"`, `"Illinois (BIPA)"` NOT in `GOV_JURISDICTIONS` → normalized to `"Other"` (EU) and `"Other US States"` (US). All state/national overlay specifics preserved verbatim in `additional_context`. Cite: contract L127.
    - `eu_uk_data` — `"Yes"`/`"No"` ✓; unchanged.
    - `tools` — multi-enum on `GOV_TOOLS`. `"Microsoft 365 / Copilot"`, `"HubSpot"` ✓; `"Shopify Plus"`, `"ShipHero WMS"`, `"Salesforce"` (contract has `"Salesforce + Einstein"` — different string), `"Snowflake"` NOT in options → dropped from array; preserved verbatim in `additional_context`. Cite: contract L139; form L203 note about `"Other: …"` fold does not apply to these fixture entries.
    - `data_categories` — multi-enum on `GOV_DATA_CATS`. `"Customer records"`, `"Employee records"` ✓; `"Contact identifiers"` → `"Contact details"` (contract literal); `"Order history"` → `"Other"` (preserved in `additional_context`); `"Internet/network activity"` → `"Other"` (preserved); `"Biometric identifiers (fingerprint timeclocks)"` → `"Biometric data"` (fingerprint-timeclock gloss preserved). Cite: contract L140.
    - `special_category` — `"No"`/`"Yes"` ✓; unchanged.
    - `special_categories_list` — `[]` ✓ (EU); `"Biometric data (fingerprint templates)"` → `"Biometric data"` (US); template gloss preserved in `additional_context`. Cite: contract L142.
    - `privacy_policy` — `"Yes, up to date"` NOT in `PRIVACY_POLICY` → `"Yes, current (reviewed in last 12 months)"` (contract literal). Cite: contract L143 + inline list L45-49.
    - `privacy_notice_coverage` — MISSING (conditional; privacy_policy starts with "Yes" ⇒ required). ADDED as `"Yes — notice covers all current activities, transfers, retention, and rights"`. Cite: contract L144-146 + inline list L50-55.
    - `dpo_status` — `"Yes, formally appointed DPO"` / `"Yes, formally appointed privacy officer"` NOT in `DPO_STATUS` → `"Yes, formal DPO"` (best-fit contract literal). Cite: contract L147-149 + inline list L56.
    - `dpia_status` — `"Yes, formal DPIA programme with register"` NOT in `DPIA_STATUS` → `"Yes, multiple DPIAs completed"`. Cite: contract L150 + inline list L57-60.
    - `dpia_ai_coverage` — MISSING (conditional on dpia_status starts with "Yes"). ADDED as `"Yes — all AI/high-risk tools assessed"`. Cite: contract L169-171 + inline list L61-64.
    - `incident_response` — `"Yes, tested in last 12 months"` ✓; unchanged. Cite: contract L151 + inline list L65-68.
    - `training_status` — `"Yes, annual mandatory"` NOT in `TRAINING_STATUS` → `"Yes, formal onboarding + annual refresh"`. Cite: contract L152 + inline list L69-72.
    - `training_ai_coverage` — MISSING (conditional on training_status starts with "Yes"). ADDED as `"Yes — explicitly covers AI tools"`. Cite: contract L172-174 + inline list L73-76.
    - `tool_instruction` — `"Documented policy"` NOT in `TOOL_INSTRUCTION` → `"Yes, written policy with specific prohibitions"`. Cite: contract L153 + inline list L77-80.
    - `dpa_status` — `"All vendors"` NOT in `DPA_STATUS` → `"Yes, all vendors"`. Cite: contract L154-156 + inline list L81-83.
    - `dpa_art28_verified` — MISSING (conditional on dpa_status ∈ {"Yes, all vendors","Most vendors"}). ADDED as `"Yes — verified"`. Cite: contract L175-177 + inline list L84.
    - `transfer_status` — EU: `"Yes, with SCCs and TIAs in place"` NOT in `TRANSFER_STATUS` → `"Yes, other non-adequate countries"` (best fit for non-US non-adequate transfers with SCCs+TIAs; SCCs+TIAs preserved in `additional_context`). US: `"No (US-only operations)"` → `"n/a"` (form emits `"n/a"` when `eu_uk_data === "No"`, per L213). Cite: contract L157-159 + form L213.
    - `transfer_mechanism` — MISSING EU (conditional on transfer_status ∈ US-based / other-non-adequate). ADDED as `"EU Standard Contractual Clauses (SCCs)"`. US: `"n/a"` (mirrors transfer_status). Cite: contract L178-180 + inline list L92-98.
    - `technical_controls` — MISSING (required-always). ADDED as `"Yes — DLP/content filtering actively enforced"`. Cite: contract L160 + inline list L99-103.
    - `technical_controls_list` — MISSING (conditional on technical_controls ∈ "Yes — DLP …"/"Partial …"). ADDED as `["DLP rules","Content filtering","Endpoint upload restrictions"]`. Cite: contract L161-163 + inline list L104-107.
    - `dsr_capability` — MISSING (required-always). ADDED as `"Yes — documented and tested across all vendors"`. Cite: contract L164 + inline list L108-112.
    - `dsr_rights_tested` — MISSING (conditional on dsr_capability ∈ "Yes — documented and tested …"). ADDED as `["Access","Erasure","Portability","Rectification"]`. Cite: contract L165-167 + inline list L113.
    - `inventory_audit` — MISSING (required-always). ADDED as `"Yes — audited + formal approval process"`. Cite: contract L168 + inline list L114-118.
    - `additional_context` — narrative, optional. POPULATED to preserve every dropped/normalized item verbatim (sector prose; jurisdictional overlays Ireland DPA 2018 / Colorado CPA / Virginia VCDPA / Illinois BIPA; tools Shopify Plus / ShipHero WMS / Salesforce / Snowflake; data-category glosses Order history / internet-network activity / fingerprint-timeclock BIPA driver; special-category gloss fingerprint templates; TIA supplement to SCCs). Cite: contract L181.
    - `sample_run` — UNKNOWN top-level key. Live-form audit: NOT emitted by `buildIntake()` (`GovernanceAssessment.tsx` L200-224) and NOT written on the `.insert({...})` payload at L237-247. `rg` confirms only occurrences were the two fixture literals. Classification: **fixture-only marker with no consumers** → REMOVED from both fixtures. No showcase content to preserve.
  - **`ALLOWED_TOPLEVEL_EXTRAS` change:** NONE for governance. The audited surface is `insert.intake_data`; row-level extras (`status`, `user_id`, `client_id`, `is_subscriber_credit`, etc.) do not flow through this validator run.
  - **Advisory-tool set flip:** `governance` REMOVED from `SAMPLE_ADVISORY_TOOLS` in `supabase/functions/_tests/contract-surface-audit.test.ts`; counter comment updated to `Reconciled so far: cppa_risk (1/8), cppa_admt (2/8), cppa_cyber (3/8), dpia (4/8), li_assessment (5/8), governance (6/8).` Remaining ADVISORY set: `dpa`, `ir_playbook`, `biometric`.
  - **No validator/rubric/contract weakening.** No golden edits. No edge-function changes. No sample-report regen click (REGEN flag only, see §6).
- **Tests (green — pasted):**

  ```text
  $ deno test --allow-all supabase/functions/_tests/contract-surface-audit.test.ts
  running 3 tests from ./functions/_tests/contract-surface-audit.test.ts
  contract-surface-audit / golden fixtures validate ... ok (3ms)
  contract-surface-audit / pinned contract-scenario fixtures validate ... ok (0ms)
  contract-surface-audit / sample-report fixtures validate ... ok (4ms)
  ok | 3 passed | 0 failed (14ms)
  ```
  ADVISORY drift log now lists 5 rows (2× ir_playbook, 2× biometric, 1× biometric-supplemental); NO governance rows appear in either the ADVISORY set or the FATAL failures set.

  ```text
  $ bunx vitest run src/lib/__tests__/sampleFixtures.shape.test.ts
  Test Files  1 failed (1)
       Tests  2 failed | 50 passed (52)
  ```
  Both failures = pre-existing `cppa_cyber/us-supplemental` (missing `company_name`, `profile_industry`, `profile_audit`, `industry_sector`) — from TURN A supplemental clone; explicitly OUT OF SCOPE per this dispatch. All 4 governance-related assertions (EU/US × carries-intake / carries-required-keys) PASS.
- **Deploy:** none this turn.

## 5. Sample-Report Register

| Product | Assessment ID | Status | Report | Updated |
|---|---|---|---|---|
| cppa-risk | `fa5b36e2-20a9-485a-ba08-a66c59bd186f` | complete | ✅ | 2026-07-24 11:52:20Z |
| cppa-admt | `8f6b316d-cc1e-4f08-867c-b2c771e8efd3` | complete | ✅ | 2026-07-24 11:53:48Z |
| cppa-cyber | `7e70e8a6-ce22-409b-9540-7fb6f9c2815d` | complete | ✅ | 2026-07-24 11:52:32Z |

**Recovery batches (terminal):**
- `5e0558f3` — launched ~12:01Z; **COMPLETE at 2026-07-24T12:16:46Z**. Deploy locks released. Wave-10 lost reads reclaimed. Instrument `gc-2026-07-24-s3-eu-uk-ca-au-sg`. Results:
  - **cppa-risk** run 123 (quality_run `c0d7fd2a`) — overall **84.55** / GPT 89, checks 69/75.
  - **cppa-cyber** run 104 (quality_run `be400771`) — overall **83.60** / GPT 86, checks 50/60.

### Batch 5e0558f3 digest (CPPA recovery reads)

- **cppa-cyber HIGH — citation** (doc `fdf1f109`): malformed unresolved placeholder `"11 CCR § 7123(c)(N)"` appears verbatim in Authentication, Audit-log management, and Segmentation remediation — template variable not substituted in `run-cppa-cybersecurity` output path. **FIXED by TURN A deploy 12:25Z; verify at wave 11 re-measure.**
- **cppa-cyber HIGH — hallucination** (doc `54602516`): exec summary asserts "mean score of 81 across all 18 scored components" not verifiable from visible output; also miscounts controls "Implemented or Mature". **FIXED by TURN A deploy 12:25Z; verify at wave 11 re-measure.**
- **cppa-cyber MEDIUM ×2** (doc `fdf1f109`): near-identical boilerplate remediation across 16/18 controls; actionability lacks cohort deadlines (e.g. April 1, 2028 >$100M cohort), artefact specificity, and owners.
- **cppa-risk HIGH — hallucination** (doc `fcbcc203`): `inconsistency_flags` attributes `q5b_profiling_observation` value to `sensitive_location_basis` (actual intake: "Not applicable — no sensitive-location processing") — intake field cross-attribution. **FIXED by TURN B deploy 12:39Z; verify at wave 11 re-measure.**
- **cppa-risk HIGH — hallucination** (doc `1b32c6a9`): risk register states "profiling/inference generation confirmed" derived from `i1_processing_purpose` which does not state it — overclaiming from intake. **FIXED by TURN B deploy 12:39Z; verify at wave 11 re-measure.**
- **Note on counts:** `quality_findings` rows log ALL check results; `severity` = check tier, `passed` = outcome. The 6 critical-tier rows on cppa-risk are `passed=true` (qc_r1_1, qc_r1_4 PASSED on all 3 docs). Failure counts: cppa-risk **2 high**; cppa-cyber **2 high + 2 medium**.

### Wave 11 + Wave 12 (campaign `fd1be147`)

- **Wave 11 batch `3a22d2f8`** (launched 13:30:03Z): orchestrator isolate death ~13:42Z (heartbeat stopped after `cppa-risk` dispatch). `dpia` run 116 + `cppa-risk` run 124 completed independently; `cppa-admt` run 100 orphaned/failed; `cppa-cyber` never dispatched. Row reconciled 16:50:39Z (`status=cancelled`, `phase=done`, `last_error` populated) per wave-10 precedent. **SECOND orchestrator isolate death in one day** — raises priority of DS-T2b orchestrator→`delivery_contracts` wiring (still queued between waves).
- **Wave 12 batch `a289c96e`** (15:45:02→16:14:55Z, COMPLETE): instrument `gc-2026-07-24-s3-eu-uk-ca-au-sg` (frozen hash maintained), N=3/tool. Scores (overall / GPT / checks / dims acc-cit-hall-ana-int-fmt):
  - `cppa-admt` run 101: **84.95** / 85 / 121-131 / 88-81-84-87-85-85
  - `cppa-risk` run 125: **85.30** / 89 / 67-75 / 84-88-87-81-84-90
  - `cppa-cyber` run 105: **85.45** / 91 / 49-58 / 85-87-88-81-81-83
  - `dpia` run 117: **86.25** / 89 / 39-50 / 85-88-88-84-83-91
- **gate_v2:** NO tool passes wave 12 (all dims ≥90 required; only formatting reaches 90-91 anywhere). Certification counters: 0 consecutive for all tools; critical/high survivors present (admt 1 critical + 4 high; risk 4 high; cyber 3 high; dpia 4 high).
- **ADMT trajectory callout:** wave 11 read lost (orphaned run 100); wave 12 = 84.95, lowest CPPA score, citation dim 81 worst-in-batch; NEW regression — W9 pre-emit wiring leaks internal diagnostic objects into customer output (also exposes the future-dated w9 stamp). Trajectory NEGATIVE this wave; TURN C is the recovery path.
- **TURN A/B verification (wave-12 re-measure):** cyber placeholder + mean-score hallucination FIXED (not observed); risk `sensitive_location` cross-attribution FIXED (not observed). New distinct defects logged in TURNs C/D/E scopes — ruthless attribution: these are new/mutated failure modes, not regressions of the shipped fixes.

## 6. Carry-Forward Registers

- **Sample-Report Register** — see §5.
- **REGEN-NEEDED (samples-contract):** `cppa_risk` (1/8), `cppa_admt` (2/8), `cppa_cyber` (3/8), `dpia` (4/8), `li_assessment` (5/8), `governance` (6/8), `ir_playbook` (7/8). Regen click deferred to end-of-program walk-through (admin-UI click — queued for morning per overnight standing order §1).
- **Build-stamp restamp deferral:**
  - W6 scrubbers (admt/risk) — held until after wave 8 completes (T2-S3-VERIFY-1). Wave 10 landed; may be considered after wave 11 measurement.
  - W6 cyber — SUPERSEDED this turn by `w10-cyber-a1a2` (fresh-clock stamp).
  - W9 admt (`w9-admt-preemit` marker future-dated) — **DISCHARGED 2026-07-24T17:11:54Z** at TURN C deploy (fresh-clock stamp `w12-admt-turnc@2026-07-24T17:10:43Z`, boot log confirmed).
- **L5 backlog:** 85 aggregate rows, 0 unclassified. Standard cron continues.
- **Sentinel gap:** orchestrator runs not yet registered as `delivery_contracts` (DS-T2 sweep would not catch orchestrator isolate death). Wiring queued between waves.

## 7. Incident Log

### 2026-07-24 — Split-Brain Green-Light on ADMT-FIX-W9
- **Timeline:** Digest-analysis controller placed ADMT-FIX-W9 on HOLD (plan-only, pending diagnosis). A sibling controller filed and independently green-lit the fix on its own gate. Deploy of `run-admt-checker` landed ~11:49Z coincident with in-flight customer generation `8f6b316d` (invoked 11:47Z).
- **Outcome (fortunate):** All three in-flight sample generations reached `complete` with valid reports. No isolate death observed on the customer path.
- **Root cause:** Controllers shared no readable state; HOLD was not durable outside its originator's session. Sibling turn also skipped the re-read-sandbox-clock-before-stamping practice — third occurrence — producing a future-dated `@…T12:30:00Z` build marker.
- **Remediation:** This ledger. Standing header rule (read before dispatch). Deploy Locks §3 include the in-flight customer-run check, not batches only. Stamp doctrine reasserted in header and applied to §4 timestamps.

### 2026-07-24 — Wave-10 Orchestrator Stall (batch `2ec63cd3`)
- Isolate died 11:15:27Z after `cppa-risk` termination; `dpia`+`admt` completed independently; `cppa-cyber` never dispatched.
- **Reconciliation status: COMPLETE.** Row reads `status=cancelled`, `phase=done`, `completed_at=11:52:01Z`, `last_error` populated. `cancel_requested=true` preserved as a historical marker. No action outstanding.
- Recovery batch `5e0558f3` (see §5) now underway to reclaim the lost cppa-risk and cppa-cyber reads.
- DS-T2 sentinel would **not** have caught this (orchestrator runs not yet contracts).

### 2026-07-24 — Stale-Clone Queue Insertion (BATCH-5e0558f3-EXTRACT)
- **Timeline:** A tick controller drafted a queue insert from clone `e724d19` (12:07Z) and inserted `CPPA-CYBER-FIX-CN-PLACEHOLDER` as the next item. The insert was unaware that `RECOVERY-BATCH-FIXES / TURN A` — already green-lit and shipping the same placeholder fix plus deterministic aggregates — was deployed at 12:25Z. TURN B (`cppa-risk` field cross-wiring) was briefly demoted behind the duplicate item.
- **Outcome:** Duplicate work item removed; TURN B restored as NEXT within the same tick (~5 minutes). No code deployed or execution started for the duplicate.
- **Root cause:** Controller read the ledger at tick start and did not re-clone before dispatching an insert, while another parallel turn completed its work and updated the ledger in between.
- **Remediation:** Reinforces the standing header rule: **re-clone immediately before dispatch, not at tick start.** All controllers must read `docs/pipeline-state.md` from a fresh clone before acting.

### 2026-07-24 — Duplicate Courier Dispatch on SAMPLES-CONTRACT-lia
- A tick controller re-cloned at 12:50:10Z (HEAD `8b3fed9`, NEXT = `SAMPLES-CONTRACT-lia (5/8)`), spent ~4 minutes on fixture-drift analysis, and dispatched the 5/8 courier at ~12:54Z. A parallel controller had already completed 5/8 at 12:53:21Z (commit `d7efef9`) inside that window. The executing session made revised edits (duplicate) and committed them as `4fbf7e3b` — including a `potential_harm` change `"Severe"` → `"Moderate"` and additions of `stage`/`status`/`preview_signal` to `ALLOWED_TOPLEVEL_EXTRAS`. Supersede notice arrived ~13:00Z; the duplicate edits were reverted to the `d7efef9` state (files `src/lib/sampleFixtures.ts` and `supabase/functions/_shared/intake-contracts/validate.ts` restored) at 13:03:07Z. The landed rubric value `"Severe"` stands as the turn of record.
- Root cause: final re-clone happened before analysis/composition, not immediately before send. The stale-clone remediation ("re-clone immediately before dispatch") must mean: compose first, then fresh-clone verify the queue item is still open, then send within the same minute.
- Remediation (standing): controllers compose the courier message BEFORE the final clone check; the final check verifies ledger "Last updated" stamp and queue state; any stamp movement aborts the send.

## 8. While-You-Slept (overnight standing-order run log)

Rolling log for the CEO morning report. Append newest-first; each entry: real-clock stamp, turn slug, one-line result, and any HOLD/queue implication.

- 2026-07-24T18:16:05Z — `SAMPLES-CONTRACT-ir_playbook (7/8)` DONE (frontend/test only, no deploy). Reconciled `F_IR_EU` (`invoke_body_extras`) + `F_IR_US` (`invoke_body`) against `irPlaybookContract`: added missing required `organizationName` to both variants; normalized 5 drifted values per fixture to IR_CAUSES / IR_DATA_TYPES / IR_COUNTS / IR_CONTAINED / IR_ORG_TYPES literals (EU cause→"Ransomware or malware"; EU dataTypes→["Names and contact details"]; EU affectedCount→"1,000–10,000"; EU contained→"Yes"; EU orgType→"Company"; US cause→"Phishing / credential compromise"; US dataTypes→["Names and contact details","Biometric data"]; US affectedCount→"1,000–10,000"; US contained→"Yes"; US orgType→"Company"); preserved every dropped/normalized string verbatim in each fixture's non-audited `scenario_summary`. Live-form audit of `IRPlaybook.tsx` (form state L91-97; `.functions.invoke` L144) confirmed the form emits only the 10 contract keys — no unknown-key STOP triggered. `ir_playbook` FLIPPED out of `SAMPLE_ADVISORY_TOOLS` → FATAL; counter now 7/8; remaining ADVISORY set: `dpa`, `biometric`. `contract-surface-audit` 3/3 ok (no ir_playbook rows in ADVISORY or FATAL); `sampleFixtures.shape` 50/52 (2 failures = pre-existing `cppa_cyber/us-supplemental`, out of scope). `SAMPLES-CONTRACT-biometric (8/8)` promoted to NEXT. REGEN-NEEDED += ir_playbook (7/8).
- 2026-07-24T17:57:23Z — `SAMPLES-CONTRACT-governance (6/8)` DONE (frontend/test only, no deploy). Reconciled F_GOV_EU + F_GOV_US intake against `governanceContract`: normalized 8 drifted enums per fixture to contract literals; added 3 missing required-always keys (`technical_controls`, `dsr_capability`, `inventory_audit`) + visible conditional slots; removed `sample_run: true` (verified NOT emitted by `GovernanceAssessment.tsx buildIntake()` L200-224; no consumers); preserved every dropped item verbatim in `additional_context`. No `ALLOWED_TOPLEVEL_EXTRAS` change (audited surface is `insert.intake_data`, not the row root). `governance` FLIPPED out of `SAMPLE_ADVISORY_TOOLS` → FATAL; counter now 6/8. `contract-surface-audit` 3/3 ok (no governance rows in ADVISORY or FATAL sets); `sampleFixtures.shape` 50/52 (2 failures = pre-existing cppa_cyber/us-supplemental, out of scope). `SAMPLES-CONTRACT-ir_playbook (7/8)` promoted to NEXT. `REGEN-NEEDED` register now carries governance (6/8); regen click stays deferred to end-of-program walk-through.
- 2026-07-24T17:34:54Z — `WAVE12-FIX TURN E` (cppa-cyber) DEPLOYED with fresh-clock BUILD_STAMP `w12-cyber-turne@2026-07-24T17:32:35Z`. E1a root-cause splitter fix + orphan-prep rollback in `_w6_cyber_fix.ts`; E1b defensive sanitizer `_w12_cyber_e1.ts` (fragments/parens/dupes) wired into terminal emit; telemetry sequestered under `_meta.internal.crosswalk`. TURN A retro-audit: intact. 45/45 tests green. MEDIUM boilerplate deferred. `SAMPLES-CONTRACT-governance (6/8)` promoted to NEXT.
- 2026-07-24T17:12:11Z — `WAVE12-FIX TURN C` (cppa-admt) DEPLOYED with fresh-clock BUILD_STAMP `w12-admt-turnc@2026-07-24T17:10:43Z` (boot log confirms `[run-admt-checker] boot build_stamp=w12-admt-turnc@2026-07-24T17:10:43Z` at 17:11:54Z). C1 metadata strip (leak-guard test 2/2), C2 fabricated `access_timeline` row removed + neutral placeholder path, C4 §7001 chain dedupe. W9 restamp deferral DISCHARGED. C3 deferred to next digest with proposition roster. TURN D promoted to NEXT.
- 2026-07-24T16:56:21Z — WAVE-11 reconciled (isolate death #2) + WAVE-12 digest extracted; no gate_v2 pass; CPPA fix turns C/D/E queued ahead of governance 6/8; TURN A/B fixes verified effective on wave-12 re-measure.
- 2026-07-24T12:58:36Z — `SAMPLES-CONTRACT-lia (5/8)` REVISED per team-reviewed dispatch — DONE (frontend/test only, no deploy). Live-form audit resolved `stage`/`status`/`preview_signal` as mechanical row columns → allowlisted in `validate.ts` and restored in fixture; `potential_harm` corrected `"Severe"` → `"Moderate"` per counsel reading; ADVISORY drift 10 → 8; `li_assessment` now FATAL-tier. Regen queued (admin-UI, morning).
- 2026-07-24T12:53:21Z — `SAMPLES-CONTRACT-lia (5/8)` initial pass — SUPERSEDED by 12:58:36Z revision (missed mechanical-row-key form audit and used Severe over Moderate).
