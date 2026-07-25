# GRADER-MAP-CORRECTION-7150B3 — Courier Report

**Stamp:** 2026-07-25T10:52:17Z (sandbox clock re-read immediately before deploy)
**Dispatch:** GRADER-MAP-CORRECTION-7150B3 (CEO-ORDERED 2026-07-25 ~10:47Z: "ADD § 7150(b)(3) to the grader map as necessary")
**Type:** Instrument-config turn (grader shared context only) + tests + docs.
**Scope confinement:** `supabase/functions/_shared/grader/context.ts`, three test files under `supabase/functions/_tests/`, this courier report, and `docs/pipeline-state.md`. No rubric / dimension / threshold / generator / registry / golden / contract / prompt edits.
**Team-reviewed:** five-lens (privacy-counsel / UI / tech-writing / prompt-eng / CS). Prompt-eng note recorded: this is a completeness CORRECTION backed by primary source, NOT a rubric loosening — it removes false-positive penalties on citations now proven valid.

---

## 1. Instrument version bump

| | Before | After |
| --- | --- | --- |
| `GRADER_CONTEXT_VERSION` | `gc-2026-07-24-s3-eu-uk-ca-au-sg` | `gc-2026-07-25-s4-eu-uk-ca-au-sg` |
| `context.ts` SHA-256 | (pre-bump) | `da4d78ea816f7cc7b488fe7580a402f67121123a5c6b4066df6483ca17d4db16` |

Certification counters reset per the standard MC-S1b Task 4 bump discipline. Current cert state is 0/3 for every tool, so the reset is a no-op in practice.

## 2. Map additions (verbatim, as landed)

### 2.1 CYBER-AUDIT COHORT MAP — extended

New line appended to the existing map block:

> - 11 CCR § 7121(a)(3) is the ACCEPTED DEEPER PINPOINT for the April 1, 2030 cohort (annual gross revenue < $50M); § 7121(a) remains accepted as the shallower cite for the same claim. Corpus proof: provision_texts.cppa-7121 approved 2026-07-25 (source PDF SHA-256 7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650). Do NOT accept § 7121(b) or § 7121(b)(3) for the cohort claim — subsection (b) is the steady-state (post-Apr 1, 2030) rule, not a cohort enumeration.

### 2.2 CPPA RISK ASSESSMENT — VERIFIED SUBSECTION MAP (new block)

> CPPA RISK ASSESSMENT — VERIFIED SUBSECTION MAP (primary-source verified; do NOT flag as misapplied or as fabricated subsections):
> - 11 CCR § 7150(b)(3) — "Using ADMT for a significant decision concerning a consumer." VERIFIED against the OAL-approved adopted text (eff. 2026-01-01). Corpus proof: provision_texts.cppa-7150 approved 2026-07-25 (source PDF SHA-256 7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650); registry match: _shared/registry/admt-verified-authorities.ts row ra_trigger_admt EXACT-MATCH (ledger item 42). ADMT risk-assessment-trigger citations to § 7150(b)(3) are CORRECT — do NOT flag as misapplied, unverified, or fabricated.

## 3. Primary-source proofs

- **§ 7150(b)(3) proof (ledger item 42):** `provision_texts.cppa-7150` status=`approved`, `last_verified_at=2026-07-25T10:26:44Z`, `verbatim_excerpt` 4,346 chars, five deterministic pin-tests green. Source PDF: `https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf`, SHA-256 `7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650`. Registry match: `_shared/registry/admt-verified-authorities.ts` row `ra_trigger_admt` is character-for-character identical to the § 7150(b)(3) text in the OAL-approved adopted text. Full courier: `docs/courier/CPPA-7150-VERBATIM-2026-07-25.md`.
- **§ 7121(a)(3) proof (ledger item 43):** `provision_texts.cppa-7121` status=`approved`, `verbatim_excerpt` 1,718 chars, four deterministic pin-tests green (`April 1, 2028`, `April 1, 2029`, `April 1, 2030`, `less than fifty million dollars ($50,000,000)`). Same PDF hash. Adopted text enumerates the cohorts inside subsection **(a)** as `(1)/(2)/(3)`; subsection **(b)** is the single steady-state paragraph — hence acceptance is limited to `§ 7121(a)` and `§ 7121(a)(3)`. Full courier: `docs/courier/CPPA-7121-VERBATIM-2026-07-25.md`.

## 4. Tests

New test file `supabase/functions/_tests/grader-map-correction-7150b3.test.ts`:

```
running 3 tests from ./functions/_tests/grader-map-correction-7150b3.test.ts
instrument id bumped to s4 ... ok (1ms)
§ 7150(b)(3) is present in the CPPA Risk verified subsection map ... ok (0ms)
§ 7121(a)(3) accepted as deeper pinpoint; (b) variants rejected ... ok (0ms)

ok | 3 passed | 0 failed (7ms)
```

Existing instrument suite: `grader-cal-1.test.ts` (`GRADER-CAL-5R` block) and `counsel-voice-1.test.ts` (`COUNSEL-VOICE-1: GRADER_CONTEXT_VERSION bumped` block) had literal-string pins to the prior stamp; both resynced to `gc-2026-07-25-s4-eu-uk-ca-au-sg`. String-sync only, no behavioural change.

Three unrelated pre-existing failures were observed on the same test binaries:
- `COUNSEL-VOICE-1 §3: legacy NOTE FOR LEGAL REVIEW is still whitelisted (back-compat)`
- `COUNSEL-VOICE-1 E1 (IR): PART A..PART F presence`
- `CV1-R: run-governance-assessment disclaimer constants have no counsel-referral directive`

These were already failing under the prior s3 stamp and are OUT OF SCOPE for this instrument-map turn — recorded here so a future bump can pick them up.

## 5. Deploy record

- **Pre-deploy locks (10:51:57Z):** `SELECT id, status, phase FROM quality_batch_runs WHERE status NOT IN ('complete','completed','failed','cancelled','success','error')` → `[]`. Zero in-flight quality batches.
- **Timing guard:** deploy-ready at 10:52:17Z; expected wave-21 launch ~11:15Z (delta ~23 min, outside the 20-min hard-stop). Guard PASSED.
- **Deploy target set** (every edge function that imports `SHARED_GRADER_CONTEXT` / `GRADER_CONTEXT_VERSION` at runtime, per `rg` audit):
  1. `grade-single-assessment`
  2. `run-quality-batch`
  3. `quality-batch-orchestrator`
  4. `improve-tool-quality`
  5. `ql2-orchestrator`
- **Deploy time (sandbox clock):** 2026-07-25T10:52:17Z — all 5 successful.

## 6. Wave-21 instrument-of-record note

Wave 21 grades on whichever instrument is live at its grading phase. This deploy landed >20 min before the expected launch, so wave-21 is expected to run under `gc-2026-07-25-s4-eu-uk-ca-au-sg`. The wave-21 digest will record the actual `GRADER_CONTEXT_VERSION` observed in `quality_batch_runs`/`quality_batch_baselines` so the digest comparison remains apples-to-apples with prior s3-stamped batches (EPOCH CHANGE divider expected in `/admin/quality-batch`).

## 7. CEO Rulings Log

- **Grader-map correction for § 7150(b)(3):** ORDERED by CEO 2026-07-25 ~10:47Z; EXECUTED 2026-07-25T10:52:17Z (this turn).
- **Production-feedback design turn:** NO ACTION this turn. CEO will revisit after the wave campaign completes.

## 8. Guardrails observed

- Changes confined to the grader shared-context file, its tests, and docs.
- No rubric / dimension / threshold / findings-class edits; no generator / registry / golden / contract / prompt edits.
- Stamps re-read from `date -u` immediately before each write.
- Atomic map addition (single edit block) + independent version bump.
- Timing guard honoured; no collision with wave 21.
