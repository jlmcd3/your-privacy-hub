# Pipeline Coordination Ledger

**Purpose:** Single source of truth for parallel pipeline controllers (this session, scheduled ticks, human dispatchers). Read this file from a fresh clone BEFORE dispatching, green-lighting, or deploying. A green-light contradicting an ACTIVE HOLD must name the hold and state why it is released.

**Stamp doctrine:** Re-read the sandbox clock (`date -u`) immediately before writing any timestamp — including this ledger's "Last updated" field and any function BUILD_STAMP. Never carry a stamp forward from an earlier turn.

**Last updated:** 2026-07-24T12:02:26Z — turn `SAMPLES-CONTRACT-cppa-admt` (2/8)

---

## 1. Active Holds

_None at this time._

Historical release: `ADMT-FIX-W9` released with wave-10 spec amendments and shipped as `run-admt-checker` build stamped `w9-admt-preemit` (real deploy ~11:49Z; the in-code `@…T12:30:00Z` marker is future-dated — restamp at admt's next deploy per stamp-doctrine correction).

## 2. Queue Order (as currently dispatched)

1. **THIS TURN** — `SAMPLES-CONTRACT-cppa-admt` (2/8) — reconciled, FATAL flipped, green.
2. **NEXT** — `SAMPLES-CONTRACT-cppa-cyber` (3/8) — **BLOCKED by Deploy Lock**: recovery batch 5e0558f3 exercises `run-cppa-cybersecurity`. Frontend-only fixture edits are safe; do not deploy the cyber function until batch terminates. (cppa-cyber fixture reconciliation is frontend-only, so it may proceed; only a cyber-function deploy is locked.)
3. Then — `SAMPLES-CONTRACT-dpia` → `-lia` → `-governance` → `-ir_playbook` → `-biometric` → `-dpa` (4/8 … 8/8).
4. Deferred — orchestrator → `delivery_contracts` wiring (queued between waves, see §7 sentinel gap).
5. Deferred — W9 admt build restamp (bundled with next admt deploy, per stamp-doctrine correction; joins W6 restamp deferral in §6).

## 3. Deploy Locks

**Standing rule:** Deploying any edge function requires:
- (a) No in-flight customer-path generation on that function — query the relevant product table for rows created in the last 15 minutes with a NULL report/document payload.
- (b) No `quality_batch_runs` row in `running` or `pending` status that dispatches the function.

If either check returns a row, the deploy WAITS until the run reaches a terminal state (`complete`, `error`, `cancelled`).

**Current lock state (2026-07-24T12:02:26Z):**
- **LOCKED — `run-cppa-risk-assessment`** and **`run-cppa-cybersecurity`**: recovery batch `5e0558f3` launched ~12:01Z from admin UI (cppa-risk + cppa-cyber, batch_size 3). Lock releases when batch reaches terminal state.
- Customer-path in-flight (last 15 min, NULL report): **none** across cppa/dpia/lia/gov/ir/bio tables at last check (12:02:26Z).
- Other functions: **unlocked**.

## 4. Last Completed Turn

- **Turn:** `SAMPLES-CONTRACT-cppa-admt` (2/8)
- **Real-time:** 2026-07-24T12:02:26Z (sandbox `date -u`)
- **Scope:** Reconciled `src/lib/sampleFixtures.ts` `F_CPPA_ADMT_US` against `_shared/intake-contracts/cppa-admt.ts`. Substituted 9 enum/multi-enum values, removed 1 unknown top-level key (`notice_how_it_works_method`). Flipped `cppa_admt` out of `SAMPLE_ADVISORY_TOOLS` in `_tests/contract-surface-audit.test.ts` (FATAL tier).
- **Tests:** 3/3 green in `contract-surface-audit.test.ts`; `cppa_admt` no longer appears in advisory drift list.
- **Deploy:** N/A (frontend-only).
- **REGEN-NEEDED:** `cppa_admt` sample fixture (regenerate showcase output on next content pass).

## 5. Sample-Report Register

| Product | Assessment ID | Status | Report | Updated |
|---|---|---|---|---|
| cppa-risk | `fa5b36e2-20a9-485a-ba08-a66c59bd186f` | complete | ✅ | 2026-07-24 11:52:20Z |
| cppa-admt | `8f6b316d-cc1e-4f08-867c-b2c771e8efd3` | complete | ✅ | 2026-07-24 11:53:48Z |
| cppa-cyber | `7e70e8a6-ce22-409b-9540-7fb6f9c2815d` | complete | ✅ | 2026-07-24 11:52:32Z |

**Recovery batches in flight:**
- `5e0558f3` — launched ~12:01Z from admin UI; tools=[cppa-risk, cppa-cyber]; batch_size=3. Recovers Wave-10 lost reads. Terminal-state watch active; deploy locks §3 apply until it completes.

## 6. Carry-Forward Registers

- **Sample-Report Register** — see §5 (moved from report-text-only).
- **REGEN-NEEDED (samples-contract):** `cppa_risk` (turn 1/8), `cppa_admt` (turn 2/8). Regenerate showcase output on next content pass.
- **Build-stamp restamp deferral:**
  - W6 scrubbers (admt/risk/cyber) — held until after wave 8 completes (T2-S3-VERIFY-1). Wave 10 landed; may be considered after wave 11 measurement.
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
