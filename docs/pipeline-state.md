# Pipeline Coordination Ledger

**Purpose:** Single source of truth for parallel pipeline controllers (this session, scheduled ticks, human dispatchers). Read this file from a fresh clone BEFORE dispatching, green-lighting, or deploying. A green-light contradicting an ACTIVE HOLD must name the hold and state why it is released.

**Stamp doctrine:** Re-read the sandbox clock (`date -u`) immediately before writing any timestamp — including this ledger's "Last updated" field and any function BUILD_STAMP. Never carry a stamp forward from an earlier turn.

**Last updated:** 2026-07-24T13:03:07Z — STAND-DOWN / SUPERSEDE on duplicate `SAMPLES-CONTRACT-lia (5/8)` dispatch; uncommitted revised edits reverted to `d7efef9` state.

---

## 1. Active Holds

_None at this time._

Historical release: `ADMT-FIX-W9` released with wave-10 spec amendments and shipped as `run-admt-checker` build stamped `w9-admt-preemit` (real deploy ~11:49Z; the in-code `@…T12:30:00Z` marker is future-dated — restamp at admt's next deploy per stamp-doctrine correction).

## 2. Queue Order (as currently dispatched)

1. **DONE PRIOR TURN** — `RECOVERY-BATCH-FIXES / TURN A` (cppa-cyber A1 + A2) — deployed 12:25Z.
2. **DONE PRIOR TURN** — `RECOVERY-BATCH-FIXES / TURN B` (cppa-risk B1a field-provenance + B1b claims guard) — deployed 12:39Z.
3. **DONE PRIOR TURN** — `SAMPLES-CONTRACT-dpia` (4/8) — frontend/test only, no deploy.
4. **DONE THIS TURN** — `SAMPLES-CONTRACT-lia` (5/8) — frontend/test only, no deploy.
5. **NEXT** — `SAMPLES-CONTRACT-governance` (6/8). Frontend-only; not deploy-locked.
6. Then — `-ir_playbook` → `-biometric` → `-dpa` (7/8, 8/8, then 9/8-out-of-8 dpa closes the series — note: series is 8 tools, dpa is #8).
7. After 8/8 — `REGISTRATION-INTAKE-CONTRACT-RAIL-MAP` (pre-approved authoring turn per overnight standing order: shared contract + rail-map + corpus-cited rails + dummy data).
8. Deferred — orchestrator → `delivery_contracts` wiring (queued between waves, see §6 sentinel gap).
9. Deferred — W9 admt build restamp (bundled with next admt deploy).

_Note:_ `CPPA-CYBER-FIX-CN-PLACEHOLDER` is **SUPERSEDED** — identical scope shipped as TURN A. Do not re-queue.

## 3. Deploy Locks

**Standing rule:** Deploying any edge function requires:
- (a) No in-flight customer-path generation on that function — query the relevant product table for rows created in the last 15 minutes with a NULL report/document payload.
- (b) No `quality_batch_runs` row in `running` or `pending` status that dispatches the function.

If either check returns a row, the deploy WAITS until the run reaches a terminal state (`complete`, `error`, `cancelled`).

**Current lock state (2026-07-24T12:53:21Z):**
- All functions **unlocked**. No deploys this turn (frontend/test files only).
- Wave 11 (~13:15Z) will re-lock risk/cyber/admt when it launches.

## 4. Last Completed Turn

- **Turn:** `SAMPLES-CONTRACT-lia` (5/8) — revised in-turn per team-reviewed dispatch (form-parity resolution of mechanical row keys + harm-severity correction).
- **Real-time:** 2026-07-24T12:58:36Z (sandbox `date -u`)
- **Scope (frontend/test only, no edge deploy):**
  - Reconciled `F_LIA_UK` in `src/lib/sampleFixtures.ts` against `liAssessmentStageBContract`. `F_LIA_UK_SUPP` inherits the reconciliation via `withSupplemental`'s JSON deep-clone (no separate edit).
  - **Live-form audit** for the four ambiguous top-level keys (LIAssessment.tsx L158 = Stage-A `.insert({...})`; LIAssessmentIntake.tsx L270-311 = Stage-B intake_data):
    - `stage` — **mechanical row column** (Stage A writes `"preview"`, Stage B intake_data flips to `"submitted"`). Added to `ALLOWED_TOPLEVEL_EXTRAS` in `_shared/intake-contracts/validate.ts` with citation comment; **restored** in fixture as `"submitted"` (post-submit truth).
    - `status` — **mechanical row column** (Stage A writes `"pending"`). Added to `ALLOWED_TOPLEVEL_EXTRAS`; **restored** in fixture as `"pending"`.
    - `preview_signal` — **mechanical row column** (Stage A writes preview-fn payload to the row; not intake content emitted by the Stage-B form). Added to `ALLOWED_TOPLEVEL_EXTRAS`; **restored** in fixture with realistic showcase payload.
    - `sector` — **not emitted by either form**. Correctly removed from the fixture; sector text preserved verbatim inline in `processing_description` prose so showcase content survives.
  - `preview_assessment_id` — Stage-B form always posts `preview_assessment_id: row.id` (LIAssessmentIntake.tsx L311). Fixture now supplies `"sample-preview-lia-uk-000"` (contract-required, form-emitted). Contract's required-always flag left untouched.
  - Normalised `data_categories` to `LI_DATA_CATEGORIES` enum values (`"Location data"`, `"Health or medical data"`, `"Employment data"`) with the "beacon-proximity zone" descriptor folded into an `"Other: …"` element as the contract expressly permits (see contract comment L48-51). "Employee records" retagged to `"Employment data"` (LIA enum) rather than the DPIA-only "Employee records" enum; parenthetical specifics preserved in `processing_description`.
  - Normalised `relationship_type` from `"Employee (existing employment relationship)"` → enum literal `"Employee"`; the "existing employment relationship" gloss remains in `processing_description`.
  - Split `balancing_details.reasonable_expectation` into enum literal `"Partly"` + full original sentence moved verbatim into `reasonable_expectation_detail` (optional narrative slot).
  - Split `balancing_details.potential_harm` into enum literal **`"Moderate"`** (per dispatch: pseudonymisation + purpose-limitation + works-council oversight materially reduce residual severity below Severe) + full original sentence moved verbatim into `potential_harm_detail`, with the safeguard-rationale appended.
  - Renamed `purpose_details.purpose_text` → `interest_statement` (actual contract slot per L79); `balancing_details.balancing_text` → `additional_context` (actual contract slot per L112).
  - `_shared/intake-contracts/validate.ts` — added three LIA mechanical row-infrastructure keys to `ALLOWED_TOPLEVEL_EXTRAS` with inline citations to LIAssessment.tsx L158 / LIAssessmentIntake.tsx L310. **No validator/rubric/contract weakening** — allowlist only expanded for mechanical row columns whose emission is verified in the form source.
  - Flipped `li_assessment` out of `SAMPLE_ADVISORY_TOOLS` in `_tests/contract-surface-audit.test.ts` → **FATAL** tier. Counter comment: `Reconciled so far: cppa_risk (1/8), cppa_admt (2/8), cppa_cyber (3/8), dpia (4/8), li_assessment (5/8).`
- **Tests (green — pasted):**
  - `supabase/functions/_tests/contract-surface-audit.test.ts` — `3 passed | 0 failed (18ms)`. `li_assessment:uk` and `li_assessment:uk-supplemental` absent from ADVISORY list; ADVISORY count 10 → 8, confined to `governance`, `ir_playbook`, `biometric` per dispatch (dpa has no advisory row currently — the DPA fixture path validates without violations under the current sampleMap).
  - `src/lib/__tests__/sampleFixtures.shape.test.ts` — 50 passed / 2 failed. Both failures are on `cppa_cyber/us-supplemental` (missing `company_name, profile_industry, profile_audit, industry_sector` at supplemental top level — pre-existing from TURN A supplemental clone; NOT introduced by this turn). All 4 `li_assessment/*` shape assertions PASS.
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

## 6. Carry-Forward Registers

- **Sample-Report Register** — see §5.
- **REGEN-NEEDED (samples-contract):** `cppa_risk` (1/8), `cppa_admt` (2/8), `cppa_cyber` (3/8), `dpia` (4/8), `li_assessment` (5/8). Regen click deferred to end-of-program walk-through (admin-UI click — queued for morning per overnight standing order §1).
- **Build-stamp restamp deferral:**
  - W6 scrubbers (admt/risk) — held until after wave 8 completes (T2-S3-VERIFY-1). Wave 10 landed; may be considered after wave 11 measurement.
  - W6 cyber — SUPERSEDED this turn by `w10-cyber-a1a2` (fresh-clock stamp).
  - W9 admt (`w9-admt-preemit` marker future-dated) — restamp at admt's next deploy (no solo redeploy).
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

## 8. While-You-Slept (overnight standing-order run log)

Rolling log for the CEO morning report. Append newest-first; each entry: real-clock stamp, turn slug, one-line result, and any HOLD/queue implication.

- 2026-07-24T12:58:36Z — `SAMPLES-CONTRACT-lia (5/8)` REVISED per team-reviewed dispatch — DONE (frontend/test only, no deploy). Live-form audit resolved `stage`/`status`/`preview_signal` as mechanical row columns → allowlisted in `validate.ts` and restored in fixture; `potential_harm` corrected `"Severe"` → `"Moderate"` per counsel reading; ADVISORY drift 10 → 8; `li_assessment` now FATAL-tier. Regen queued (admin-UI, morning).
- 2026-07-24T12:53:21Z — `SAMPLES-CONTRACT-lia (5/8)` initial pass — SUPERSEDED by 12:58:36Z revision (missed mechanical-row-key form audit and used Severe over Moderate).
