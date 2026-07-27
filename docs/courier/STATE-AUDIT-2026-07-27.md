# STATE AUDIT — 2026-07-27

**Dispatch id:** STATE-AUDIT-2026-07-27. **Mode:** READ-ONLY. No code / config / deploy / DB writes / batch activity performed. Inventory only.

**Ground-truth scope:** repository as checked out this turn. Deployed-runtime state is only asserted where an edge-function boot log is available in this turn's `<useful-context>`; otherwise reported as "repo-state; deployed state not observed this turn".

**CEO framing (per dispatch):** CEO manually reversed the ALWAYS-ON removal edits and the model-routing amendment. This audit does NOT presume the reversal; it records what the repo currently shows and flags disagreements with the ledger's stated post-reversal expectation for a follow-up turn.

---

## (1) Current BUILD_STAMP + boot line — `run-cppa-risk-assessment`

**Repo BUILD_STAMP** (`supabase/functions/run-cppa-risk-assessment/index.ts` L17):

```ts
export const BUILD_STAMP = "ltp-risk-engineb-always-on@2026-07-27T05:22:35Z";
console.log(`[run-cppa-risk-assessment] boot build_stamp=${BUILD_STAMP}`);
```

Secondary boot line (L51) still prints the historical w23/w24/w24a/t7/cohort/contradiction/citation-dup sub-stamps alongside `BUILD_STAMP`.

**Deployed boot line:** NOT OBSERVED — `run-cppa-risk-assessment` boot log is not in this turn's `<edge-function-logs-all>` slice. Cannot assert live vs repo divergence from evidence at hand.

**Discrepancy with dispatch framing:** if the CEO's reversal restored the pre–ENGINE-B-ALWAYS-ON stamp, the repo does NOT reflect it — the ALWAYS-ON stamp is still declared.

---

## (2) `LTP_ENFORCE_ENABLED` — current value + every code location that reads it

**Value at runtime:** UNDEFINED / unread by product code. No `Deno.env.get("LTP_ENFORCE_ENABLED")` call exists in `supabase/functions/**` per `rg`.

**All occurrences in repo** (`rg -n "LTP_ENFORCE_ENABLED"`):

- `supabase/functions/_shared/ltp/pass1-llm.ts:84` — COMMENT ONLY (removal notice):
  > `// LTP_ENFORCE_ENABLED and every mode branch removed. The Legal Test`
- `supabase/functions/_shared/ltp/pipeline.ts:9` — COMMENT ONLY (docstring):
  > `* The mode toggle (LTP_ENFORCE_ENABLED, ltpMode(), "shadow" vs "enforce"`
- `supabase/functions/_shared/ltp/waveb.test.ts:15,19` — TEST asserts the env var is IRRELEVANT (`Deno.env.delete("LTP_ENFORCE_ENABLED"); // presence must not matter`).

**No live reader exists.** Pipeline runs unconditionally.

**Discrepancy with dispatch framing:** if the CEO's reversal restored an enforce switch, no read site has been reinstated. Repo remains in ENGINE-B-ALWAYS-ON shape.

---

## (3) Composition path — which code writes customer `report_data` today

**Primary composition (customer path):** `run-cppa-risk-assessment/index.ts` — the pre-existing Engine-A composition (`buildAiPrompt` → `callAiWithRetry` → deterministic slot reprojections at L2275+ / risk_register / attestation_block / submission_summary + waveb-completion). This is the composition that ends up in `quality_run_documents.report_data` and in customer output.

**LTP orchestrator + Pass-1 LLM:** run as an OVERLAY on the same `report_data` object (`index.ts` L3227–3300):
- `runLegalTestPipeline({ intake, report_data, buildStamp })` — deterministic; attaches telemetry to `_meta.internal.legal_test_pipeline`.
- `await runPass1Llm({...})` — LLM Pass-1; attaches telemetry + slim plan_summary to `_meta.internal.legal_test_pipeline.pass1`.

Neither call REPLACES `report_data`; both attach `_meta.internal.*` fields only. `_meta.internal` is stripped by LEAK-PREV-P2 before customer surfacing.

**`composeAssessmentSummary` invocation:** `rg -n "composeAssessmentSummary\\("` inside `run-cppa-risk-assessment/` returns ZERO hits. The compose function exists (`_shared/ltp/summary-compose.ts:231`) and is tested in isolation, but is NOT called from the risk function. This is the **Link C** wiring gap named in Item 169 accounting — still open in the repo.

**`pass1-llm.ts` header — "SHADOW-PREVIEW GATING" note (lines 10–14):**
> "The customer report_data path continues to consume derivePlan() output. Pass-1 LLM output is exposed via enforce.ts only under `_meta.internal.legal_test_pipeline.enforce_preview` for wave-comparison telemetry until the assessment_summary composition rule lands."

**Does this statement still hold?** PARTIALLY.
- ✅ "customer report_data path continues to consume [Engine-A composition, not Pass-1]" — YES, per Link C being unwired.
- ❌ "Pass-1 LLM output is exposed via enforce.ts only under `_meta.internal.legal_test_pipeline.enforce_preview`" — the risk index attaches Pass-1 telemetry under `_meta.internal.legal_test_pipeline.pass1` (see L3266), not `.enforce_preview`. No `enforce.ts` file surfaced via `rg`. The header is STALE relative to current attachment shape.
- ⚠️ "until the assessment_summary composition rule lands" — the rule/compose function has landed as source, but is not invoked. So the "until" precondition is unresolved.

**Recommendation for follow-up (not executed):** rewrite the pass1-llm.ts header block to match current attachment path or complete Link C wiring so the header is retired.

---

## (4) Status inventory

### (a) Six citation-closure fixes (Item 157 — WAVE-B2-CITATION-CLOSURE)

Repo landing evidence:

| # | Fix | Landed in repo | Notes |
|---|-----|----------------|-------|
| 1 | Risk citation dup fix | ✅ `supabase/functions/run-cppa-risk-assessment/_risk_citation_dup_fix.ts` present; imported in `index.ts:44`; applied at L3044 evt log. | Original Item 128 fix; carried through. |
| 2 | ADMT-consequence gate (suppress § 7001(ddd) when q18 negative) | ✅ Gate defined in `_shared/gates/cppa-risk-gates.ts` and evaluated in `_shared/ltp/gate-eval.ts`. Tests pass in `_ltp.test.ts` L40-50. | Deterministic; no LLM involvement. |
| 3 | Token-truncation guards | Presence not verified this turn (name searched: no direct file hit). | REPORTED-AS-LANDED in Item 157; artifact identification requires deeper trace. |
| 4 | Information-contradiction filters | Presence not verified this turn. | Same as #3. |
| 5 | Tightened cyber crosswalk | ✅ `waveb-completion.ts` present + invoked at `index.ts` L3163 with counters + PII assertion. | Aligned to § 7120(b) prong linkage per Item 154. |
| 6 | Whole-sentence excision (Items 105/107 lineage) | Presence not verified this turn (name not searched). | REPORTED-AS-LANDED. |

**Aggregate:** 3/6 directly verified in this audit; 3/6 UNVERIFIED (not disconfirmed — inventory-only turn, no deep tracing).

### (b) Completion-turn wiring (Item 154 — WAVE-B COMPLETION)

✅ WIRED. `run-cppa-risk-assessment/index.ts` L3157–3187 dynamically imports `applyWaveBCompletion` + `assertNoPiiInNarrative`; runs post-slot-reprojection; writes telemetry + counters + `pii_narrative_assertion_errors` to `_meta.internal.waveb_completion`; emits `evt: "waveb_completion_applied"` log line. Fail-open.

### (c) PII field-class rendering rule

✅ PRESENT as scrubber + post-render assertion in `_shared/ltp/waveb-completion.ts` (`assertNoPiiInNarrative`), invoked in the same block as (b). Per repo comment: "scrubbers empty the surface first" so the assertion is defense-in-depth.

### (d) Crosswalk emitter (§ 7120(b) cyber-audit linkage)

✅ PRESENT — `waveb-completion.ts` L293 references `report.submission_summary`; test `waveb-completion.test.ts` L112 asserts basis string `"§ 7121(a) cybersecurity-audit linkage"` idempotency (L139–144).

### (e) s6 instrument + hash

- **Constant:** `_shared/grader/context.ts:16` — `GRADER_CONTEXT_VERSION = "gc-2026-07-27-s6-eu-uk-ca-au-sg"`.
- **Hash:** NOT INSPECTED this turn (no hash field surfaced by the grep patterns used).
- **Discrepancy:** `supabase/functions/_tests/counsel-voice-1.test.ts:120` still asserts the s5 value: `assertEquals(GRADER_CONTEXT_VERSION, "gc-2026-07-26-s5-eu-uk-ca-au-sg")`. This test is currently RED against the s6 constant and is a §16-adjacent test-surface drift. Not fixed this turn (audit).

### (f) §16 assertion wiring — which launch paths have it, which don't

| Launch path | §16 assertion wired? | Evidence |
|-------------|----------------------|----------|
| `kick-wrapped-batch` (caller-driven) | ✅ VERSION-based pre-ping (Item 170). `pipeline_version_expected` + `target_fn` → GET `?ping=1` → 409 on mismatch. `index.ts` L38–68. Legacy `mode_expected` accepted but ignored (warning log only). | ✅ |
| `batch-kickoff-pickup` (canonical §18 pickup path) | ❌ **NOT WIRED** — file imports `assertStateMachineConformance` (structural) but does NOT perform §16 version/mode assertion on the target function before kick. | This is the Link B gap named in Item 169 accounting; **UNCLOSED** in repo. |
| `run-cppa-risk-assessment` internally | ✅ Exposes `?ping=1` returning `pipeline_version` + `content_versions` (per L45 imports); consumed by `kick-wrapped-batch`. | ✅ (self-report side) |

**Standing law:** §16 (simplified — version-based) and §27 (narrative-present) both exist in `docs/design/LEGAL-TEST-PIPELINE.md`. **Enforcement wiring:** partial — one path has it, one does not.

### (g) State-machine / R1–R7 retro (Item 165)

✅ LANDED.
- `docs/design/HARNESS-STATE-MACHINE.md` present.
- `docs/design/LEGAL-TEST-PIPELINE.md` §19–§25 present (R1–R7 clauses).
- `supabase/functions/batch-kickoff-pickup/index.ts` imports `assertStateMachineConformance` and calls it at import time (L49).
- `supabase/functions/batch-kickoff-pickup/state-machine-conformance.test.ts` present with 6 tests (§8 canon).
- Boot log lines observed live in this turn's `<edge-function-logs-all>` for `batch-kickoff-pickup`: `state-machine conformance: ok=true legal=6 owned=3 unowned=0 missing_cancel=0` (three ticks). **Live-verified.**

### (h) Divergence-tripwire law (§26)

✅ LANDED as design law: `docs/design/LEGAL-TEST-PIPELINE.md` §26 (line 601), CEO ruling verbatim on L603. **Extraction-turn courier obligation** stated on L617.
❌ NO automated enforcement in extraction code was audited this turn — the rule is documented; whether extraction couriers currently assert it programmatically is not part of this inventory.

---

## (5) Exact diff summary — what the CEO's reversal removed

**REPO EVIDENCE OF REVERSAL:** NONE OBSERVED. Every artifact of the ENGINE-B-ALWAYS-ON / model-routing turns (Item 170 + antecedents) remains in place per §§(1)–(4) above:

- BUILD_STAMP still `ltp-risk-engineb-always-on@2026-07-27T05:22:35Z`.
- `LTP_ENFORCE_ENABLED` still has no live reader.
- `PASS1_MODEL` still `"google/gemini-3.6-flash"` (`_shared/ltp/pass1-llm.ts:31`).
- Design law §28 (SWITCH-REMOVAL TERMINUS) still present at `docs/design/LEGAL-TEST-PIPELINE.md`.
- Test `waveb.test.ts` still asserts `LTP_ENFORCE_ENABLED` presence must not matter.

**Interpretation options** (audit does not choose one):

1. Reversal happened OUT-OF-BAND (deployed function differs from repo). Live boot line of `run-cppa-risk-assessment` was NOT observed this turn; deployed BUILD_STAMP could differ from the repo constant.
2. Reversal happened on a different branch/worktree not visible from this checkout.
3. Reversal is pending/announced but not yet applied to source.

**Recommended follow-up (not executed):** capture live boot line of `run-cppa-risk-assessment` (e.g. `GET /?ping=1`) to compare deployed `pipeline_version` + `build_stamp` against repo constants. Any delta names the exact reversed edit set.

---

## (6) Halted-chain turns that partially executed

**Halted chain (Item 167 → 169):** STEP 1 READINESS → STEP 2 SMOKE → STEP 3 WAVE D. Halted at Item 169 (HALT + ACCOUNT + HARDEN) after Run #149 was reclassified NON-EVIDENTIAL.

**Turns that partially executed after the halt / as part of it:**

- **Item 169 (HALT + ACCOUNT + HARDEN):** LANDED as design law (§26, §27) and courier (`docs/courier/LTP-RISK-ENFORCE-ACCOUNTING-2026-07-27.md`). Link A/B/C accounting recorded. Retraction of Item 168 verdict recorded.
- **Item 170 (ENGINE-B-ALWAYS-ON — SWITCH REMOVAL):** Repo shows switch-removal edits are IN PLACE (BUILD_STAMP, pass1-llm.ts comment, pipeline.ts telemetry retiring `mode`, kick-wrapped-batch version-check block, tests updated). **Deploy proof for `run-cppa-risk-assessment` is NOT in this turn's log slice** (only `batch-kickoff-pickup`, `quality-batch-orchestrator`, `delivery-sentinel`, `render-pdf-worker`, `retry-failed-generations`, `check-ingestion-health`, `fetch-sec-breaches`, `backfill-ai-summaries`, `reap-stuck-generations`, `batch-kickoff-pickup` are present).
- **Link C wiring (compose invocation):** NOT EXECUTED — `composeAssessmentSummary` still uncalled from `run-cppa-risk-assessment`. This was named as the head prerequisite before the next SMOKE.
- **§16/§27 harness turn (post-Link-C):** NOT EXECUTED — `batch-kickoff-pickup` still lacks the §16 version pre-check (see §(4)(f)).
- **READINESS v2 / new SMOKE / WAVE D:** NOT EXECUTED — chain remains halted; no new measurement batches launched.
- **s6 test-surface follow-through:** PARTIALLY EXECUTED — grader constant is s6 but `counsel-voice-1.test.ts` L120 still pins s5 (test-surface drift).
- **`pass1-llm.ts` header retirement:** NOT EXECUTED — SHADOW-PREVIEW block still present (see §(3)).

---

## Ledger

Recorded on ledger item 171 (this turn).
