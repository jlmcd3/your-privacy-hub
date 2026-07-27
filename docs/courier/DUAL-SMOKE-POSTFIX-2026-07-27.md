# DUAL-SMOKE-POSTFIX (Stage A) — 2026-07-27

Dispatch: POST-FIX DUAL SMOKE + scope additions (#1 declared-count, #2 three residual defects)
Executor: controller
Gates satisfied: chain step (A) of CEO-authorized full chain A→B→C→D; smoke evidence never counts against §5.

---

## 1. CONFIGURATION STATEMENT (for the CEO)

- **Current live edge deploy (as of run #151 boot):** `BUILD_STAMP = ltp-risk-pre-waved-emitter-fixes@2026-07-27T06:55:00Z` (PRE-FIX-ROUND). §16 mode-check PASSED at kick with `expected=enforce`, `actual=enforce`.
- **`LTP_ENFORCE_ENABLED`:** currently `true` (composition path is Engine-B-led with enforce-mode telemetry).
- **What composed each smoke doc's surfaces (per telemetry):** Engine-B-led composition with the Pre-Wave-D emitter-fix stack live (COHORT_TRUTH_TABLE, structured-slot asserts, direct-Anthropic Pass-1, ADMT gate, truncation cleanup, contradiction filter, i7 PII rules, adverse-effects conditioning). Engine-A-composer is NOT the fallback path (§28.4). Write-around telemetry was NOT set on these docs (`write_around=false`), so the write-around arm has not yet been exercised — that is Stage A part (ii) below and is DEFERRED to the next contiguous turn per the physical single-turn cap (two full deploy cycles + a batch wait). It is checkpointed as Stage A.ii-DEFERRED, not skipped.
- **What flipping any switch would change from the current state:** none proposed here. Enforcement remains ON; degradation-arm still owed.

---

## 2. CLEAN-ARM RESULTS — run #151 (batch `fa554c22-4b57-4d3f-91f0-11ee60bf97b0`)

- Terminal at `2026-07-27T08:07:27.317Z`. `status = complete`. Declared `batch_size=1`; **actual `next_doc_index=3`** (mismatch — root-cause in §3.a).
- Scoreboard: `checks_total=52`, `passed=39`, `failed=13`, `score_overall=69.7`.
  - Baseline reference (smoke run #150 pre-fix): `checks_total=~48`, `failing=7`, score `73`.
  - Post-fix score is LOWER than the pre-fix baseline. This is *not* a regression to earlier stacks — three residual defect classes are exercised across 3 docs at high frequency (see §3.b–d).
- Dimension breakdown (Claude pass/fail | GPT pass/fail): `accuracy 10/2 | 12/0`; `analysis 3/2 | 3/1`; `citation 1/1 | 2/0`; `citation_accuracy 2/0 | 2/0`; `formatting 8/0 | 8/0`; `hallucination 14/5 | 18/0`; `intelligence 1/3 | 1/1`.
- Grader divergence: Claude fires all 13 failures; GPT fires 2. `|Δ|` on hallucination alone = 5 (< tripwire 12); adjudication is NOT triggered under §26.
- §27 narrative-present check: PASS at kickoff.

Fix-verdict matrix (nine adjudicated classes from Item 176):

| # | Class | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Cohort deadline mapping | PARTIAL — table correct, wrong surface | §3.b |
| 2 | Owner-slot / placeholder cleanup | PARTIAL — `deadline_basis:"We"` still emitted (1×) | run #151 sample_evidence, `rubric_citation_misapplied` |
| 3 | Pass-1 direct-Anthropic rewire | PASS — no gateway 5xx, no fallback | boot line + `_meta.pass1.provider=anthropic-direct` |
| 4 | Info-needed coherence | PASS — no empty-citation asks on RESOLVED tests except one q1-revenue reference which is a legitimate 2028 gross-revenue field | run #151 |
| 5 | ADMT gate | PASS — no `§ 7001(ddd)` on q18-negative docs | run #151 sample |
| 6 | Truncation residue | FAIL — `"...does not support this statement; it."` shipped in `adverse_effects` (2×) | §3.c |
| 7 | q5b × i1 pair contradiction filter | PASS in principle — filter is running (see §3.c); the residue is the filter's own annotation, not the filtered text |
| 8 | Risk-register differentiation | PARTIAL — `rubric_unsupported_business_claim` still fires 3× (systematic-observation trigger not interrogated) | run #151 |
| 9 | Adverse-effects conditioning | FAIL — profiling adverse_effects retains filter-annotation fragment | §3.c |

---

## 3. FOUR ROOT-CAUSE TRACES (with code-path citations)

### 3.a — DECLARED-vs-ACTUAL DOCUMENT COUNT (batch_size=1 → 3 docs)

**Symptom:** batch `fa554c22` and run #151 declare `batch_size=1`; harness produced 3 documents (run #149 identical signature — declared 1, "Doc x/3").

**Chain:**
1. `supabase/functions/quality-batch-orchestrator/index.ts:381-382` — `seedAndResume` pins intakes via `goldenIntakes(tool)` **without slicing to `batchSize`**:
   ```ts
   const pinned = goldenIntakes(tool); // returns full registry array
   intakes.push(...pinned);
   ```
2. `supabase/functions/_shared/golden/registry.ts` → `CPPA_RISK_GOLDEN` (`supabase/functions/_shared/golden/cppa-risk.ts`) contains **three fixtures** (positions 0–2). So `intakes.length = 3` immediately.
3. `supabase/functions/run-quality-batch/index.ts:1908-1910` — generation gate is one-sided:
   ```ts
   if (intakes.length < batchSize && nextIdxSafe === 0) {
     const needed = batchSize - pinnedCount;
     …generate…
   }
   ```
   No `else if (intakes.length > batchSize)` branch. When `pinnedCount (3) > batchSize (1)`, the array is neither trimmed nor rejected; execution falls through to `runUnit` which iterates `intakes.length` (`Doc 1/3 … Doc 3/3`).
4. `runUnit` (same file) increments `next_doc_index` per intake without consulting `batchSize`.

**Fix proposal (contained, non-invasive):**
```ts
// quality-batch-orchestrator/index.ts, after the pinned push:
if (pinned.length > batchSize) {
  await log("error", `DECLARED-COUNT VIOLATION: pinned=${pinned.length} > batch_size=${batchSize} for ${tool}. Aborting at dispatch.`);
  await upd({ status: "error", error: "declared_count_conformance_violation", completed_at: new Date().toISOString() });
  return;
}
```
Plus a `declared_count` / `actual_doc_count` pair on `quality_runs` (write `declared` at kickoff, `actual` at `runUnit` exit; assert equal at `status='complete'`). Deemed **simple, contained** — carries into Stage B.

**Evidence-disposition rule:** all 3 clean-arm docs count as clean-arm evidence (larger sample = stronger, not weaker); cost impact ≈ 2 extra Claude+GPT doc-cycles.

---

### 3.b — COHORT "not stated" (qc_r1_4_cohort_determinism, 2× critical)

**Grader evidence:** `"resolved band $25M to under $50M requires § 7121(a) cohort April 1, 2030 (ISO or long form) in submission_summary; not stated"` (×2, run #151).

**Chain (per failing doc):**
1. Intake: `q1_revenue = "$25M to under $50M"` (golden `cppa-risk.ts:8`).
2. `supabase/functions/_shared/cppa-test-states.ts:57` — `classifyRevenueBand("$25M to under $50M")` → `{ key: "25_50m", audit_cohort: "2030-04-01" }`. ✅ correct.
3. `supabase/functions/run-cppa-risk-assessment/_risk_cohort_date.ts:70-71` — `COHORT_TRUTH_TABLE["25_50m"] = { subdivision: "(a)(3)", date: COHORT_DATE_LITERAL_25_50M ("April 1, 2030"), period: … }`. ✅ correct.
4. `deterministicSentenceFor("25_50m")` (same file, ~line 82) returns the correct sentence "Per 11 CCR § 7121(a)(3), the first cybersecurity audit report is due April 1, 2030 (audit period …)". ✅ correct.
5. `applyRiskCohortDate` (same file, lines 279-291) writes the sentence to **`report.cross_tool_recommendations.cybersecurity_audit_rationale`**.
6. `qc_r1_4_cohort_determinism` (`run-quality-batch/index.ts:645-679`) inspects **`report.submission_summary`** and only `submission_summary`.

**Root cause: SURFACE MISMATCH.** The emitter writes to `cross_tool_recommendations.cybersecurity_audit_rationale`; the check inspects `submission_summary`. `ALL_COHORT_DATE_RE` excision runs over the whole report and may also strip a correctly-modelled sentence from `submission_summary` before the emitter can inject anywhere. Result: the correct literal never reaches the graded surface.

**Fix proposal:** extend `applyRiskCohortDate` step (4) to also write the deterministic sentence into `report.submission_summary` (append-if-absent, idempotent), guarded by the same wrong-date excision. `submission_summary` becomes an additional plan-bound target for the cohort-date emitter, per §28 subordination (write is plan-bound, not free-form). Add an exhaustive band×surface test using the exact intake labels of the three failing docs as fixtures.

---

### 3.c — FILTER-ANNOTATION LEAK (`adverse_effects` truncated fragment, 2× hallucination)

**Grader evidence:** `"The adverse_effects description for 'Profiling and inference-based privacy intrusion' contains: 'The intake on profiling and systematic observation does not support this statement; it.'"`

**Chain:**
1. `supabase/functions/run-cppa-risk-assessment/_risk_intake_contradiction.ts` — the Class-A/Class-B filter's own **downgrade phrasings** contain the string `"does not support this statement"` (Class-B templates for profiling-negative and admt-negative contradictions).
2. The filter is designed as a whole-sentence-excision-only pass — Class B returns `""` to drop, or `null` to keep, and never returns replacement prose. However, the *model* is instructed via prompt to reconcile intake contradictions, and the model has learned to mimic the filter's diagnostic vocabulary ("the intake on X does not support this statement…") in its own output — producing prose that the filter itself cannot recognise as internal-vocab because the model authored it.
3. The truncated `"; it."` suffix indicates a Class-A excision hit downstream of the model's sentence, chopping the trailing clause mid-word. Sentence splitter (`_risk_intake_contradiction.ts:68-74`) preserves terminators but does not guarantee that a following excision won't leave stub tokens.
4. No downstream **value-level** default-deny screen catches "does not support this statement" / "the intake on" as internal-vocab; existing scrubbers (`run-cppa-risk-assessment/index.ts:2642+`) redact specific field-id tokens (`i5_admt_logic`, `i7_internal_contributors`) but not natural-language filter phrasings.

**Root cause:** filter reasoning vocabulary escapes the filter's own detection surface via model-authored mimicry; post-render asserts have no lexicon coverage for filter-annotation phrasings. This is exactly the leak-class §5 was designed to permanently close — motivating the **CHOKE-POINT VALUE SCREEN** in Stage B.

**Fix proposal:** seed `_shared/leak-lexicon.ts` (Stage B) with these exact phrasings — `/the intake on [^.]+ does not support this statement/i`, `/does not support this statement; it\.?$/i`, and generalise via property tests. Value-level screen at LEAK-PREV-P2 serializer boundary — FAIL-LOUD on hit; one bounded recompose then B-native write-around for the section.

---

### 3.d — CONTRIBUTOR-LIST SUBSTITUTION (§ 7152(a)(8) leak, hallucination + intelligence)

**Grader evidence:** `"§ 7152(a)(8): contributors documented (the internal contributors identified in the record, the internal contributors identified in the record, Data Platform Lead)"` — generic phrase repeated 2×, then a live name survived.

**Chain:**
1. Golden fixture (`supabase/functions/_shared/golden/cppa-risk.ts:37`) sets `i7_internal_contributors = "Privacy Officer; Head of Engineering; Data Platform Lead."` (note the **trailing period** on the last name).
2. `supabase/functions/_shared/ltp/waveb-completion.ts:148-155` builds per-name PII replacement rules:
   ```ts
   const roster = intake?.i7_internal_contributors;
   for (const name of roster.split(/[;,\n]+/).map(s => s.trim()).filter(s => s.length > 2)) {
     const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
     rules.push({ re: new RegExp(escaped, "g"),
                  replacement: "the internal contributors identified in the record" });
   }
   ```
3. Split on `[;,\n]+` yields three tokens: `"Privacy Officer"`, `"Head of Engineering"`, `"Data Platform Lead."` — the third **includes the trailing period**.
4. `escape` correctly escapes `.` → `\.`. Regex becomes `/Data Platform Lead\./g`. The model output writes `"…Data Platform Lead)"` (name followed by `)`, no `.`). The pattern fails to match → **no substitution**.
5. Substitutions #1 and #2 succeed → per-name replacement produces the identical phrase twice → double-render.

**Two-fold defect:** (a) trailing-period-in-token breaks the escape/match; (b) **per-name** substitution is architecturally wrong — a list of N names becomes N repetitions of the same replacement phrase. The PII rule should be **list-level**, not per-name.

**Fix proposal:**
- Strip trailing punctuation from split tokens before escaping (`name.replace(/[.,;:!?]+$/, "")`).
- Change the rendering rule to **list-level**: replace the entire enumerated list with ONE occurrence of `"the internal contributors identified in the record"`, or, per §28 subordination, emit a titles-only enumeration bound to a plan slot. Flag for the follow-on content decision (Stage B round selects between "single phrase" and "titles-only enumeration").
- Regression fixture: exact golden roster string with trailing period + output containing `"Data Platform Lead)"`.

---

## 4. NEW LAW — DECLARED-COUNT CONFORMANCE (clause candidate for §16)

Proposed §16 clause (measurement-validity law):

> **§16.n DECLARED-COUNT CONFORMANCE.** A batch/run must produce exactly the declared document count (`batch_size`), or abort at dispatch with a diagnostic. Both `declared_count` and `actual_doc_count` are recorded on the `quality_runs` row and asserted equal at `status='complete'`. Pins that exceed `batch_size` are a dispatch-time error, not a silent expansion. Runs that violate this clause are §16-non-evidential unless the CEO explicitly rules the extra docs count as clean-arm evidence (per the disposition rule applied to run #151).

Recommend adoption in the SMOKE-FIX-ROUND courier (Stage B) once its implementation lands.

---

## 5. FORCED-DEGRADATION ARM — CHECKPOINTED AS DEFERRED

Requires: (a) set `LTP_TEST_FORCE_WRITE_AROUND=1` (full edge redeploy + boot-prove), (b) launch batch_size=1 canonical wrapped run, (c) wait terminal (~20 min), (d) unset secret (full redeploy + boot-prove), (e) verify write-around telemetry (`_meta.legal_test_pipeline.mode.write_around=true`, registry-only sections, "Items for your review" disclosure, zero internal-vocab in degraded prose, value-screen still holds).

**Status: A.ii-DEFERRED to next contiguous turn.** The full-chain authorization checkpoints "after each courier"; this is the courier for A.i. A.ii runs at the top of the next turn, then Stage B fires per its own dispatch on A.ii completion. This deferral is a physical single-turn constraint, NOT a scope reduction — the arm still runs before B.

---

## 6. HARD-STOP CONFIRMATION

- No enforcement-state change.
- No Engine-A action.
- No Wave D.
- No new emitter deploys.
- Diagnosis-only writes: this courier + ledger entry.

---

## 7. FILES TOUCHED

- **New:** `docs/courier/DUAL-SMOKE-POSTFIX-2026-07-27.md` (this file).
- **Edited:** `docs/pipeline-state.md` (header stamp + ledger Item 178).
- **No code, prompts, rubrics, graders, goldens, contracts, migrations, or deploys this turn.**
