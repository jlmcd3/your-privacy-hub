# ITEM 368 — NLG/PROSE HARDENING (cppa-risk)

Date: 2026-08-02. Scope: `supabase/functions/_shared/prose/` only. The Item 365
corpus/refetch program, the CPPA-INCLUSION-GATE, `PRODUCT_GATES`, and the
approved `prose_document_plans` row for cppa-risk were not touched.

---

## (1) Sentinel-balance hard fail

### `supabase/functions/_shared/prose/span-tracking.ts`

| Change | Location |
| --- | --- |
| `SPAN_TRACKING_VERSION` → `prose-span-tracking-2026-08-02-item368` | line 24 |
| `rec()` now sentinel-strips both the value and the source path before wrapping, so a record value that itself contained a private-use sentinel can never produce a nested mark | lines 46–54 |
| NEW `class UnbalancedSentinelError extends Error` (carries `kind`, `index`) | lines 62–79 |
| NEW `interface SentinelDefect` — five kinds: `start_without_separator`, `start_without_end`, `separator_outside_span`, `end_without_start`, `nested_start` | lines 81–90 |
| NEW `auditSentinels(text): SentinelDefect[]` — full structural scan, returns every defect in order; shared by extraction and the lint | lines 92–163 |
| `extractSpans()` REWRITTEN: audits first and **throws `UnbalancedSentinelError` on the first defect** instead of silently skipping the mark (`if (sep === -1 \|\| end === -1) { i += 1; continue; }` is gone). The happy path no longer needs the defensive `cleanedInner` strip, because `rec()` guarantees clean values and nesting is now a hard failure | lines 165–200 |

Behavioural change: `extractSpans` is now **build-blocking**. `plan-render.ts`
calls it at lines 205, 410, 419, 426–427; a defective mark now propagates out of
`renderDocumentFromPlan` instead of producing prose that looks clean while the
verbatim guarantee has been lost. `stripSpanMarks()` is deliberately left
lenient — it is the cosmetic strip, not the guarantee.

### `supabase/functions/_shared/prose/style-lint.ts`

| Change | Location |
| --- | --- |
| import changed to `import { auditSentinels, type RecordSpan } from "./span-tracking.ts";` | line 12 |
| `STYLE_LINT_VERSION` → `prose-style-lint-2026-08-02-item368` | line 14 |
| `StyleRule` union gains `\| "unbalanced_sentinel"` (15th rule) | line 32 |
| NEW rule block at the head of the per-section loop: every `auditSentinels(text)` defect becomes a `StyleFinding` with `detail: "<kind> at <index>"` | lines 241–250 |

The lint rule catches the same class on any text that reaches
`lintDocumentStyle()` **pre-extraction** — the path where a throw is not
available because the lint is a reporter, not a renderer.

---

## (2) Fuzz / property-based coverage

New file: `tests/edge/_shared/prose/span-fuzz.test.ts`.

**Generator approach.** A seeded xorshift PRNG (deterministic; the failing seed
is printed in every assertion message and reproduces the case exactly) assembles
section bodies from a corpus of attribution clauses, analytic sentences, record
values and source paths. Seven sentence shapes plant spans at exactly the
positions where the fourteen rules interact:

- span flush against a sentence boundary (terminal and leading)
- two adjacent spans with no intervening text
- a span on a record-card line (`- Purpose: …`), which the attribution rule
  carves out
- multi-span sentences with connective text between them
- spans inside quotation marks (a real defect the battery must catch)
- segments that straddle a paragraph break (`\n\n`)
- malformed sentinels appended by five mutation operators

**Properties.**

| ID | Property | Iterations |
| --- | --- | --- |
| P1 | `extractSpans` round-trips every value verbatim; `text.slice(start,end) === value`; no sentinel survives | 400 seeds |
| P3 | `lintDocumentStyle` never throws, on clean text or raw marked text | 400 seeds (same run) |
| P2 | every malformed mark is detected by `auditSentinels`, throws `UnbalancedSentinelError`, and produces an `unbalanced_sentinel` finding — i.e. **no false-clean verdict** | 300 seeds × 5 mutations = 1,500 cases |
| P4 | planted `banned_record_phrase` / `pluralisation_artifact` / `punctuation_collision` defects are always reported; a quoted span always yields `quoted_intake_value` | 120 seeds × 3 + 1 |
| P5 | an **adversarial rewriter** (rewrites span values in upper case, injects sentinels, returns garbage) cannot alter or lose any tracked span value | 150 seeds |
| — | editable segments never overlap a span, and segments + spans cover the text exactly (no character loss) | 200 seeds |
| — | the polish pass is OFF by default for cppa-risk | 1 |

**Result:** `deno test tests/edge/_shared/prose/span-fuzz.test.ts` →
`ok | 6 passed | 0 failed (276ms)`.

---

## (3) Reuse-law check — Pass-2R and the Item 340 polish runner

Read directly, this turn:

**Pass-2R is NOT inert, and the brief's premise is out of date.** It is
reachable from — and executed on — the live path:

- `supabase/functions/run-cppa-risk-assessment-v2/index.ts` builds options with
  `mode: "enforce"` (line 69) and awaits `runCppaRiskPass2R(gen, options)`
  (line 98) inside the persisted lifecycle.
- `_shared/ltp/generate-cppa-risk.ts:275` computes
  `const enforce = (options.mode ?? "enforce") === "enforce"` and passes
  `enforce` into `runProsePassStage`.
- `_shared/ltp/pass2r-llm.ts:501` additionally requires
  `LTP_ENFORCE_ENABLED === "1"`, which Item 358 confirmed is set on deployed v2.
  With both true, `mode` is `"enforce"` (line 511) and, if all seven validators
  pass, `shipped_surface` is `"2R"` and the model's narrative is merged onto the
  deterministic payload (`generate-cppa-risk.ts:307–313`).

So the file comment at `pass2r-llm.ts:22` ("`enforce: true` is set by nothing in
the codebase") is stale — Item 357/359 wired it. It is no longer
observe-only and no longer confined to `replay-cppa-risk-harness`. Flagged as a
finding, not changed: altering the live Pass-2R posture is outside this task's
scope and needs a CEO decision.

**Item 340 polish runner is fully inert and orphaned.** `_shared/prose/polish.ts`
and `polish-flags.ts` are referenced only by each other, `entailment.ts`,
`tests/edge/_shared/prose/polish.test.ts` and the ledger. No engine, function or
route imports `runProsePolish` / `polishEnabledFor`. All twelve product flags are
`enabled: false, mode: "shadow"`.

**The Item 363 frame/plan pipeline is itself not on the live path either.**
`composeCppaRisk` / `renderDocumentFromPlan` / `loadFrameSet` /
`loadDocumentPlan` are imported only by `scripts/` and `tests/` —
`generate-cppa-risk.ts` imports none of them. Item 363's prose architecture is
therefore currently a parallel, fully-linted track rather than the shipping
renderer, and the new polish pass sits on that same track. This is stated plainly
rather than assumed: wiring the frame/plan pipeline into `generateCppaRiskReport`
is a separate, unauthorised change.

Pass-2R's generate-then-validate-after design does not meet the structural
requirement in (4), so it was not switched on as the naturalness mechanism. What
was reused conceptually: whitelist-style after-the-fact validation, retry framed
by the rejection reason, and plan-is-data framing.

---

## (4) The polish pass

New file: `supabase/functions/_shared/prose/span-safe-polish.ts`
(`SPAN_SAFE_POLISH_VERSION = "prose-span-safe-polish-2026-08-02-item368"`).

**Structural incapability (not instruction).** The section's clean text is cut at
the extracted span offsets into `EditableSegment`s — the plain text *between*
spans. The rewriter seam
(`type SegmentRewriteFn = (call: PolishSegmentCall) => Promise<string | null>`)
receives one segment at a time and nothing else: span text is not in its input.
`reassemble()` rebuilds the section by interleaving rewritten segments with span
values read from the ORIGINAL `RecordSpan.value`, and recomputes offsets. There
is no code path that writes rewriter output into a span range; the rewriter's
return value is also `stripSpanMarks`-ed so it cannot forge a mark. P5 of the
fuzz suite proves this against a rewriter that actively attacks.

**Validation.** Baseline findings are computed on the deterministic document.
Each candidate is re-run through the **full battery — all fourteen Item 363
rules plus `unbalanced_sentinel`** — with the candidate section swapped into the
whole document (so cross-section rules such as `sentence_duplication`,
`section_order` and the attribution-rotation checks still apply). Any finding not
already in the baseline rejects the candidate. Additionally, a candidate whose
span count/values/sources differ from the input can never ship. No exemptions.

**Fallback law.** Rejection, throw, empty input or a section with no editable
segments ships the deterministic text. Up to 2 attempts, the second framed by the
rejection reason.

**Rollout: OFF.** `SPAN_SAFE_POLISH_FLAGS["cppa-risk"] = { enabled: false, mode:
"shadow" }`. No engine, function or renderer imports this module. `force: true`
exists for calibration only and still never ships (shipping requires
`enabled && mode === "live"`).

**Observe sample:** `scripts/prose/polish-sample.ts` renders the Item 363
acceptance fixture and runs the pass with a deterministic offline rewriter (no
model call, byte-reproducible). Output archived at
`docs/reviews/ITEM368-POLISH-SAMPLE-cppa-risk-2026-08-02.md`:
`sections=9 candidates=9 changed=1 accepted=9 shipped_polished=0`.

---

## (5) Regression evidence

| Battery | Result |
| --- | --- |
| Item 363 acceptance render (`scripts/plans/item363-render.ts`, fixture `risk-saas-clean-tuning`) | exit 0 — **22 PASS / 0 FAIL**, "ITEM 363 ACCEPTANCE: ALL CHECKS PASSED", 17 record-derived spans (the 21 named checks plus the connective-edge summary line) |
| New fuzz suite | 6 passed / 0 failed |
| `deno test tests/edge/_shared/prose/` | **119 passed / 3 failed** |

The 3 failures are **pre-existing and unrelated to this item**: `frames.test.ts`
F7 and F17 and `plan.test.ts` "reviewed plans are lint-clean but not yet
approved" all assert `approved === false` / `planRenderable === false`, which
Item 363 invalidated when it flipped the cppa-risk libraries to `approved: true`.
They are stale assertions from the pre-approval era; correcting them touches the
approval state's test contract and was left alone under this task's do-not-touch
list.

Separately, `deno test tests/edge/_shared/` (the wider directory) fails
typecheck in `tests/edge/_shared/render-plan/validators.lia.test.ts:237`
(TS2322, `GuidanceRef.authority_weight` missing on a literal) — also
pre-existing, in an LIA fixture with no relationship to the prose modules.
