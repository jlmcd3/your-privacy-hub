# Pipeline Coordination Ledger

**Purpose:** Single source of truth for parallel pipeline controllers (this session, scheduled ticks, human dispatchers). Read this file from a fresh clone BEFORE dispatching, green-lighting, or deploying. A green-light contradicting an ACTIVE HOLD must name the hold and state why it is released.

**Last updated:** 2026-07-24T12:55:00Z — turn `COORD-LEDGER-1`

---

## 1. Active Holds

_None at this time._

Historical release: `ADMT-FIX-W9` (set by digest-analysis controller) was released with wave-10 spec amendments and shipped as `w9-admt-preemit@2026-07-24T12:30:00Z`. See §7 for the coordination incident that motivated this ledger.

## 2. Queue Order (as currently dispatched)

1. **THIS TURN** — `COORD-LEDGER-1` (in progress)
2. **NEXT** — `SAMPLES-CONTRACT-cppa-admt` (reconcile `sampleFixtures.ts` for cppa_admt; flip audit tier to FATAL)
3. Then — `SAMPLES-CONTRACT-cppa-cyber`
4. Then — remaining contracted tools (dpia, lia, governance, ir, biometric, dpa)
5. Deferred — orchestrator → `delivery_contracts` wiring (see §7 sentinel gap)

## 3. Deploy Locks

**Standing rule:** Deploying any edge function requires:
- (a) No in-flight customer-path generation on that function — query the relevant product table for rows created in the last 15 minutes with a NULL report/document payload.
- (b) No `quality_batch_runs` row in `running` or `pending` status that dispatches the function.

If either check returns a row, the deploy WAITS until the run reaches a terminal state (`complete`, `error`, `cancelled`).

**Current lock state (2026-07-24T12:55:00Z):**
- Customer-path in-flight (last 15 min, NULL report): **none** across cppa_assessments, dpia_frameworks, li_assessments, governance_assessments, ir_playbooks, biometric_assessments.
- Batch runs in `running`/`pending`: **none**.
- **All functions unlocked.**

## 4. Last Completed Turn

- **Turn:** `ADMT-FIX-W9` pre-emit deterministic gates
- **Stamp:** `w9-admt-preemit@2026-07-24T12:30:00Z`
- **Artifact:** `supabase/functions/run-admt-checker/_w9_admt_pre_emit_gates.ts`, wired into `run-admt-checker/index.ts`
- **Tests:** 87 green
- **Deploy:** `run-admt-checker` redeployed 11:49Z (see §7 incident)

## 5. Sample-Report Register

| Product | Assessment ID | Status | Report | Updated |
|---|---|---|---|---|
| cppa-risk | `fa5b36e2-20a9-485a-ba08-a66c59bd186f` | complete | ✅ | 2026-07-24 11:52:20Z |
| cppa-admt | `8f6b316d-cc1e-4f08-867c-b2c771e8efd3` | complete | ✅ | 2026-07-24 11:53:48Z |
| cppa-cyber | `7e70e8a6-ce22-409b-9540-7fb6f9c2815d` | complete | ✅ | 2026-07-24 11:52:32Z |

Note: cppa-cyber "not returning by id" was a query artifact; the row exists and completed 11:52:32Z. No data loss.

## 6. Carry-Forward Registers

- **Sample-Report Register** — see §5 (moved from report-text-only).
- **REGEN-NEEDED (samples-contract):** `cppa_risk` (reconciled 2026-07-24; regenerate showcase output on next content pass).
- **W6 restamp deferral:** admt/risk/cyber W6 scrubbers held until after wave 8 completes (per CEO ruling T2-S3-VERIFY-1). Wave 10 has landed; W6 restamps may be considered after wave 11 measurement lands.
- **L5 backlog:** 85 aggregate rows, 0 unclassified. Next classify tick scheduled with standard cron.
- **Sentinel gap:** orchestrator runs not yet registered as `delivery_contracts` (DS-T2 sweep would not catch orchestrator isolate death). Wiring queued between waves.

## 7. Incident Log

### 2026-07-24 — Split-Brain Green-Light on ADMT-FIX-W9
- **Timeline:** Digest-analysis controller placed ADMT-FIX-W9 on HOLD (plan-only, pending diagnosis). A second controller filed and independently green-lit the fix on its own gate. Deploy of `run-admt-checker` (stamp `w9-admt-preemit`) landed 11:49Z, coincident with in-flight customer generation `8f6b316d` (invoked 11:47Z).
- **Outcome (fortunate):** All three in-flight sample generations (`fa5b36e2`, `8f6b316d`, `7e70e8a6`) reached `complete` with valid reports. No isolate death observed on the customer path.
- **Root cause:** Controllers shared no readable state. HOLD was not durable outside its originator's session.
- **Remediation:** This ledger. Standing rule in header. Deploy Locks (§3) now includes in-flight customer-run check, not batches only.

### 2026-07-24 — Wave-10 Orchestrator Stall (batch `2ec63cd3`)
- Isolate died 11:15:27Z after `cppa-risk` termination; `dpia`+`admt` completed independently; `cppa-cyber` never dispatched.
- **Reconciliation status: COMPLETE.** Row now reads: `status=cancelled`, `phase=done`, `completed_at=11:52:01Z`, `last_error` populated with post-mortem. `cancel_requested=true` preserved as historical marker. No action outstanding.
- DS-T2 sentinel would **not** have caught this (orchestrator runs not yet contracts).
