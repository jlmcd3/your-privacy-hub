# Pipeline Coordination Ledger

**Purpose:** Single source of truth for parallel pipeline controllers (this session, scheduled ticks, human dispatchers). Read this file from a fresh clone BEFORE dispatching, green-lighting, or deploying. A green-light contradicting an ACTIVE HOLD must name the hold and state why it is released.

**Stamp doctrine:** Re-read the sandbox clock (`date -u`) immediately before writing any timestamp — including this ledger's "Last updated" field and any function BUILD_STAMP. Never carry a stamp forward from an earlier turn.

**Last updated:** 2026-07-24T12:48:04Z — turn `SAMPLES-CONTRACT-dpia (4/8)`

---

## 1. Active Holds

_None at this time._

Historical release: `ADMT-FIX-W9` released with wave-10 spec amendments and shipped as `run-admt-checker` build stamped `w9-admt-preemit` (real deploy ~11:49Z; the in-code `@…T12:30:00Z` marker is future-dated — restamp at admt's next deploy per stamp-doctrine correction).

## 2. Queue Order (as currently dispatched)

1. **DONE PRIOR TURN** — `RECOVERY-BATCH-FIXES / TURN A` (cppa-cyber A1 + A2) — deployed 12:25Z.
2. **DONE PRIOR TURN** — `RECOVERY-BATCH-FIXES / TURN B` (cppa-risk B1a field-provenance + B1b claims guard) — deployed 12:39Z.
3. **DONE THIS TURN** — `SAMPLES-CONTRACT-dpia` (4/8) — frontend/test only, no deploy.
4. **NEXT** — `SAMPLES-CONTRACT-lia` (5/8). Frontend-only; not deploy-locked.
5. Then — `-governance` → `-ir_playbook` → `-biometric` → `-dpa` (6/8 … 8/8).
6. Deferred — orchestrator → `delivery_contracts` wiring (queued between waves, see §6 sentinel gap).
7. Deferred — W9 admt build restamp (bundled with next admt deploy).

_Note:_ `CPPA-CYBER-FIX-CN-PLACEHOLDER` is **SUPERSEDED** — identical scope shipped as TURN A. Do not re-queue.

## 3. Deploy Locks

**Standing rule:** Deploying any edge function requires:
- (a) No in-flight customer-path generation on that function — query the relevant product table for rows created in the last 15 minutes with a NULL report/document payload.
- (b) No `quality_batch_runs` row in `running` or `pending` status that dispatches the function.

If either check returns a row, the deploy WAITS until the run reaches a terminal state (`complete`, `error`, `cancelled`).

**Current lock state (2026-07-24T12:48:04Z):**
- All functions **unlocked**. Customer-path in-flight: none at last check.
- No deploys this turn (frontend/test files only).
- Wave 11 (~13:15Z) will re-lock risk/cyber/admt when it launches.

## 4. Last Completed Turn

- **Turn:** `RECOVERY-BATCH-FIXES / TURN B` (cppa-risk B1a + B1b)
- **Real-time:** 2026-07-24T12:39:11Z (sandbox `date -u`)
- **Scope:**
  - **B1a (field cross-attribution):** new `_w10_risk_b1.ts` — `applyW10RiskB1(report, intake)` flattens the intake tree, extracts every quoted string from each `inconsistency_flags` entry's prose (`description` / `explanation` / `resolution_required` / `detail` / `narrative`), and validates the quoted value against the referenced intake keys (`intake_field_1` / `intake_field_2` / `source_field_a/b` / `source_fields` / `field_key`) using normalised equality-or-substring match. If a quoted value fails validation, the module locates the intake field that actually contains it and extends `source_fields` (with a `_w10_rekeyed` provenance breadcrumb) instead of silently overwriting the model's anchor; if no intake field contains the quote, the flag is **dropped**.
  - **B1b (overclaiming from intake):** same module scans `risk_register`, `executive_summary`, and `risk_assessment_by_activity` narrative surfaces for sentences matching `X (confirmed | is/are performed | is/are conducted | is/are established)` that also name an intake field id (`[iq]\d+[a-z]?_…`, `sensitive_location_basis`, `public_privacy_policy_url`, `impact_intake`, `content_detail.*`). If the subject's ≥4-char tokens are absent from every named field's actual content, the assertion is **downgraded** to conditional phrasing ("is not confirmed by the record and requires verification"). Never weakens a check or rubric — repairs the generator.
  - **Wiring:** `run-cppa-risk-assessment/index.ts` — new import + call immediately after W9 slots and before the `_meta` stamp. Fail-open; telemetry lands on `report._w10_risk_b1 = { stamp, flags_scanned, flags_rekeyed, flags_dropped, claims_scanned, claims_downgraded, claims_removed }`. `_meta.prompt_version` bumped to `w10-risk-b1@2026-07-24`.
- **BUILD_STAMP:** bumped `w9-risk-slots-p1@2026-07-24T09:58:12Z` → `w10-risk-b1@2026-07-24T12:38:00Z` (fresh `date -u` read this turn). Boot log emits it on next invocation.
- **Tests (green):** 35 pass / 0 fail across `_tests/cppa-risk.test.ts` + `run-cppa-risk-assessment/*.test.ts` (6 new B1 pins + 29 existing risk pins). Pins added:
  - `B1a: fcbcc203 mirror — flag attributes q5b value to sensitive_location_basis → re-keyed` (extends `source_fields` with `q5b_profiling_observation`).
  - `B1a: quoted value nowhere in intake → flag DROPPED` (zero survivors).
  - `B1a: quoted value actually matches the referenced field → flag kept unchanged` (no false positives).
  - `B1b: 1b32c6a9 mirror — "profiling/inference generation confirmed" unsupported by i1_processing_purpose → downgraded` (harm text loses the categorical "confirmed").
  - `B1b: supported claim (subject token present in named field) → kept` (no false positives).
  - `W10-RISK-B1 stamp present`.
- **Preexisting failures (NOT introduced by this turn):** `_tests/rebuild-dpia-cpparisk.test.ts` — 2 failures on `REBUILD-DPIA T10a` "M6 cohort → audit-cohort" scrub; test targets a `postScrubCleanup` behaviour independent of B1 surfaces. Logged for a separate DPIA-scrub turn; does not gate TURN B.
- **RETRO-AUDIT (rides this turn):** swept `run-cppa-risk-assessment` for narrative surfaces that quote/attribute intake fields without provenance validation. In-scope surfaces wired through B1a/B1b: `inconsistency_flags[*]`, `risk_register.entries[*]` (all string fields), `executive_summary`, `risk_assessment_by_activity`. Out-of-scope for this turn (no evidence of attribution-error class in batch 5e0558f3 samples; queued as follow-up if a later batch reads flag them): `safeguard_gaps[*]`, `priority_actions[*].rationale`, `exception_analysis[*]`, `benefits_outweigh_risks_rationale`. `strengthen_items` is mechanically derived from `intake_data.assertions` and already provenance-safe by construction.
- **Deploy:** `run-cppa-risk-assessment` deployed 2026-07-24T12:39Z via `supabase--deploy_edge_functions` (single-function deploy; no other function affected). Wave 11 will measure B1 fixes on first re-read.

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
- **REGEN-NEEDED (samples-contract):** `cppa_risk` (1/8), `cppa_admt` (2/8), `cppa_cyber` (3/8). Regen click deferred to end-of-program walk-through.
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
