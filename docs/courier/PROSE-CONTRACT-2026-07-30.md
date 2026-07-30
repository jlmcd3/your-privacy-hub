# PROSE CONTRACT — CPPA RISK ASSESSMENT (Pass-2R)

**Date:** 2026-07-30 · **Item:** 277 (Redesign Step 3, drafting turn) · **Status:** SIGNED, four lenses
**Governing spec:** `docs/CPPA-RISK-IMPLEMENTATION-SPEC-v1.md` §2R (spec governs over code)
**Disposition:** drafting turn. **No `.ts` file changed. No deploy. No harness invocation.**

---

## 1. GOVERNING CLAUSE — CEO CAVEAT (VERBATIM, BINDING)

> "The document is a narrative, a guide, a useful tool"

with:

> "1. an overview of the CUSTOMER first, then the factors of assessment, then the key facts to be assessed, all in the initial section. 2. Required analysis, with reasoning constrained to the issues presented by the facts. 3. Identification of missing information, if any, and next steps. and 4. a clear conclusion that tells the user the result of the assessment - and how it could be changed if additional or different information were to be added."

Every commitment below is subordinate to this clause. A document that satisfies all validators but is not a narrative, a guide, and a useful tool has failed this contract.

## 2. DOUBLE-CHECK RECORD (spec re-read before drafting)

`docs/CPPA-RISK-IMPLEMENTATION-SPEC-v1.md` did not exist in the repository; it was instantiated this turn with the provenance note and anchor map. §§2/4/5/6 were re-read in the in-repo governing text `docs/design/LEGAL-TEST-PIPELINE.md`: §2 primary targets (lines 43–50), §4 Pass-2 rendering contract (288–302) — **the hook point for §2R** — §4.2 prohibitions (302–312), §5 success criteria (313–324), §6 surface audit (325–336). The dispatch's "§6 lifecycle law" is the controller spec's guard-lifecycle clause, quoted verbatim in the ledger at `docs/pipeline-state.md:6309`. Six contradictions with existing spec text are listed and resolved in §2R.8 — none left implicit.

## 3. FOUR-LENS SIGN-OFF

### 3.1 LEGAL LENS — signed
- Every statute pinpoint in prose is plan-carried; the model never types a `§`. Corpus text is quoted from the pinned row, with the row's own typography (Item-276 rider precedent).
- **Standards are stated from the rule, never from an example.** The § 7156(a)(1) Business E facts are not the § 7156(a) standard; the same discipline applies to every provision with illustrative subdivisions.
- Counsel-reserved determinations stay reserved: comparable-set bundling, applicability edge calls, and any conclusion the record cannot support are framed as reserved to the Company and its counsel.
- Non-engaged triggers are dismissed in one clause. Reciting inapplicable law is a legal defect, not just verbosity: it misrepresents what was assessed.
- Firm negative conclusions must engage the colorable countervailing considerations. Counting categories is not legal reasoning.

### 3.2 CUSTOMER-SUCCESS LENS — signed
- Part 1 opens with the customer, in their own operational vocabulary, naming the activity they told us about — not with a statute.
- Part 3 asks are specific and actionable: what is missing, why it matters, what to do. No ask that the document already answers.
- Part 4 tells the user the result **and** what would change it, so the report is a tool rather than a verdict.
- No internal vocabulary reaches the customer: no scores, no decimals, no metric names, no template or slot ids, no FSOR/source boilerplate.
- Nothing ships blank. If the prose pass fails for any reason, the customer receives the complete deterministic document.

### 3.3 PROMPT LENS — signed
- One call per document, locked plan in, prose out; max 2 retries on validator reject; skip-and-fall-back when the clock budget cannot cover the stage.
- The prompt carries the four-part structure, the no-new-facts contract, the verdict as an input, and the register rules — and carries the plan as data, never as instructions.
- Retries are validator-directed: the reject reason is fed back verbatim; the plan is never re-derived and never mutated.
- Telemetry mirrors Pass-1 so 2R can be measured on the same axes: attempts, latency, validator outcomes, `shipped_surface`.

### 3.4 PROSE LENS — signed
- Plain professional register: complete sentences, no lists masquerading as sentences, no markdown literals.
- Length limits cut at sentence boundaries. Mid-word and mid-token truncation are rejects, not cosmetic issues.
- Acronyms keep their casing everywhere, including sentence-initial position — restructure the sentence rather than case-fold "ADMT".
- No cloned paragraphs across sections; each part earns its place.
- The document reads as one voice from Part 1 to Part 4, with transitions that carry the reader rather than restating headings.

## 4. NON-NORMATIVE EXEMPLAR SKELETON

> **NON-NORMATIVE.** Illustrative shape and register only. Not a template, not a fixture, not a source of facts. Bracketed spans stand for plan-carried values.

**Part 1 — [Company] and the activity assessed**
> [Company] is a [sector] business that reported annual revenue [band] and personal information about [band] California consumers. The activity assessed here is [primary activity], undertaken to [purpose].
> This assessment weighs the benefits of that activity to the business and to consumers against its negative impacts on consumers' privacy, and asks whether the safeguards on the record address those impacts. The facts it works from are the ones [Company] recorded: [key facts].

**Part 2 — Analysis**
> The record engages [trigger], because [fact]. [Analysis of benefits, impacts, and safeguards, tied to the recorded facts.]
> The remaining processing categories in [pinpoint] are not engaged on this record and are not analysed further.

**Part 3 — What is missing, and what to do next**
> The record does not state [missing item], which matters because [consequence]. [Company] should [specific step].
> [Company] recorded [secondary use] but did not resolve whether [dimension] matches the assessed activity; that comparison should be completed before treating the two as a single comparable set.

**Part 4 — Conclusion**
> On the record as submitted, [result, stated as the plan's verdict].
> This result rests on [pivotal facts]. If [Company] were able to record [different or additional fact], the weighing would [direction]; if [fact] proved otherwise, it would [direction]. Nothing here is legal advice, and this document must be reviewed by qualified legal counsel before any operational use or reliance.

## 5. WHAT THIS CONTRACT DOES NOT AUTHORISE

No engine code, no prompt file, no validator implementation, no deploy, and no change to the deterministic surface. Build turns implement §2R; until every validator has cleared observe-mode calibration, the deterministic Pass-2 document remains the shipping surface.
