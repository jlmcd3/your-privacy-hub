# Scoring at /all-ptest — scope (no implementation)

## What exists today

- **/all-products-test** scores every generated document with a rubric grader: six dimensions (accuracy, citation, hallucination, analysis, intelligence, formatting), each 0–100, weighted into one overall number, produced twice — once by Claude, once by GPT. Scores land on the run outcome row and in the per-batch "Tools & batch scores" matrix.
- **/all-ptest** has no scores. Its two reviewers return *findings* only (quoted defect, severity, explanation), then arbitration turns those into an agreed fix list and a CEO decision sheet. Nothing numeric comes back, so batches cannot be compared to each other or against the 95% target.

## The core question

Where does a number come from on a page whose reviewers were deliberately built to report defects rather than grade? Two sources are possible, and they answer different questions.

### Option A — derive the score from the findings (no extra model calls)

Compute a score from what the reviewers already return: start at 100, deduct per finding by severity (e.g. critical 15, major 7, minor 3, editorial 1), floored at 0. One score per reviewer per document, plus a post-arbitration score using only the *agreed* fix list (CEO-deferred and rejected items excluded).

- Costs nothing, adds no latency, cannot fail.
- Fully explainable: every point lost traces to a quoted finding.
- But it measures defect *count*, not document quality — a thorough reviewer scores the document lower than a lazy one, and it is not comparable with /all-products-test numbers.

### Option B — ask each reviewer for a scored verdict (one extra JSON block, same call)

Extend the review prompt so each reviewer, after listing findings, also returns the same six dimension scores and an overall score used at /all-products-test. No additional API call — it rides in the existing response.

- Directly comparable with /all-products-test history and with the 95% target.
- Keeps the rubric vocabulary the fleet already reasons in.
- Slightly longer output per call (a few hundred tokens); a small risk the model anchors its findings to the score it wants to give, which the prompt must guard against by requiring findings first, score last.

### Recommendation

Do both, and store both. Option B is the headline score (comparable, familiar); Option A is the deterministic cross-check that catches a reviewer whose score and findings disagree. Flag any document where the two diverge by more than ~15 points — that gap is itself a quality signal about the review, and it is free.

## How scores reach the batch automatically

The path is already built; scoring slots into it without new orchestration.

```text
generate docs → review (Claude | GPT) → per-doc arbitration → per-product merge → batch complete
                      ▲ scores parsed and stored here        ▲ agreed-fix score here   ▲ rollups here
```

1. `deep-review-document` parses the score block alongside findings (same validation pass that enforces the quote law) and writes it on the review row.
2. `arbitrate-review-batch` computes the post-arbitration score per product during the merge it already performs.
3. The driver, on the last job of a batch, writes the batch rollup — no new polling, no new worker.

## Data changes

- `ptest_reviews`: add `dimension_scores jsonb`, `overall_score numeric`, `derived_score numeric` (Option A), `score_source text`.
- `ptest_arbitrations`: add `agreed_score numeric`, `score_notes text`.
- `ptest_batches`: add `scores jsonb` — per product: Claude mean, GPT mean, combined mean, post-arbitration mean, document count — plus `batch_mean numeric` for the single headline figure.

All additive and nullable, so existing batches keep working and simply show "—".

## Page changes

- A **Batch scores** matrix under the run log, matching the /all-products-test layout: products down, reviewers across, mean per cell, batch mean in the corner.
- Each document line in the run log gains its score as it completes (`· scored — Claude 91.4 / GPT 88.0`).
- The history panel shows the stored batch mean per past run, so runs are comparable over time, and the Markdown download carries the score table.

## Decisions needed before building

1. Should the headline score be the raw reviewer score (Option B) or the post-arbitration score (defects that survived scrutiny)? The second is the honest measure of the product; the first is comparable with existing /all-products-test history.
2. Should the six /all-products-test dimensions be reused as-is, or does deep review want its own set (wording, grammar, legal accuracy, logic, structure)? Reusing them buys comparability; a fresh set better matches what this page actually looks for.
3. Severity weights for the deterministic score — the values above are a starting proposal, not a rule.

## Cost and risk

No additional API calls; output tokens rise a few percent per review. The quote law, the drop-count, arbitration behaviour, the fix-item tracking and the human gate on fixes all stay exactly as they are — scoring is read-only reporting layered on top.
