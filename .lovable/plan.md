# /all-ptest — Automated Review Loop (product spec)

One product, N documents, two independent reviewers, one arbiter, one fix list, one CEO decision sheet. Built on the existing `/admin/all-products-test` machinery — nothing about generation, timeouts, byte limits, preflight or grading is rebuilt.

## 1. What the page does

Pick one product (or up to three CPPA products at once) and a document count. Then, per document:

```text
intake generation  ->  document generation  ->  dual grading
        ->  dual deep review (text + grader analysis)
        ->  arbitration (per batch)
        ->  Agreed Fix List  +  CEO Decision Sheet
```

No PDF in the loop. Formatting is settled; the reviewers read the generated document text, which is where wording, grammar, legal meaning and internal consistency live. A PDF spot check stays available as a manual button, not a pipeline stage.

Three products run as three independent workers, each with its own queue and its own call chain. Separate requests, no shared state; a rate-limit pause in one worker never stalls the others.

## 2. Carried forward, not rebuilt

Reused as-is from the existing harness: server batch orchestration and job rows, intake preflight gate, fixture shape contracts, concurrency 4, wall-clock and row-first batch discipline, invoke-with-timeout, the transient-error retry loop (send failures and boot errors retried twice with backoff; real errors never retried), grade persistence, byte-size limits on function payloads, and the untruncated Markdown export path.

New code is additive: a review stage, an arbitration stage, two artefacts, one page.

## 3. Stages, models, effort

Both reviewer models are the same price. Sonnet is excluded everywhere.

| Stage | Model | Effort | Double-check |
|---|---|---|---|
| Intake generation | Claude small tier | low | no |
| Document generation | deterministic | — | — |
| Grader A | gpt-6-astra | medium | yes |
| Grader B | Claude Fable 5.1 | medium | yes |
| Deep review A | gpt-6-astra | medium | yes (second pass over own findings) |
| Deep review B | Claude Fable 5.1 | medium | yes |
| Arbitration (1 per batch) | Claude Fable 5.1 | high | yes |
| Fix drafting | Claude Fable 5.1 | medium | yes |

Double-check is a required second section in each response — the model re-reads its own findings against the quoted source before emitting them — rather than a higher effort tier. Effort is set per call: `output_config.effort` on Anthropic, `reasoning_effort` (or `reasoning.effort`) on OpenAI.

Prompt caching is on for both providers. The system prompt, review rubric, product spine description and grader rubric are one cached prefix per product per batch; only the document text and its grader analysis vary per call.

## 4. Prompt design (one per stage)

Every prompt returns strict JSON. Every finding must carry a verbatim quote from the document — a finding with no locatable quote is dropped at validation.

**Intake generation.** "Produce one realistic intake payload for <product> matching this exact schema. Values must be plausible for a real company and must satisfy every enum listed. Vary sector, size and jurisdiction from the payloads already produced in this batch. Output JSON only."

**Grading (A and B, same rubric, different providers).** "Score this generated <product> report against the rubric. For each dimension give a score, and for each deduction give the verbatim passage, the rule it breaches and the severity. Then re-read every deduction and delete any whose quote you cannot find verbatim in the document."

**Deep review (A and B, the heart of the loop — derived from the Codex method).** The prompt instructs, in order:

1. Read the report as a connected document: company fact -> legal issue -> analysis -> determination -> required action. Assess each sentence for its role in that chain.
2. Separate the defect types: editorial (wording, grammar, repetition, fragments, dangling conditions, raw field labels, leaked identifiers such as `undefined` or `[object Object]`), factual, legal, logical, presentational.
3. Preserve the payload. Never propose wording that changes the actor, the legal condition, an exception, timing, authority attribution, certainty or the resulting action. "Must" stays "must"; a conditional conclusion stays conditional; a two-condition test stays two-condition; company-reported stays company-reported; unknown never becomes "no".
4. Check internal consistency across every place the same result is expressed — summary, narrative, matrix, status chip, action list, appendix — plus temporal consistency of dates and approvals.
5. Respect role and jurisdiction boundaries: controller vs processor, provider vs deployer, EU vs UK.
6. Where meaning depends on a missing fact or a disputed legal reading, describe the question and route it to the CEO sheet; do not invent a smooth answer.
7. Trace each finding to a likely source layer: intake mapping, normalised facts, deterministic rules, spine, prose plan, clause/authority library, assembler, layout. Say "likely source" when the trace is incomplete.
8. Reconcile each supplied grader allegation independently as confirmed, partly supported, input-dependent, needs-counsel or rejected. A low score is not a defect; a pass is not legal correctness.
9. Double-check: re-read every finding and confirm the quote is present, the product and section are right, the proposed wording preserves meaning, no sibling section contradicts it, and no two findings are the same underlying problem.

Output per finding: `id, product, variant, severity (critical/high/editorial), confidence, quote, why, proposed_change | decision_required, cause_layer, code_focus, grader_reconciliation, regression_test`.

**Arbitration (Claude is the arbiter).** "Here are two independent review sets for the same documents. Merge them, deduplicating across documents: one entry per underlying cause, listing every occurrence." Claude then classifies every finding by who raised it:

- **Both reviewers raised it** — AGREED. Goes on the fix list.
- **Only ChatGPT raised it** — Claude decides whether it is a real error needing a fix. If Claude agrees, it goes on the fix list as AGREED-ON-REVIEW. If Claude disagrees, it goes on the **CEO Decision Sheet** stating ChatGPT's proposed fix verbatim and Claude's reason for rejecting it — never silently dropped.
- **Only Claude raised it** — if it is not a CEO issue, it goes on the fix list. If it touches legal substance, pricing, product naming or a change-controlled prompt, it goes to the CEO sheet instead.

CEO sheet routing overrides all three cases: anything legal, pricing, naming or change-controlled goes there regardless of who raised it.

**Fix drafting.** For each agreed finding: the file and symbol to change, the change, the regression assertion that proves it, and the opposite/missing/boundary inputs the test must also cover.

## 5. Artefacts

- **Agreed Fix List** (JSON + Markdown) — deduplicated causes, each with code focus and a proposed regression assertion. This is a handoff, not an applied change.
- **CEO Decision Sheet** (Markdown) — anything legal, pricing, naming or change-controlled, plus every ChatGPT finding Claude declined to fix (ChatGPT's proposed fix quoted, Claude's rejection reason beside it). Each stated as a question with options and consequences.
- **Rejected log** — kept so the same finding is not re-raised every batch.

Both artefacts download from the page and persist against the batch row, so a batch can be reopened later.

## 6. Code changes

Applying fixes stays a human-gated step: the batch produces the fix list, John says "apply the agreed fixes from batch X", and I implement, test and push. That matches the change-control rule for prompts and canonicals, and keeps a person between an automated review and main. Nothing in the pipeline writes to the repository or redeploys functions.

## 7. Pass bar

A fixed canonical fixture set per product so scores are comparable run to run. Target: 95% of rubric checks passing, with the residue being findings sitting in the CEO sheet rather than unresolved defects.

## 8. Estimated cost

3 products x 5 documents, caching on, medium effort with double-check: roughly **$13–18 per batch**, dominated by the four review calls per document. Deterministic generation, PDF rendering and orchestration add no API cost. Treat as ±30% until the first real run measures actual reasoning length.

## 9. Build order

1. `/all-ptest` page and batch row, reusing the existing orchestrator and preflight.
2. Review edge function: two providers, caching, effort per call, strict JSON validation with quote verification.
3. Arbitration edge function and the two artefacts.
4. Run one product (CPPA Risk, 5 docs) end to end; tune the prompts against the first real output.
5. Add the second and third workers.
