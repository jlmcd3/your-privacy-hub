# LTP-RISK ENFORCE-MODE ACCOUNTING + HARDEN — 2026-07-27

**Dispatch id:** HALT + ACCOUNT + HARDEN (CEO-flagged grader-divergence problem, 2026-07-27 ~05:10Z; controller verification pasted showing smoke run #149 docs 3/3 carry `legal_test_pipeline.mode='shadow'`, narrative absent). Ledger item 169.

## VERIFIED-FACTS preamble (§24)

Read at `date -u = 2026-07-27T05:10:09Z`:

- `supabase/functions/run-cppa-risk-assessment/index.ts` — full file, lines 1–3538. Deployed image `BUILD_STAMP=ltp-risk-waved-readiness@2026-07-27T04:28:00Z`.
- `supabase/functions/_shared/ltp/pipeline.ts` — full file. `runLegalTestPipelineShadow()` hard-codes `_mode:"shadow"` on both return branches (invariant restored in READINESS turn per item 167).
- `supabase/functions/_shared/ltp/pass1-llm.ts` — full file. Enforce arm gated on `LTP_ENFORCE_ENABLED === "1"`.
- `supabase/functions/kick-wrapped-batch/index.ts` — full file. §16 pre-ping and `x-ltp-mode-expected` header live for callers routed through this function.
- `supabase/functions/batch-kickoff-pickup/index.ts` — full file. Boot conformance test green; NO §16 pre-ping is wired into the pickup path.
- Live ping `GET /run-cppa-risk-assessment?ping=1` at 05:10Z: `{"fn":"run-cppa-risk-assessment","build_stamp":"ltp-risk-waved-readiness@2026-07-27T04:28:00Z","ltp_mode":"enforce","ltp_version":"ltp-risk-p2"}`.
- `rg -n "composeAssessmentSummary|summary-compose|assessment_summary\.narrative" supabase/functions/run-cppa-risk-assessment/index.ts` → **empty** (0 matches).
- `supabase/functions/_shared/ltp/summary-compose.ts` — full file. `composeAssessmentSummary()` exists and is fully tested (`summary-compose.test.ts` green) but has **no import site** in the generator.

## (1) ACCOUNTING — the failing links, named precisely

### Link A: READINESS STEP 1 did NOT include a per-probe narrative check

Item 167 STEP 1 verified: boot log `ltp_mode=enforce`, ping response `enforce`, `runLegalTestPipelineShadow` shadow-arm invariant, instrument s6 sha256, state-machine conformance, F0 emission. It did NOT run a generation probe and did NOT assert `assessment_summary.narrative` present on a live doc. The checklist was config-shaped (env + boot + ping + hash), never behavior-shaped (probe + payload).

**Consequence.** A generator whose ping declares `enforce` but whose composition path never assembles a narrative passes readiness. That is exactly the failure mode observed on run #149.

### Link B: §16 kickoff assertion is NOT wired into `batch-kickoff-pickup`

§16 pre-assertion lives in `supabase/functions/kick-wrapped-batch/index.ts` (a caller-side function that PINGS the target's `?ping=1` and returns HTTP 409 before spawning). Smoke batch `e1cd0e3e` was **born-state pickup** — the row was inserted directly into `quality_batch_runs` (per §18 launch-state equivalence law) and picked up by `batch-kickoff-pickup`. That path never touches `kick-wrapped-batch`, so `mode_expected` was never declared and no pre-ping ran.

The generator DOES honor `x-ltp-mode-expected` at request time (index.ts L3453), but only if the caller sets it. The pickup → orchestrator → generator chain does not set it.

**Consequence.** §16 asserts nothing for the pickup launch path, which is now the canonical born-state form under §18.

### Link C: `composeAssessmentSummary` is NEVER invoked by the generator

`_shared/ltp/summary-compose.ts` exports a deterministic composer that populates 10 structured keys of `report_data.assessment_summary` AND composes the additive `narrative` string from Pass-2 templates. It is imported by its own test file only. `run-cppa-risk-assessment/index.ts` has **zero** references to `composeAssessmentSummary`, `summary-compose`, or `assessment_summary.narrative` assignment.

The WAVE-B COMPLETION turn (item 154, courier `LTP-RISK-WAVEB-COMPLETION-2026-07-27.md`) landed the always-on deterministic subset — purpose verbatim, PII scrub, cyber crosswalk § 7120(b) — as verified by run 146's addendum (`purpose === intake.i1_processing_purpose byte-verbatim on 3/3 docs`). The composition wiring itself did NOT land. The prior turn's WAVE-B-COMPLETION-LANDED claim over-stated the delivered scope for the narrative surface.

**Consequence.** No amount of enforce-mode telemetry produces a `narrative` string because no code assigns one. The generator ships enforce_preview under `_meta.internal` (correct) and never composes the customer-visible narrative (missing).

### Failing link causing the smoke failure

**Link C is the direct cause** of "narrative absent on 3/3 docs." **Links A and B are the process failures** that let a run whose narrative could not exist reach terminal without being caught pre-launch. Fixing C requires a content-couriered wiring turn against the change-controlled composer surface; fixing A and B is a harness/process change and is authorized under this dispatch step (2).

## (2) ENFORCE ON, PROVEN

- **Env flag:** `LTP_ENFORCE_ENABLED=1` on the deployed function (unchanged since item 159's enforce-regression fix).
- **Boot line:** `[run-cppa-risk-assessment] boot ltp_mode=enforce design=docs/design/LEGAL-TEST-PIPELINE.md §16-measurement-validity-law` (captured at deploy).
- **Ping (05:10Z):** `{"ltp_mode":"enforce", ...}` — pasted above.
- **Enforce-arm ran on smoke doc 1** (from `_meta.internal.legal_test_pipeline.enforce_preview`): `telemetry = {ran:true, ok:true, attempts:1, latency_ms:30983, write_around:false, validator_issues:0}`, manifest stamp `ltp-pass1-llm-2026-07-26`, 15 propositions in the Pass-1 plan.

**Not proven — and cannot be proven under the current image:** `assessment_summary.narrative present`. Link C is unwired; this is a code state, not a config state. No amount of env-flag manipulation produces a narrative until composition is wired.

**§16 pickup-path assertion — status this turn:** **HELD-authoring**. The correct wiring is `batch-kickoff-pickup` PINGS the target function's `?ping=1` immediately before invoking the orchestrator, aborts pre-launch on mismatch, and records the ping+decision on the batch row. That is a harness change in a new BUILD_STAMP; deploying it in the same turn as this accounting turn would violate the smoke-before-measure law (R4) because the pickup path is itself launch infrastructure. It ships in the next dedicated harness turn, before any new smoke.

## (3) NEW STANDING LAW — §26 GRADER-DIVERGENCE TRIPWIRE (CEO insight, verbatim in rulings log)

**CEO ruling, verbatim, 2026-07-27 ~05:10Z:**

> "one of the answers lies somewhere between ChatGPT and Claude testing, as evidenced by the divergence"

Landed in `docs/design/LEGAL-TEST-PIPELINE.md` §26 and mirrored into the extraction-turn checklist. Motivating case cited: run #149 tuning split (score_overall=67.15 Claude / gpt_score_overall=85, |Δ|=17.85, deterministic-dominant failures) — the wrong machine was under test (composition unwired), and the divergence declared it before any interpretation.

**Rule (extraction MUST perform BEFORE any §5 interpretation):**

When `|claude_overall − gpt_overall| ≥ 12` on any run:

1. **List** every failing deterministic check driving the gap (per-doc, per-check).
2. **Classify** each as either:
   - **(a) genuine-defect** — deterministic evidence the GPT grader missed (specific rubric anchor, verbatim citation, gate outcome). Trust the check. The run remains evidential; findings stand.
   - **(b) configuration/instrument artifact** — shape or mode mismatch (wrong instrument version, telemetry mode ≠ declared, composition surface absent, stamp mismatch). Fix config/instrument. The run's affected classes are marked **non-evidential** in the ledger and do not advance/retreat the trial verdict.
3. **Default posture on large divergence:** treat as **CONFIGURATION ALARM first, quality signal second**. The prior default (interpret the score) is inverted for `|Δ| ≥ 12`.

**Pattern signature (tonight's case, cited as anchor):** deterministic-dominant failures + GPT ≥ 85 = wrong machine under test. Extraction spec now names this pattern as the class-(b) presumption when both conditions hold.

## (4) CHAIN RESUMPTION

Ordered exactly as the dispatch specifies:

1. **Composition-wiring content courier** — HELD pending CEO/content-courier authorization; `composeAssessmentSummary` invocation is a Pass-2 content surface (`_shared/ltp/content/pass2-templates.ts`), not a harness-authorized turn.
2. **§16 pickup-path assertion wiring** — HELD pending its own harness turn; will ship in isolation with its own BUILD_STAMP, per R4.
3. **Full READINESS CHECKLIST v2** — extended per Link A: adds a live generation probe on a single fixture and asserts `mode='enforce'` (via enforce_preview.ran) AND `assessment_summary.narrative present` AND `stamps echoed`. Runs only after 1 and 2 land.
4. **NEW smoke** (batch_size=1, §16 asserted at kick per (2), divergence tripwire (§26) active at extraction) — launches only after 3.
5. **Wave D** — launches only on smoke pass showing `mode=enforce`, narrative present, and no deterministic-dominant divergence.

## Status

- Run #149 marked **NON-EVIDENTIAL (config artifact, class-(b) per §26)** in the ledger.
- Run #147 remains **SEALED — HELD-UNREAD BY CEO ORDER** (item 166).
- Campaign `fd1be147` remains **PAUSED**.
- No measurement outside this chain.
- No code deployed this turn (§26 is docs-only; wiring turns are queued behind their own gates per single-launch discipline).
