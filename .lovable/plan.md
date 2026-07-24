
# DELIVERY SENTINEL — PLAN (no code)

Goal: a user-initiated product run must **never fail unrecovered**. Every run gets a contract with per-stage deadlines; a sweeper resumes/repairs/downgrades until it reaches a terminal state the user actually receives.

## 1. Codebase mapping (what already exists vs. what is missing)

Verified against the repo at HEAD.

| Capability | Exists as | Gap vs. Sentinel |
|---|---|---|
| Stuck-row reaper (10-min cron) | `supabase/functions/reap-stuck-generations/index.ts` — 8 tables, marks `failed` after 15 min | Marks failed, doesn't **resume**; no per-stage awareness |
| DPIA / ADMT resumability | Per-unit `_staging.units[u].status` + `writeUnitStatus` heartbeats; `runUnit` skip-if-done gate; `reliability.ts` (DPIA + LI) with `isTransientError` bounded retry | **Only DPIA + LI**. Governance, Risk, Cyber, IR, DPA, RoPA, EU-notice, US-notice, Registration have no staged checkpoints on the customer path |
| Quality-batch pickup | `batch-kickoff-pickup`, `quality-batch-orchestrator`, `ql2-watchdog`, `ql3-batch-orchestrator`, `improvement-cycle-watchdog`, `shouldResurrect` (QB-P21) | Harness-only; the resurrection heuristic (`updated_at` > 180 s) is exactly the primitive we need to reuse on the customer path |
| Long-running jobs registry | `long_running_jobs` (kind, status, progress, result, error) | Not per-stage; no deadline, heartbeat, or checkpoint ref |
| Function invocation logging | `_shared/invoke-gated.ts` → `function_runs` (INC-1) | Already logs every invoke; sentinel reads this for last-boot correlation |
| PDF renderer | `render-html-to-pdf`, `generate-report-pdf`, `generate-cppa-suite-pdf`, `generate-ropa-document`, `_shared/qa-pdf-export.ts` — **all single-vendor PDFShift** with 45 s AbortSignal timeout; failure returns `null` / throws; no fallback | No fallback renderer; no HTML-first delivery; no queued-PDF path |
| Rate-limit primitive | `edge_rate_limits(bucket_key, window_start, hits)` | Exists; used by a handful of functions — sentinel can consult before retry to defer instead of hammer |
| Redeploy plumbing | `redeploy_queue` + `admin-redeploy` | Useful escalation channel for repeatable class-level failures; not per-run |

## 2. Target design

### 2a. `delivery_contracts` table (new)
One row per **user-initiated** product run (harness runs excluded — separate concern).

```text
id uuid pk
user_id uuid
tool text                    -- governance | dpia | lia | admt | risk | cyber
                             --  ir | dpa | ropa | eu_notice | us_notice
                             --  registration | biometric
subject_table text           -- e.g. 'dpia_frameworks'
subject_id uuid              -- e.g. dpia_frameworks.id
stage text                   -- generate | assemble | validate | render | deliver
stage_deadline_at timestamptz
overall_deadline_at timestamptz
heartbeat_at timestamptz
checkpoint_ref jsonb         -- pointer(s) into subject_table _staging.units,
                             --   qa_pdf_exports, storage keys, etc.
attempts jsonb               -- {generate:0, render:0, deliver:0}
failure_class text           -- model_timeout | pdf_render | rate_limited
                             --  | validator_reject | delivery_failure
last_error text
terminal_state text          -- delivered | delivered_html_pdf_queued
                             --  | admin_escalated  (null while live)
created_at, updated_at timestamptz
```

Indexes: `(terminal_state) where terminal_state is null`, `(heartbeat_at)`, `(user_id, updated_at desc)`.
RLS: user reads own live rows; admins read all; service_role writes. GRANTs to match.

Contract creation is a thin call inserted into every user-facing generator entrypoint (13 functions). Update is a single helper (`_shared/delivery-contract.ts`) that all stages call to advance stage + refresh heartbeat + write checkpoint.

### 2b. Generalize resumable checkpointing to all 10 tools

The DPIA / LI pattern (per-unit `_staging` slot + skip-if-done gate + `writeUnitStatus` heartbeat) is the template. Effort estimate per tool:

- **Low (already unit-staged, add contract only):** DPIA, LI, ADMT (post-Turn-2 slots)
- **Medium (single-shot generator, split into 2-3 checkpoints — draft/validate/render):** Governance, Risk, Cyber, IR, DPA
- **High (multi-answer intake, needs staging schema change):** RoPA, EU notice, US notice, Registration

For MEDIUM/HIGH we do **not** rewrite generators. We add a `checkpoints` JSONB column (or reuse existing `_staging`) and wrap the generator's phases with `writeCheckpoint(contract_id, phase, artifact_key)`. Resume replays from the last recorded phase; earlier artifacts (draft prose, validated slots, rendered HTML) are keyed in the row so a second worker never re-runs them.

Deliberate exclusion: **Biometric** is on measurement hold post-W6; it gets the contract row but not new checkpoint code until Wave 8 ships.

### 2c. `sentinel-sweep` edge function (new, cron every 1 min)

Pseudocode:

```text
for contract in live_contracts where heartbeat_at < now() - stage_sla(stage):
  cls := classify(contract.last_error, contract.stage)
  if cls == model_timeout:
      if attempts.generate < 2: fresh-isolate re-invoke same stage from checkpoint
      else: chunked-section regen via bounded-regeneration (already used by ADMT VA-walk)
  elif cls == pdf_render:
      attempts.render++; retry PDFShift once
      if fails again: call fallback renderer; on success mark delivered_html_pdf_queued,
                      queue PDF job (redeploy_queue-style row), notify user by email on completion
  elif cls == rate_limited:
      check edge_rate_limits.bucket; defer next attempt to window_start + 60s
  elif cls == validator_reject:
      re-invoke pre-emit validator with W6 scrubbers; escalate after 2
  else:
      escalate

  if now() > overall_deadline_at and not terminal:
      terminal_state := admin_escalated; page /admin/delivery-sentinel
```

**Cost of 1-min sweep:** one indexed query on `delivery_contracts where terminal_state is null`. Expected steady-state live rows: single-to-low double digits. Sweep cost ≈ 1440 invocations/day × ~200 ms ≈ trivial (well under $1/mo edge time). Reap frequency step-up from 10 min → 1 min is the only material change; existing `reap-stuck-generations` becomes redundant for tables covered by contracts (keep it running for legacy rows for one wave, then retire).

### 2d. PDFShift failure modes + fallback

Observed in code: single vendor, 45 s abort, HTTP-code error surfaces at three sites (`generate-report-pdf`, `generate-cppa-suite-pdf`, `generate-ropa-document`). No fallback anywhere. `render-html-to-pdf` silently returns `null` — invisible failure.

Fallback options in this stack:

1. **`@react-pdf/renderer` (server-side via Deno npm:) or `pdfkit`** — no external dependency, deterministic, works for the simple document layouts we produce; loses some CSS fidelity.
2. **Store the same HTML we send to PDFShift as `text/html` in `assessment-reports` bucket and mint a signed URL** — this is the **HTML-first delivery** path. Recommended primary fallback because it is zero-risk and already trivially compatible with the existing storage code.

Recommended stack: PDFShift → retry once → **deliver HTML + queue PDF via a `pdf_render_queue` row**; a small `render-pdf-worker` re-tries every 5 min for 24 h; on success uploads the PDF and emails the user "your PDF is ready". Terminal state = `delivered_html_pdf_queued` until the PDF lands, then `delivered`.

### 2e. `/admin/delivery-sentinel` SLO surface (new page)

- Top strip: % delivered-in-SLA (24 h / 7 d), median stage duration per tool, contracts live now.
- Live table: every non-terminal contract with stage, heartbeat age, next SLA.
- Escalation row (red): any contract past `overall_deadline_at` — admin sees it **before** the user does. One-click "Force resume from last checkpoint" / "Deliver HTML now" / "Mark admin-handled".
- Reuses `CertificationStatusPanel` layout conventions.

### 2f. User-facing status honesty

Every result page that today shows a spinner reads its `delivery_contracts` row:

- Stage badge: "Drafting → Assembling → Validating → Rendering → Delivering"
- If `heartbeat_at` fresh: progress; if stale but sentinel is on it: "Retrying — we'll email you if this takes longer than X"; if `admin_escalated`: honest "Our team has been paged; you'll receive it by email"
- Never a dead spinner. Contract state, not row state, drives the UI.

## 3. Sequencing (each turn = its own dispatch, atomic)

1. **DS-T1 — Table + helper.** Migration for `delivery_contracts` (+ GRANTs, RLS, indexes). `_shared/delivery-contract.ts` (create/advance/heartbeat/terminal). No callers wired yet.
2. **DS-T2 — Sentinel + fallback renderer.** `sentinel-sweep` edge function (cron 1 min). HTML-first fallback in `render-html-to-pdf`; introduce `pdf_render_queue` + `render-pdf-worker` (cron 5 min). Retire nothing yet.
3. **DS-T3 — Wire LOW-effort tools.** DPIA, LI, ADMT: create contract + advance calls; verify sentinel resumes a killed run end-to-end.
4. **DS-T4 — Wire MEDIUM tools.** Governance, Risk, Cyber, IR, DPA: add coarse checkpoints (draft/validate/render), then contract wiring.
5. **DS-T5 — Wire HIGH tools.** RoPA, EU notice, US notice, Registration: staging schema addition + contract wiring.
6. **DS-T6 — Admin SLO page.** `/admin/delivery-sentinel` + one-click recovery actions.
7. **DS-T7 — User-facing status swap.** Result pages read the contract, not the row.
8. **DS-T8 — Retire overlap.** Once contracts cover every user path in prod for one full wave, `reap-stuck-generations` scope narrows to legacy rows only.

Biometric and any harness runs are explicitly out of scope.

## 4. Open questions for CEO before build

- HTML-first delivery on PDFShift failure — confirm this is preferred over blocking the user until PDF succeeds.
- Overall deadline defaults per tool (proposal: 10 min for single-shot, 20 min for multi-unit DPIA/ADMT, 30 min for RoPA/EU-notice).
- Whether DS-T3 through DS-T5 should each hold for a wave of measurement before proceeding, or ship sequentially without waiting.
