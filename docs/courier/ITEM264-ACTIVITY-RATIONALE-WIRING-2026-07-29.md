# ITEM 264 — ENRICHED BALANCE RATIONALE WIRED INTO `risk_assessment_by_activity`

**Stamp:** 2026-07-30T00:50Z (dispatch id: ITEM 264 — TRACK 2)
**Scope:** `_shared/ltp/section-composers/cppa-risk.ts`, `_shared/ltp/pass2-assembler.ts` (one-item aggregation seam only), `_shared/ltp/item264-activity-rationale.test.ts`, this courier, ledger. Templates, registries, prompts, screens, legacy wire, snapshot: UNTOUCHED.
**Content law:** ZERO new customer-facing text authored. Every sentence shipped by this change comes from an already-ratified template body or an already-ratified clause constant.

## 1. Basis (verbatim, from `pass2-templates.ts` — "ENRICHED BALANCE RATIONALE (CONTENT COURIER 2026-07-27)")

> Renders EXISTING validated data only: factor_basis = factor row's
> weight_note (facts); guidance_clause renders ONLY from FSOR-anchored
> guidance for that factor via {{cite:GUIDANCE_PIN}}. Factors with empty
> guidance render basis-only (no invented reasoning). Composition order:
> benefit factor_lines → negative factor_lines → safeguard factor_lines →
> existing firm/hedged conclusion sentence. Calibration law unchanged
> (firm forbidden at closeness ≥ FIRM_VARIANT_CLOSENESS_MAX).

Template body (unchanged, `pass2-templates.ts:213-221`):
`"{{plan:factor_label}}: {{plan:factor_basis}}. {{plan:guidance_clause}}"`, `max_chars: 420`, `citation_slots: ["GUIDANCE_PIN"]`.

Guidance-clause canonical phrasing is taken verbatim from the ratified example in `content/content.test.ts:103`:
`"The Agency's Final Statement of Reasons addresses this consideration: [pinpoint]."`

Golden-Shape quota (`golden-shape-quotas.ts:58`): `risk_assessment_by_activity` ≥1 item, ≥800 avg chars/item (target ~1,215).
Evidence: ramp step 2 — all 10 docs fail ONLY `golden_shape:risk_assessment_by_activity` (ledger Item 263).

## 2. VERIFY-FIRST — the shipped-item seam

`pass2-assembler.ts:274-317` (`renderTemplateSection`, pre-change): `composeSection(shard.key, plan)` returns `TemplateInstance[]`; each instance is rendered by `renderTemplate` and `rendered.push(r.text)` appends **one string per instance** to `rendered`, which becomes the shipped array `value` (`pass2-assembler.ts:317`). **1 instance = 1 shipped list item.** The quota measures avg chars **per shipped item**, so an activity's four-part rationale MUST collapse into one item.

Mechanical seam landed (assembler mechanics, NOT prose):
- `TemplateInstance` gains optional `parts?: readonly TemplateInstance[]` (`section-composers/cppa-risk.ts`).
- `renderTemplateSection` renders each part with the unchanged `renderTemplate` (per-part `max_chars`, fill-or-omit, forbidden-token and calibration checks all still applied per part) and joins the non-empty rendered texts with a **single space** into one item. Non-`parts` instances keep byte-identical behavior (single chunk pushed unmodified).

## 3. What `composeRiskByActivity` now emits

Per engaged applicability proposition, ONE item whose parts are, in the ratified order:

1. **record-status** — `T.risk.summary.docs`, `docs_completion_clause` driven by the same `insufficientRecord(plan)` boolean already in use.
2. **colorable argument** — `T.risk.balance.factor_line` per PRESENT `benefit` factor: `factor_label` = `display_label`; `factor_basis` = `weight_note` verbatim (trailing period trimmed only, so the template's own period is not doubled); `guidance_clause` from the row's first `guidance_refs[].regulation_citation` in the ratified phrasing, with the same pinpoint bound to `__cite.GUIDANCE_PIN`.
3. **countervailing** — `factor_line` per PRESENT `negative_impact` factor, then per PRESENT `safeguard` factor (ratified order keeps safeguard lines before the conclusion).
4. **calibrated outcome** — the existing `balanceInstance(plan)` (firm/hedged/negative/insufficient via `aggregateBalance` + closeness law), unchanged; it is also the carrier `template_id` so `assertCalibrationMatch` still sees the balance template id.

Rows with no `weight_note` (including absent rows) are **not emitted** — absent rows have no basis. Rows with no `guidance_refs` render **basis-only**.

**Recorded limitation (per dispatch (iii)):** absent-safeguard / gap **enumeration** was NOT added — no already-ratified template covers a gap-enumeration shape inside `risk_assessment_by_activity` (the enumerated-gap shape lives in `safeguard_gaps` / the gap-driven action composer). Omitted rather than authored; flagged here for a future ratified-content turn.

The LIA line (`T.risk.less_intrusive_alternatives.*`) remains its own single-template item, unchanged.

`SECTION_COMPOSERS_VERSION` → `ltp-section-composers-cppa-risk-2026-07-29-item264-activity-rationale`.

## 4. Tests — verbatim

New `item264-activity-rationale.test.ts` (3 benefits / 3 negatives / 1 safeguard, mixed guidance presence):

```
running 4 tests from ./item264-activity-rationale.test.ts
item264 — one rationale item per engaged activity (plus the LIA line) ... ok (3ms)
item264 — ratified composition order inside the single item ... ok (0ms)
item264 — weight_note verbatim as factor_basis; basis-only when no guidance ... ok (0ms)
item264 — rendered item carries record status, factor lines, conclusion, and clears the 800-char floor ... ok (1ms)
```

Full regression (item264 + item262 + replay + pass1-injection + grader-check-mirror + grounded-note-mode + e2e-document + surface-ownership):

```
ok | 54 passed | 0 failed (1s)
```

Assembler + golden-shape gate:

```
ok | 7 passed | 0 failed (190ms)
```

**Pre-existing failure (evidence-only, NOT adjusted):** `content/content.test.ts` — "content: pass2 templates present with expected ids" fails because its hard-coded expected id list predates the Item 241.3/244 template additions (`T.risk.processing_narrative`, `T.risk.less_intrusive_alternatives.*`, `*.v2`). `git diff HEAD -- _shared/ltp/content/` is empty this turn; templates were not touched.

## 5. Four-lens review

- **CS:** wiring of ratified content only; the one-item aggregation is assembler mechanics (a whitespace join of independently rendered ratified templates). Per-part guards (max_chars, fill-or-omit, residue, forbidden tokens, calibration) are unchanged and still evaluated per part.
- **Privacy:** `weight_note` values already pass the Pass-1 screens and the assembler's narrative-class PII scan, which runs on the joined value exactly as before. No new data surface.
- **Prompt:** no prompt change.
- **Prose:** composition order is exactly as the 2026-07-27 ratified courier states; zero new sentences. Gap enumeration omitted rather than authored (§3).

## 6. Deploy

EXPLICIT redeploy of `replay-cppa-risk-harness` ONLY. No harness invocation, no Pass-1 model call — controller reruns personally.
