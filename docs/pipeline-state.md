# Pipeline Coordination Ledger

**Purpose:** Single source of truth for parallel pipeline controllers (this session, scheduled ticks, human dispatchers). Read this file from a fresh clone BEFORE dispatching, green-lighting, or deploying. A green-light contradicting an ACTIVE HOLD must name the hold and state why it is released.

**Stamp doctrine:** Re-read the sandbox clock (`date -u`) immediately before writing any timestamp — including this ledger's "Last updated" field and any function BUILD_STAMP. Never carry a stamp forward from an earlier turn.

**Last updated:** 2026-07-24T17:55:49Z — `SAMPLES-CONTRACT-governance` (6/8) DONE (frontend/test only, no deploy). Reconciled `F_GOV_EU` + `F_GOV_US` in `src/lib/sampleFixtures.ts` against `governanceContract` (audited surface `insert.intake_data`); normalized 8 drifted enum values per fixture to contract literals; added 3 missing required-always keys (`technical_controls`, `dsr_capability`, `inventory_audit`) plus the visible conditional slots for showcase realism; removed the `sample_run: true` marker (verified NOT emitted by `GovernanceAssessment.tsx` `buildIntake()` L200-224; no downstream consumers via rg); preserved every dropped item verbatim in `additional_context` (Ireland DPA 2018, Shopify Plus, ShipHero WMS, Order history; Colorado CPA, Virginia VCDPA, Illinois BIPA, Salesforce, Snowflake, fingerprint-timeclock BIPA driver, internet/network activity). No `ALLOWED_TOPLEVEL_EXTRAS` change needed (audited surface is `insert.intake_data`, not the row root). Flipped `governance` out of `SAMPLE_ADVISORY_TOOLS` → FATAL tier; counter updated to 6/8. **Tests green:** deno `contract-surface-audit.test.ts` 3/3 ok (governance absent from both ADVISORY and FATAL lists; ADVISORY now confined to `ir_playbook` + `biometric` per dispatch — `dpa` remains listed but currently has no drift row); vitest `sampleFixtures.shape.test.ts` 50 passed / 2 failed (both failures = pre-existing `cppa_cyber/us-supplemental`, OUT OF SCOPE per dispatch). No edge deploy this turn.

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
9. **NEXT** — `SAMPLES-CONTRACT-governance` (6/8). Frontend-only; not deploy-locked. **Fold in:** fix the 2 pre-existing `cppa_cyber/us-supplemental` shape-test failures (`company_name`, `profile_industry`, `profile_audit`, `industry_sector` missing at supplemental top level — pre-existing from TURN A supplemental clone).
10. Then — ADMT registry corpus-anchored corrections, batched by section (§ 7001 defs+FSOR overlays; § 7150/7155/7157 RA; § 7200; § 7220 notice; § 7221 opt-out; § 7222 access; Civ. Code § 1798.140/§ 1798.185). Each correction turn extracts actual subsection text from `cppa_authorities.full_text`, rewrites the row, removes the key from `KNOWN_PARAPHRASED_KEYS`. Target: set empty.
11. Then — `-ir_playbook` → `-biometric` → `-dpa` (7/8, 8/8, then dpa closes the series).
11. After samples 8/8 — `REGISTRATION-INTAKE-CONTRACT-RAIL-MAP` (pre-approved authoring turn per overnight standing order: shared contract + rail-map + corpus-cited rails + dummy data).
12. Deferred — orchestrator → `delivery_contracts` wiring (queued between waves; priority raised — second isolate death in one day, see §5-adjacent).
13. Deferred — WAVE12-FIX TURN C / C3 (fallback-density expansion) — needs wave-12 propositional list; queue for morning CEO or next wave's finding digest.

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

- **Turn:** `REGISTRY-VERBATIM-AUDIT` (dropped-order restore from courier ACK; anti-drop rule invoked).
- **Real-time:** 2026-07-24T17:51:06Z (sandbox `date -u`).
- **Scope (frontend/test + docs only, no edge deploy):**
  - **ADMT audit** — for each of the 34 rows in `_shared/registry/admt-verified-authorities.ts`, normalized (`smart→straight quote`, `en/em-dash→hyphen`, whitespace collapse) both the `verbatim_quote` and the corresponding `cppa_authorities.full_text WHERE status='current'`, then tested substring match. **0/34 EXACT.** Fallback 80-char head/tail windows: 1 head-only, 2 tail-only, **31 NOT_FOUND**. Conclusion: **all 34 seeded rows are paraphrases labelled as `verbatim_quote`** — identical defect class to the TURN C fabricated `§ 7222(c)` row. Two spot examples in the report: `scope_apply` (§ 7200(a)) and `notice_purpose` (§ 7220(c)(1)) both paraphrase language that appears in a different form (or nowhere) in the OAL-approved text.
  - **Biometric audit** — 46/46 rows pass the pinpoint-in-quote CI (self-consistency test in `src/registry/__tests__/biometric-statute-self-consistency.test.ts`); 46/46 supply `https://` `primary_source_url`. Corpus-anchored verification is **infeasible today** — no ingested corpus for BIPA, CUBI, RCW, GDPR, UK GDPR, PIPEDA, Aus Privacy Act, or SG PDPA. Standing risk logged: self-consistency alone cannot reject a paraphrase in a biometric row's `verbatim_quote`. Follow-on program item: ingest biometric primary text so the same CI can extend.
  - **Files shipped this turn:**
    - `docs/courier/REGISTRY-VERBATIM-AUDIT-2026-07-24.md` — full per-row report + method + queued correction turns.
    - `src/registry/__tests__/admt-verified-authorities-corpus-pin.test.ts` — allow-list CI: shells to `psql` (skips when `PGHOST` unset), asserts every row's normalized `verbatim_quote` is a substring of `cppa_authorities.full_text`, carries frozen `KNOWN_PARAPHRASED_KEYS` (all 34 keys enumerated in the courier report). Fails on: (a) any new row failing corpus-pin (regression guard); (b) any listed key starting to pass (forces set to shrink to empty as correction turns land). Uses `describe.skipIf(!CAN_RUN)` so dev/CI without Postgres env vars stay green.
  - **§4 LIA correction** — restored: §4 now reflects the current HEAD state (this turn). Prior §4 text described the STAND-DOWN'd/reverted `SAMPLES-CONTRACT-lia` in-turn revision at commit `d7efef9`; that entry is superseded (LIA 5/8 completion remains logged in §2 item 4).
  - **Standing rule adopted:** *no registry row lands without corpus verification* — extends to any future verified-authority registry (risk, cyber, DPIA, IR).
  - **Ledger anti-drop accounting:** all three dispatched orders resolved this turn — (i) audit + report + CI; (ii) §4 rewrite; (iii) cyber shape-test fix folded into next SAMPLES turn (queued at §2 item 9).
- **Tests (green — pasted):**
  - `src/registry/__tests__/biometric-statute-self-consistency.test.ts` — pre-existing 46-row self-consistency pass; unchanged.
  - `src/registry/__tests__/admt-verified-authorities-corpus-pin.test.ts` — new. Skips in this sandbox (`PGHOST` not exported to the vitest child); will execute against `cppa_authorities` in the CI environment where PG* is set.
- **Deploy:** none this turn (no edge-function or backend code changed).

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
- **REGEN-NEEDED (samples-contract):** `cppa_risk` (1/8), `cppa_admt` (2/8), `cppa_cyber` (3/8), `dpia` (4/8), `li_assessment` (5/8). Regen click deferred to end-of-program walk-through (admin-UI click — queued for morning per overnight standing order §1).
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

- 2026-07-24T17:34:54Z — `WAVE12-FIX TURN E` (cppa-cyber) DEPLOYED with fresh-clock BUILD_STAMP `w12-cyber-turne@2026-07-24T17:32:35Z`. E1a root-cause splitter fix + orphan-prep rollback in `_w6_cyber_fix.ts`; E1b defensive sanitizer `_w12_cyber_e1.ts` (fragments/parens/dupes) wired into terminal emit; telemetry sequestered under `_meta.internal.crosswalk`. TURN A retro-audit: intact. 45/45 tests green. MEDIUM boilerplate deferred. `SAMPLES-CONTRACT-governance (6/8)` promoted to NEXT.
- 2026-07-24T17:12:11Z — `WAVE12-FIX TURN C` (cppa-admt) DEPLOYED with fresh-clock BUILD_STAMP `w12-admt-turnc@2026-07-24T17:10:43Z` (boot log confirms `[run-admt-checker] boot build_stamp=w12-admt-turnc@2026-07-24T17:10:43Z` at 17:11:54Z). C1 metadata strip (leak-guard test 2/2), C2 fabricated `access_timeline` row removed + neutral placeholder path, C4 §7001 chain dedupe. W9 restamp deferral DISCHARGED. C3 deferred to next digest with proposition roster. TURN D promoted to NEXT.
- 2026-07-24T16:56:21Z — WAVE-11 reconciled (isolate death #2) + WAVE-12 digest extracted; no gate_v2 pass; CPPA fix turns C/D/E queued ahead of governance 6/8; TURN A/B fixes verified effective on wave-12 re-measure.
- 2026-07-24T12:58:36Z — `SAMPLES-CONTRACT-lia (5/8)` REVISED per team-reviewed dispatch — DONE (frontend/test only, no deploy). Live-form audit resolved `stage`/`status`/`preview_signal` as mechanical row columns → allowlisted in `validate.ts` and restored in fixture; `potential_harm` corrected `"Severe"` → `"Moderate"` per counsel reading; ADVISORY drift 10 → 8; `li_assessment` now FATAL-tier. Regen queued (admin-UI, morning).
- 2026-07-24T12:53:21Z — `SAMPLES-CONTRACT-lia (5/8)` initial pass — SUPERSEDED by 12:58:36Z revision (missed mechanical-row-key form audit and used Severe over Moderate).
