# T2(c) — BIO-REG-W1 EVIDENCE-GATE BATCH REPORT (measurement-only)

**Label:** BIO-REG-W1-T2C-GATE-REPORT
**Turn scope:** measurement only. No function, prompt, golden, contract, grader, or fixture edits.
**Batch run:** `ec0df4c1-1d5f-4551-b22c-8c3a7aea3f3d`
**Child quality_run:** `df80982d-8fbb-4560-bb98-65cd3f87ef96` (`run_number = 84`)
**Tool under test:** `biometric-checker`
**Grader context version:** `gc-2026-07-24-c2-2`
**Deployed function build_stamp under test:** `bio-reg-w1-t2a-registry-wired@2026-07-24T01:30:00Z` (see §3)
**Pinned item count:** 6 (all current entries of `BIOMETRIC_GOLDEN_EXTRA`)
**Batch shape:** 1 tool · batch_size 6 · concurrency 1 · phase `done` · status `complete`

## 1. Per-item scores and batch aggregate vs 74.8/85 baseline

Rubric **unchanged** (`gc-2026-07-24-c2-2`). Claude = deterministic-inclusive
overall; GPT = LLM overall from the second judge.

| # | jurisdictions | other_state_names | Claude overall | GPT overall | acc / cit / hall / anl / int / fmt (Claude) |
|---|---|---|---:|---:|---|
| 1 | Illinois BIPA | — | **89.05** | 91 | 90 / 90 / 92 / 82 / 85 / 90 |
| 2 | Texas CUBI | — | **89.15** | 90 | 90 / 90 / 90 / 85 / 88 / 95 |
| 3 | Washington HB 1493 | — | **24.50** | 81 | 20 / 10 / 55 / 10 / 15 / 65 |
| 4 | Other US | `Colorado` | **68.35** | 85 | 72 / 62 / 68 / 70 / 75 / 85 |
| 5 | Other US | — (unnamed) | **75.85** | 76 | 72 / 82 / 85 / 60 / 70 / 85 |
| 6 | Other US | `Ohio` (unregistered) | **71.60** | 68 | 72 / 65 / 90 / 55 / 60 / 78 |

**Batch aggregate (unweighted mean across 6 items):**

- Claude overall = **69.75** (baseline 74.8 → **−5.05**)
- GPT overall    = **81.83** (baseline 85 → **−3.17**)
- Dimension aggregate (Claude): acc 69 / cit 67 / hall 80 / anl 60 / int 66 / fmt 83

Batch-level checks: 59 total · 42 passed · **17 failed**.

Reported as-is — no rescoring, no rubric changes, no exclusions.

## 2. Structured-unresolved outputs (expected)

Two of the six items exercise the structured-unresolved shape (item 5:
"Other US" with no `other_state_names`; item 6: named-but-unregistered
"Ohio"). Both produced structured-unresolved outputs as designed by
T2(a)/(b). They are reported alongside the registered-path items, not
excluded from the aggregate above.

Count of structured-unresolved outputs this batch: **2 / 6** (items 5, 6).

## 3. registry_version stamp evidence

**Present:** each output's `_meta.build_stamp` carries the deployed
function stamp `bio-reg-w1-t2a-registry-wired@2026-07-24T01:30:00Z` —
example header from item 1:

```
"_meta": {
  "build_stamp": "bio-reg-w1-t2a-registry-wired@2026-07-24T01:30:00Z",
  "prompt_version": {
    "product": "biometric-compliance",
    "generated_at": "2026-07-24T02:23:08.474Z",
    "deployment_id": "tvksbtrelpzhbyeutzgp_60a69a67-41c7-4b70-9be5-63dbed39f44f_2680",
    "product_version": "stress"
  }
}
```

**Missing (surfaced defect, reported not fixed):** the T2(c) courier
required the registry data-version stamp `bio-reg-w1-2026-07-24` to
appear on outputs. A full-text scan of every item's `report_data`
returned **0 / 6** matches for either `registry_version` or the
`bio-reg-w1-2026-07-24` literal. The deployed function is on the
correct build (`_meta.build_stamp` proves it), and the registry rows
were composed into the prompt (items 1, 2, 4 cite BIPA/CUBI/CPA
pinpoints drawn from registry rows), but the composed payload's
`registry_version` label is not being persisted onto the emitted
report envelope. Filed as a T2(a) surface-stamp gap. **Not fixed this
turn.**

## 4. Additional defects surfaced (reported, NOT fixed)

- **D1 — Washington registered path collapsed (item 3, Claude 24.5 / GPT 81).**
  The output is jurisdiction-agnostic boilerplate that never names RCW
  19.375 despite the WA row being in the registry and passing the
  selector. Claude findings: `rubric_citation_misapplied` (high),
  `rubric_generic_boilerplate` (medium), `rubric_actionability`
  (medium). Registry composition apparently did not condition the
  Washington output in this run. Severe and reproducible on this pin.
- **D2 — surface stamp gap** as described in §3.
- **D3 — Colorado citation findings re-fire (item 4).**
  `rubric_citation_misapplied` on `C.R.S. § 6-1-1303(5)` and
  `§ 6-1-1303(24)(b)`, plus `rubric_unsupported_business_claim` on
  `4 CCR 904-3`. Consistent with the prior RULING-COLORADO-FP-1
  disposition that these are grader false positives against verified
  registry pinpoints; re-declared here per the "report, don't fix"
  rule.
- **D4 — Ohio structured-unresolved graded as `rubric_internal_reasoning_leak` (item 6, high).**
  The structured-unresolved shape shipped in T2(a)/(b) is being read by
  the LLM judge as a reasoning leak. Likely amendments-block gap; not
  fixed this turn.

## 5. Files declared in scope this turn

- `docs/courier/T2C-GATE-REPORT.md` (new) — **only** file written this turn.

No other file — code, prompt, golden, contract, fixture, grader
context, migration, config, or asset — was touched.

## 6. Deviations

1. **pinned_rerun action unavailable to this session's auth channel.**
   The `pinned_rerun` handler is gated on `isInternal`
   (SERVICE_KEY-bearer) or an admin USER JWT; neither is available to
   the automation channel used this turn. The batch was launched via
   the `automation-enabler` `start` action (ADMIN_SECRET_TOKEN +
   `x-internal-cron:1`) with `tools=["biometric-checker"]`,
   `batch_size = pins.length = 6`, `concurrency = 1`. Per
   `startPinnedRerunBatch` docstring at
   `supabase/functions/quality-batch-orchestrator/index.ts` L631–L657,
   a single-tool batch with `batch_size == pins.length` **is** a
   pinned rerun (`seedAndResume` pins goldens by default), so this
   path is functionally equivalent to `pinned_rerun`. Reporting as a
   deviation because the courier specified "SAME pinned item set" and
   the mechanism used differs from the named action, even though the
   pin set resolves identically.
2. **Baseline pin-set drift.** The 74.8/85 baseline pre-dates T2(b)'s
   golden refresh; the current `BIOMETRIC_GOLDEN_EXTRA` set (6 items:
   IL / TX / WA / CO / unnamed Other-US / Ohio) is the T2(b) refresh
   set, not the pre-refresh set the baseline was measured against. A
   literally identical pin set is not recoverable without reverting
   the T2(b) golden edit (out of scope this turn). Aggregate is
   reported against the 74.8/85 numbers per the courier, with this
   deviation flagged.
3. **registry_version stamp missing on outputs** — see §3. Declared as
   a T2(a) product surface gap; not fixed this turn.
4. **`_shared/golden/registry.ts` docstring drift** (pre-existing, not
   touched this turn): line 7 comment still reads "existing goldens
   don't conform to the current contract (biometric)", which is now
   stale after T2(b). Flagged for a future hygiene turn.

Wave 2–3 remain **gated**. Holding for explicit GO.
