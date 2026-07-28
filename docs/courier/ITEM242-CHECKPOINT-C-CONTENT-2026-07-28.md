# ITEM 242 — CHECKPOINT C CONTENT COURIER (defect 5)

Dispatch: `CONTROLLER DISPATCH — ITEM 242 CHECKPOINT C (2026-07-28)`
Status: **CONTENT-ONLY; NO WIRING; NO DEPLOY.** Sign-off releases 242-CP-C wiring.
Scope of this courier:
- (5a) Pass-1 derive-prompt **field-semantics glossary** entries for misread-prone intake fields.
- (5b) Pass-1 **present/note coherence** validator rule text.
- (5c) Value-screen **invented-characterization** patterns (structurally detectable additions).

The Pass-1 derive prompt is change-controlled content anchored to this courier per the 241.2 → 241.3 protocol. Sentences below are authored for verbatim insertion into `_shared/ltp/content/pass1-derive-prompt.ts` (rules 7–9 of the SYSTEM prompt, and a new APPENDIX block). Wire-time changes: prompt version bump to `pass1-derive-2026-07-28-item242-cpC`.

---

## §1 — Field-semantics glossary (defect 5, part 1)

### §1.1 Context

Run-#179 grader observed Pass-1 misreads on intake fields whose names are close but whose semantics are distinct. Two documented misreads:

- **q18b** (intake): the field carries "ADMT is used to train a model on personal information (yes/no)". Pass-1 emitted a `weight_note` characterizing the field as "training programs are absent", conflating "ADMT-training-on-PI" (a processing use) with "employee training programs" (a safeguard). Both semantically dissonant AND grader-flagged.
- **q7** (intake, external consultation): the field carries "The business consulted external stakeholders during design (yes/no)". Pass-1 emitted `present_in_intake=true` with a `weight_note` naming ONLY internal contributors as the supporting evidence — a coherence contradiction.

The fix (courier-gated) is a **field-semantics glossary** appended to the derive prompt, listing the misread-prone fields with a one-sentence gloss stating what the field asserts and what it does NOT assert.

### §1.2 Glossary entries — verbatim text for prompt appendix

Format per entry: `field_id | one-sentence semantic gloss (≤ 240 chars, one period)`.

Verbatim entries (current: none; proposed for prompt APPENDIX):

| field_id | Verbatim gloss |
| --- | --- |
| `q18_admt_use` | `Whether an automated-decisionmaking technology (ADMT) is used in the processing at all; a "no" here retires every ADMT-scoped factor and gate for this assessment.` |
| `q18b_admt_trains_on_pi` | `Whether an ADMT is trained on personal information as part of this processing; this is a processing USE — never conflate with "employee training programs" or workforce training as a safeguard.` |
| `q7_external_consultation` | `Whether external stakeholders (consumers, advocates, subject-matter experts outside the business) were consulted during design; internal contributors listed at i7 are NOT evidence for this field.` |
| `q5b_sensitive_categories` | `Which enumerated § 7001(bbb) sensitive-PI categories are processed; general "financial information" or "employment information" categories are NOT per se § 7001 sensitive PI and do not populate this field.` |
| `i1_processing_purpose` | `The specific purpose of the processing per § 7152(a)(1); generic phrases ("to improve our services", "for security purposes") do not satisfy the specificity requirement and must be flagged in weight_note when the only intake evidence.` |
| `i7_internal_contributors` | `Role titles of the business's own personnel who contributed to the assessment; this field never satisfies q7 external-consultation and is never evidence for external stakeholder input.` |
| `q11_retention_period` | `The retention period documented for the processing; a claimed exception's per-exception retention lives at `i11_exception_retention[*]` — never conflate the two.` |
| `q4_data_categories` | `The categories of personal information processed per § 7152(a)(3); an entry here does not populate q5b (sensitive-PI categories) unless the entry matches the § 7001(bbb) enumeration verbatim.` |

### §1.3 Prompt insertion form — verbatim

Proposed new APPENDIX block (append to `PASS1_DERIVE_SYSTEM`):

> "FIELD-SEMANTICS GLOSSARY (binding; consult before writing any `weight_note` that names one of these fields). Each entry states what the field asserts and, where relevant, what it does NOT assert. If your `weight_note` would characterize an intake field in a way that contradicts its gloss below, revise the `weight_note` to match the gloss OR set `present_in_intake=false` and state the missing evidence honestly. Glosses:
>
> - `q18_admt_use`: Whether an automated-decisionmaking technology (ADMT) is used in the processing at all; a "no" here retires every ADMT-scoped factor and gate for this assessment.
> - `q18b_admt_trains_on_pi`: Whether an ADMT is trained on personal information as part of this processing; this is a processing USE — never conflate with "employee training programs" or workforce training as a safeguard.
> - `q7_external_consultation`: Whether external stakeholders (consumers, advocates, subject-matter experts outside the business) were consulted during design; internal contributors listed at i7 are NOT evidence for this field.
> - `q5b_sensitive_categories`: Which enumerated § 7001(bbb) sensitive-PI categories are processed; general "financial information" or "employment information" categories are NOT per se § 7001 sensitive PI and do not populate this field.
> - `i1_processing_purpose`: The specific purpose of the processing per § 7152(a)(1); generic phrases ("to improve our services", "for security purposes") do not satisfy the specificity requirement and must be flagged in weight_note when the only intake evidence.
> - `i7_internal_contributors`: Role titles of the business's own personnel who contributed to the assessment; this field never satisfies q7 external-consultation and is never evidence for external stakeholder input.
> - `q11_retention_period`: The retention period documented for the processing; a claimed exception's per-exception retention lives at `i11_exception_retention[*]` — never conflate the two.
> - `q4_data_categories`: The categories of personal information processed per § 7152(a)(3); an entry here does not populate q5b (sensitive-PI categories) unless the entry matches the § 7001(bbb) enumeration verbatim."

---

## §2 — Present/note coherence-screen rule (defect 5, part 2)

### §2.1 Rule

A factor row is INCOHERENT when `present_in_intake=true` AND its `weight_note` names ONLY evidence that contradicts the field's semantic gloss (§1). Incoherent rows are:

1. Flagged in `validator_issues_detail` with code `pass1_present_note_incoherence` and the offending field_id.
2. Rewritten by the adapter to `present_in_intake=false` with a fresh `weight_note` = `"no record evidence"` (the standard mandatory-factor-with-no-support form per Single-Writer Law rule 4).
3. Recorded in ledger telemetry under `wa_origin=pass1_coherence_rewrite`.

Rewriting the ROW (rather than aborting the plan) is the right conservative default — it preserves the deterministic downstream while surfacing the misread in telemetry. Any grader that spot-checks the underlying misread class will still see the rewrite, not a fabrication.

### §2.2 Prompt insertion form — verbatim SYSTEM rule (new rule 7)

Proposed new rule to append to `PASS1_DERIVE_SYSTEM` after rule 6:

> "7. PRESENT/NOTE COHERENCE. If you set `present_in_intake=true` on a factor row whose supporting `weight_note` names ONLY evidence that contradicts the field-semantics glossary below (e.g. citing internal contributors as evidence of external consultation, citing an employee training program as evidence of ADMT-training-on-PI), the adapter will rewrite the row to `present_in_intake=false` with `weight_note=\"no record evidence\"` and log the rewrite. Do not treat this as an escape hatch — write coherent rows in the first place; the rewrite is instrumentation, not a policy."

### §2.3 Adapter validator rule text — verbatim for `pass1-present-note-coherence.ts`

Proposed new validator module (content courier only — not wired this turn). The module exports one function whose body is deterministic:

```
For each row in plan.factor_table:
  if row.present_in_intake === true:
    for each field_id named in row.weight_note (via FIELD_ID_REGEX):
      gloss = FIELD_SEMANTIC_GLOSSARY[field_id]
      if gloss.contradicts(row.weight_note):
        push issue { code: "pass1_present_note_incoherence",
                     row_id: row.id, field_id, gloss_excerpt: gloss.short }
        rewrite row: present_in_intake=false, weight_note="no record evidence"
        record wa_origin: "pass1_coherence_rewrite"
```

`gloss.contradicts(note)` is a pattern-registry check (below). No LLM call.

### §2.4 Pattern registry — verbatim

Proposed contradiction patterns per glossary entry (structurally detectable, no NLP):

| field_id | Contradiction pattern (regex, case-insensitive) | Rewrite justification (for telemetry) |
| --- | --- | --- |
| `q18b_admt_trains_on_pi` | `\b(employee|staff|workforce|personnel)\s+training\b` | `weight_note conflates ADMT-training-on-PI with employee training program` |
| `q7_external_consultation` | `\b(internal|in-house|staff|employees?)\s+(contributors?|stakeholders?|team)\b` (AND no `external`/`third-party`/`consumer`/`advocate` token) | `weight_note names only internal contributors as evidence of external consultation` |
| `q5b_sensitive_categories` | `\b(general financial|employment)\s+information\b` (AND no § 7001(bbb) enum token) | `weight_note names general financial/employment information as § 7001(bbb) SPI` |
| `i1_processing_purpose` | `\b(to improve our services|for security purposes|business purposes)\b` (AND weight_note length < 80 chars — meaning the generic phrase is the ONLY substantive content) | `weight_note relies solely on a generic purpose formulation` |

---

## §3 — Value-screen invented-characterization patterns (defect 5, part 3)

### §3.1 Context

Grader flagged the phrase `"audience insights"` as an invented characterization in a run-#179 weight_note — the phrase does not appear anywhere in the intake, the registry, or the provision texts. It is a plausible-sounding synthesis from the Pass-1 model. Value-screen already runs a post-serializer full-fragment lexicon (Item 205); the courier proposes to extend the lexicon with a **STRUCTURALLY DETECTABLE INVENTED-CHARACTERIZATION SET** — phrases that are (i) marketing-adjacent, (ii) not present in the ingested registries and provision texts, and (iii) not present in any intake fixture.

### §3.2 Additions to `value-screen.ts` — verbatim

Proposed new lexicon entries (append to the existing `INVENTED_CHARACTERIZATION_PATTERNS` set). Each is a case-insensitive whole-phrase match on shipped body text; a hit flags the ship for review and, at the wiring turn's discretion, converts to a hard block per the Item 214 post-serializer enforce-site.

| Phrase | Rationale for classification |
| --- | --- |
| `audience insights` | Marketing synthesis; not in § 7150–7157, § 7001, or any CPPA provision text; not an intake field. |
| `customer journey` | Marketing synthesis; not in ingested regulatory text. |
| `data-driven optimization` | Consultancy phrasing; no regulatory referent. |
| `strategic alignment` | Consultancy phrasing; no regulatory referent. |
| `stakeholder engagement` | Overlaps but is distinct from § 7150's specific consultation and notice provisions; when unmoored from a specific provision it is invented framing. |
| `holistic view` | Consultancy phrasing; no regulatory referent. |
| `enterprise-grade` | Marketing phrasing; no regulatory referent. |
| `best-in-class` | Marketing phrasing; no regulatory referent. |
| `industry-leading` | Marketing phrasing; no regulatory referent. |

### §3.3 Prompt insertion form — verbatim SYSTEM rule (new rule 8)

Proposed new rule to append after rule 7:

> "8. NO INVENTED CHARACTERIZATION. Do not use marketing- or consultancy-flavored phrases that are not present in the intake, the factor registry, the gate registry, or the provided regulation text. Non-exhaustive list of forbidden phrases: `audience insights`, `customer journey`, `data-driven optimization`, `strategic alignment`, `holistic view`, `enterprise-grade`, `best-in-class`, `industry-leading`, `stakeholder engagement` (when unmoored from a specific § 7150 consultation or notice provision). The value-screen wire-site enforces this after serialization; violations abort the ship."

---

## §4 — What ships at the wiring turn

- `_shared/ltp/content/pass1-derive-prompt.ts` — prompt version bump to `pass1-derive-2026-07-28-item242-cpC`; three new SYSTEM rules (7–9 counting the CP2 SINGLE-WRITER as 2) or one appendix + two rules per §1.3, §2.2, §3.3; APPENDIX glossary text verbatim.
- New `_shared/ltp/pass1-present-note-coherence.ts` — the validator module described in §2.3, with the pattern registry in §2.4.
- `_shared/ltp/pass1-llm.ts::applySingleWriterInjection` — call the coherence validator between injection and validation; record rewrites in `wa_origin`.
- `_shared/ltp/value-screen.ts` — extend `INVENTED_CHARACTERIZATION_PATTERNS` with the §3.2 phrases.
- New joint test file `_item242_batch3_c.test.ts` — one assert per pattern per validator (4 coherence patterns + 9 value-screen patterns = 13 asserts), plus a prompt-version-echo assert, plus a fixture that reproduces the run-#179 q18b misread and confirms the rewrite path fires.

## §5 — Standing-order alignment

- The Pass-1 derive-prompt content is change-controlled per the 241.2 → 241.3 protocol; only content the CEO signs off ships.
- The `pass1_coherence_rewrite` origin extends `WriteAroundOrigin` per Item 240 CP1 unification.
- The invented-characterization additions run at the post-serializer enforce-site established at Item 214; no new enforcement site is created.

## HARD STOP

Awaiting CEO sign-off on the verbatim text in §1.2/§1.3 (glossary + prompt appendix), §2.2/§2.3/§2.4 (coherence rule + validator + pattern registry), and §3.2/§3.3 (value-screen additions + prompt rule 8). Once approved, the wiring turn ships without re-authoring.
