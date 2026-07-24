# Pipeline Coordination Ledger

**Purpose:** Single source of truth for parallel pipeline controllers (this session, scheduled ticks, human dispatchers). Read this file from a fresh clone BEFORE dispatching, green-lighting, or deploying. A green-light contradicting an ACTIVE HOLD must name the hold and state why it is released.

**Stamp doctrine:** Re-read the sandbox clock (`date -u`) immediately before writing any timestamp — including this ledger's "Last updated" field and any function BUILD_STAMP. Never carry a stamp forward from an earlier turn.

**Last updated:** 2026-07-24T12:06:32Z — turn `SAMPLES-CONTRACT-cppa-cyber` (3/8)

---

## 1. Active Holds

_None at this time._

Historical release: `ADMT-FIX-W9` released with wave-10 spec amendments and shipped as `run-admt-checker` build stamped `w9-admt-preemit` (real deploy ~11:49Z; the in-code `@…T12:30:00Z` marker is future-dated — restamp at admt's next deploy per stamp-doctrine correction).

## 2. Queue Order (as currently dispatched)

1. **THIS TURN** — `SAMPLES-CONTRACT-cppa-cyber` (3/8) — reconciled, FATAL flipped, green.
2. **NEXT** — `SAMPLES-CONTRACT-dpia` (4/8).
3. Then — `-lia` → `-governance` → `-ir_playbook` → `-biometric` → `-dpa` (5/8 … 8/8).
4. Deferred — orchestrator → `delivery_contracts` wiring (queued between waves, see §7 sentinel gap).
5. Deferred — W9 admt build restamp (bundled with next admt deploy; joins W6 restamp deferral in §6).

## 3. Deploy Locks

**Standing rule:** Deploying any edge function requires:
- (a) No in-flight customer-path generation on that function — query the relevant product table for rows created in the last 15 minutes with a NULL report/document payload.
- (b) No `quality_batch_runs` row in `running` or `pending` status that dispatches the function.

If either check returns a row, the deploy WAITS until the run reaches a terminal state (`complete`, `error`, `cancelled`).

**Current lock state (2026-07-24T12:06:32Z):**
- **LOCKED — `run-cppa-risk-assessment`** and **`run-cppa-cybersecurity`**: recovery batch `5e0558f3` still running (`running_tool` confirmed ~12:05Z by dispatcher). Lock releases when batch reaches terminal state.
- Customer-path in-flight (last 15 min, NULL report): **none** at last check.
- Other functions: **unlocked**.

## 4. Last Completed Turn

- **Turn:** `SAMPLES-CONTRACT-cppa-cyber` (3/8)
- **Real-time:** 2026-07-24T12:06:32Z (sandbox `date -u`)
- **Scope:** Reconciled `src/lib/sampleFixtures.ts` `F_CPPA_CYBER_US` against `_shared/intake-contracts/cppa-cybersecurity.ts`. Removed 4 unknown top-level keys (`company_name`, `profile_industry`, `profile_audit`, `industry_sector`); substituted `profile.incidents_12mo: "0"` → `"None"`; normalised 16 occurrences of `"Implemented across organisation"` → `"Implemented across organization"` (contract spelling). Flipped `cppa_cyber` out of `SAMPLE_ADVISORY_TOOLS` (FATAL tier).
- **Tests (green):** `contract-surface-audit` 3/3; `intake-contracts` 31/31 (incl. cyber PARITY/MIRROR/FIXTURES); `cppa-cyber.test.ts` 14/14. `cppa_cyber` no longer appears in advisory drift list.
- **Deploy:** N/A (frontend-only; deploy lock respected — `run-cppa-cybersecurity` NOT deployed).
- **REGEN-NEEDED:** `cppa_cyber` sample fixture added to register (regen deferred to end-of-program walk-through).

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
- **REGEN-NEEDED (samples-contract):** `cppa_risk` (1/8), `cppa_admt` (2/8), `cppa_cyber` (3/8). Regen click deferred to end-of-program walk-through.
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
