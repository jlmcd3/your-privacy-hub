# Quality-Batch as a Post-Rebuild Product-Quality Harness — Findings + Recommendation

Exploratory report. Nothing is built until the CEO reviews.

## PART A — Item 305 compliance check (state only, no fix in this turn)

Confirmed by direct inspection:

- No courier document exists for Item 305. `docs/courier/` contains ITEM298/299/300/301/302/303/304 files but nothing for 305.
- No pin/regression test was authored anywhere. `src/registry/__tests__/` holds 12 tests (cyber, gdpr, registration, risk-verified-authorities, etc.) and none reference the § 7152(a)(5)(A)–(H) harm catalogue, `activity_analytics`, or the new a2/a4/a5/a6/a9 fields. `src/lib/__tests__/` likewise has no analytics test. The intended `src/registry/__tests__/cppa-risk-analytics.test.ts` was never written.

So the gap is real, not a diff-reading artifact: Item 305 shipped engine + contract + form changes with zero verbatim pin on the statutory catalogue and no courier. Flagged for a separate follow-up dispatch as instructed.

## PART B — What `/admin/quality-batch` is today

Chain: `src/pages/admin/QualityBatch.tsx` → `quality-batch-orchestrator` → one `run-quality-batch` child per tool.

- The page posts `{ action: "start", tools, batch_size }` (tool checkboxes + a batch-size number). Ten tools listed, matching `RUN_QUALITY_BATCH_SLUGS`.
- The orchestrator creates a `quality_batch_runs` parent, then per tool calls `buildSeedRow(tool, batchSize, …, { pins })` inserting a `quality_runs` child. `pins` defaults to `goldenIntakes(tool)` from `_shared/golden/registry.ts`, capped to `batch_size`.
- `run-quality-batch` then: validates pinned intakes → LLM-generates any remaining intakes → builds each document by invoking the real product generator → grades with Claude, then GPT cross-review → aggregates scores → proposes fixes. Per-document rows land in `quality_run_documents`; run-level scores on `quality_runs`; `quality_loop2_*` is the separate Loop-2 surface.

So the harness already does exactly what the CEO wants — run a product end-to-end on canned intake and score it. The only missing piece is *which* intake it runs on.

## PART C — Where the "dummy data" comes from today

Three distinct sources, none of them a "variant" concept:

1. **Golden fixtures** — `supabase/functions/_shared/golden/<tool>.ts`, hardcoded TypeScript `GoldenCase[]`, one file per tool, several cases each, each already tagged `set: "tuning" | "holdout" | "adversarial"` plus code-checkable assertions. These are the default pins.
2. **Contract fixtures** — `_shared/cppa-risk-contract-fixtures.ts`, `governance-`, `cyber-`, `admt-` (revision-contract scenarios; also what `admin-quality-batch2-seed` uses). Only 4 tools.
3. **LLM-generated intakes** — for any slot beyond the pins, `generateIntakes()` renders the tool's `IntakeContract` (`renderContractPrompt`) plus hand-written `SCENARIO_GUIDANCE` prose, asks a model for N intakes, then validates each against the contract.

Everything is code-resident. There is no fixtures table.

## PART D — Does the cppa-risk fixture set cover Item 305? No — and it fails loudly

Item 305 added to `cppaRiskContract` with `required: "always"`: `a2_necessity_set[]` (+`.element`, `.necessity`), `a4_benefit_business`, `a4_benefit_consumer`, `a4_benefit_other_stakeholders`, the a5 harm-pathway keys, the a6 safeguard map, and the § 7152(a)(9) `a9_approver_*` fields. Grep confirms none of these keys appear in `cppa-risk-contract-fixtures.ts`, in the cppa-risk goldens, or in `src/lib/sampleFixtures.ts`.

Consequences, both already coded:

- Pinned path: `run-quality-batch` re-validates pins at run start and, on violation, sets the child run to `status: "error"` and aborts — "Pinned-fixture contract violations for cppa-risk". A cppa-risk batch today should fail at start rather than produce a score.
- Generated path: `renderContractPrompt` reads the contract, so the LLM *is* told about the new fields, but there is no scenario guidance for them, and any intake that omits them is rejected by `validateIntake`; >30% failures aborts the run.

Net: the drift is self-flagging (good), but cppa-risk quality measurement is blocked until fixtures are refreshed. That is the concrete first task regardless of the variant work.

## PART E — Recommendation on Perfect / Bad variants

**Recommendation: extend the existing `/admin/quality-batch`. Do not build `/admin/quality-batch-prelaunch`.**

Reasoning: the request is a *fixture-selection* change, not a new measurement paradigm. Scoring, cross-review, storage, log streaming, scoreboard, ZIP export, cancellation, stall detection, and the campaign machinery are all in the existing page and orchestrator and would have to be duplicated or refactored out wholesale for a second page. The actual delta is: two checkboxes per tool, one new parameter threaded `start → quality_batch_runs → quality_runs → run-quality-batch`, and a variant dimension on the fixture data. A "perfect vs bad" run is also something we will want to compare against normal batch history, which is far easier when it is the same table with a label column than a parallel surface.

The one legitimate argument for a separate page — not wanting pre-launch experiments to pollute the ordinary batch history and the launch-gate scoreboard — is better solved by a `fixture_variant` column plus a filter on the scoreboard than by a second page.

Shape of the change (for the eventual build turn):

1. UI: per-tool row gains "Perfect" and "Bad" checkboxes (default = current behaviour, i.e. `mixed`/goldens). Selecting both dispatches two child runs for that tool, one per variant.
2. Orchestrator: `tools` becomes `Array<{ tool, variants[] }>` (back-compatible with `string[]`); `buildSeedRow` takes `variant` and pins the matching fixture set; `quality_runs` and `quality_batch_runs.tool_results` carry `fixture_variant`.
3. `run-quality-batch`: stamps `fixture_variant` on each `quality_run_documents` row and into the grader payload header (it already threads `fixtureSet` from `matchFixtureSet`), so scores can be sliced Perfect vs Bad.
4. Grading nuance worth deciding before building: Bad-Data runs should not be scored on the same rubric axis as Perfect. The valuable signal is "did it degrade gracefully" — flags what it cannot determine, refuses to fabricate. Suggest a Bad-variant rubric addendum (fabrication penalty, credit for `information_needed`) rather than reusing the Perfect rubric verbatim.

## PART F — Fixture data model and staleness

**Recommendation: keep fixtures in code, add the variant as a first-class field. Do not move them to a table.**

Fixtures are versioned artefacts that must move in the same commit as the intake contract they satisfy; a DB table decouples them from the contract and makes the drift *worse*, not better (and CI cannot read a table). The `GoldenCase.set` union already proves the pattern works.

Proposed model:

- Extend `GoldenCase` with `variant: "perfect" | "bad"` (existing cases default to `perfect`, since they were authored as well-formed intakes).
- Per tool, author exactly one Bad-Data case: every contract field present and non-empty, but vague/generic ("we process customer data for business purposes", `necessity: "unsure"`, one-word benefit statements, no named tools/owners/dates). Nothing skipped — that is the CEO's brief and it is also what the contract validator requires.
- `goldenIntakes(tool, variant)` filters by variant; registry gains a `hasVariant(tool, variant)` so the UI can grey out unavailable checkboxes while the set is being authored.

Staleness / drift discipline (the corpus-side analogue the CEO asked for):

- A CI vitest/Deno test that runs `validateIntake(contract, fixture)` over **every** fixture × tool × variant. Any new `required: "always"` field added to a contract — exactly what Item 305 did, and what the primary/secondary-activity feature will do — turns the build red at commit time instead of failing at batch start.
- A second, softer check for *quality* drift on the Perfect variant: assert each `askEligible` narrative field exceeds a minimum specificity bar (length + presence of a named tool/owner/date), so a "Perfect" fixture cannot silently rot into a mediocre one.
- Runtime already aborts on pin violations; the CI test just moves the discovery to authoring time.

## Suggested order of work (subject to CEO direction)

1. Follow-up dispatch (separate): Item 305 courier + harm-catalogue verbatim pin test.
2. Refresh cppa-risk fixtures for the Item 305 fields (unblocks measurement).
3. Add the fixture-contract conformance CI test.
4. Add `variant` to the golden model + author Bad-Data cases per product.
5. Thread `fixture_variant` through orchestrator/run-quality-batch/UI checkboxes.
6. Decide and implement the Bad-variant rubric addendum.
