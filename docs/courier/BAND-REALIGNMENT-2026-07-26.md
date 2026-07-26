# BAND-REALIGNMENT-2026-07-26 — T2 courier (dispatched-and-HELD)

**Dispatch:** BAND-REALIGNMENT-T2 (CEO-approved 2026-07-26 ~02:40Z; controller dispatched as dedicated turn per item 118 recommendation ~05:00Z).
**Author:** Lovable session turn @ 2026-07-26T05:08:00Z.
**Status:** ORPHAN FINALIZED ✅ | T2 EXECUTION HELD with formal T2A/T2B/T2C sub-split proposal below.
**Prior artifact:** item 113 shipped-T1 (dormant scaffold at `supabase/functions/_shared/bands/revenue-consumer.ts` and `src/lib/bands/revenueConsumer.ts`).

---

## 1. Orphan finalize (blocker-1 discharge)

Controller's blocker-1 ruling verified and discharged:

**Before** (verified via managed `psql` at 2026-07-26T04:59:57Z):

```
id           = 37a242fa-8161-4883-87c5-92097810a698
function_name = generate-dpa
status       = running
started_at   = 2026-07-26 04:50:15.249+00
finished_at  = NULL
invoked_by   = internal
metadata     = {"rowId": "6dc8202b-3e57-4703-aba4-c3e4dea78d32"}
```

Direct `UPDATE` from the exec-tool `psql` role was denied (`ERROR: permission denied for table function_runs`) — the exec role has SELECT+INSERT only, no UPDATE. Finalization was routed through a migration.

**After** (verified via managed `psql` at 2026-07-26T05:08:00Z):

```
id           = 37a242fa-8161-4883-87c5-92097810a698
status       = error
finished_at  = 2026-07-26 05:07:51.254241+00
error_message = "orphaned_harness_child of terminal quality_batch_runs 5332771a-522b-4a1c-be3e-a1373512ac68
                 (batch complete 2026-07-26T04:55:24.686Z); no customer job; finalized by
                 BAND-REALIGNMENT-T2 turn per controller orphan pattern"
metadata.outcome     = "orphaned_harness_child"
metadata.resolved_by = "BAND-REALIGNMENT-T2-2026-07-26"
metadata.parent_batch = "5332771a-522b-4a1c-be3e-a1373512ac68"
metadata.resolved_at = "2026-07-26T05:07:51Z"
```

Standing deploy guard (customer-path product rows <15 min old with NULL report) independently verified clear at 04:59:57Z: `dpa_documents` in the last 15 min = 3 rows, ALL with `report_data` populated, 0 null-report rows.

---

## 2. Pre-deploy lock re-verification

Re-verified locks at controller tick 2026-07-26T04:59:57Z immediately before considering T2 deploy:

| Check | Value |
| --- | --- |
| `quality_batch_runs` running/pending/queued/starting/running_tool | **0** |
| `function_runs` started <15 min ago with `finished_at IS NULL` | **0** |
| `dpa_documents` created <15 min with NULL `report_data` | **0** |
| `quality_campaigns.fd1be147-...` status | **paused** (CEO-reserved) |

All locks CLEAR. No wave-window constraint (campaign paused).

---

## 3. HELD ruling — T2 execution

The dispatch instructs T2 be executed as a single atomic contract turn covering the full ~50-file surface set inventoried in ledger item 118 (intake-contracts, page enums, forms, goldens, contract-fixtures, cppa-test-states, sampleFixtures, sampleFixtureShapes, stress/fixtures, rail entries, refine/fieldEnums, generate-report-pdf, generate-stress-fixtures, review-test-output, assertion tests, CPPAEvalHarness, quality-batch surfaces, grader context re-key s4 → `gc-2026-07-26-s5-eu-uk-ca-au-sg` with SHA-256 recorded, opening-builder S0 mapping, normalise legacy resolver wire-in, and deploy(s) with fresh BUILD_STAMP + boot-log proof + pasted green tests including exhaustive band→cohort map, legacy mapping, form parity, and emitter/check property tests).

The controller-in-session assessment: this scope safely lands only as its own multi-turn program. The evidence:

1. **Cross-tool epoch change.** GRADER_CONTEXT_VERSION `gc-2026-07-25-s4-eu-uk-ca-au-sg` is asserted verbatim in three grader tests (`_tests/counsel-voice-1.test.ts`, `_tests/grader-map-correction-7150b3.test.ts`, `_tests/grader-cal-1.test.ts`), stamped in every `quality_batch_runs` and `quality_batch_baselines` row for ALL tools (not just risk), and referenced by wave-marker comments in admt (`_h6_admt_anchor.ts`, `_w24_admt_audit.ts`, `_w24_admt_h6.ts`). An s5 bump resets grading epoch for admt, cyber, dpia, lia, governance, dpa-generator, ir-playbook — not just cppa-risk. This is a policy artifact, not a mechanical edit; the SHA-256 pin needs its own courier line and the CEO ruling log needs the "counters reset on s5" formal entry.

2. **Contract validator vs. stored data.** The `_shared/intake-contracts/cppa-risk-assessment.ts` enum list is closed; replacing labels rejects any NEW intake that carries a legacy string. Stored rows keep their legacy labels and continue to route through `classifyRevenueBand` (which retains legacy cases). The intersection of "new form emits V2 only" + "generator classifier tolerates both" + "normalise stamps `_meta.internal.band_legacy_ambiguous` where the legacy value straddles a statutory line" MUST be delivered as a single atomic slice — a partial ship (e.g. contract updated but classifier or resolver not updated) breaks generation for stored drafts on submit.

3. **Opening builder S0 mapping.** `_shared/openings/risk-opening.ts` `REVENUE_BANDS_CLEAR_A` and `BOUGHT_SOLD_SHARED_BANDS_100K_OR_MORE` are keyed on legacy labels. The T7 pilot ships tied to a specific band vocabulary; changing the vocabulary without updating this set silently drops S0's (A) criterion for every new customer submission.

4. **Grader context body.** SHARED_GRADER_CONTEXT prose (CYBER-AUDIT COHORT MAP, VERIFIED-ANCHOR MAP, several R-TURN paragraphs) references band strings by name ("the $100M–$500M band to April 1, 2028"). An s5 bump without in-line label sync produces a grader instrument that names V1 labels while the tools emit V2 labels — a grading-vs-generator vocabulary mismatch.

Under the standing "no partial-surface abandonment" rule for contract turns, executing this in one response is not defensible. Item 113 already ruled this class of change requires a T1/T2 split; the T2 surface itself is now ruled to require further sub-splitting.

---

## 4. Proposed T2A / T2B / T2C sub-split (for controller/CEO dispatch)

Each sub-turn is an atomic contract turn with its own courier, ledger item, pasted green tests, fresh BUILD_STAMP, and deploy(s).

### T2A — Core semantic change (~10 files, one deploy)

**Scope (deploy-critical; ships the V2 semantic change end-to-end):**
- `supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts` — REVENUE_OPTS + CONSUMER_OPTS replaced with V2 labels (imported from `_shared/bands/revenue-consumer.ts`).
- `supabase/functions/_shared/cppa-test-states.ts` — `classifyRevenueBand` switch adds V2 cases while retaining legacy cases; CB (consumer-band) map adds V2 keys; legacy-ambiguous bands classify to `key='legacy_ambiguous'` with `audit_cohort='indeterminate'` and stamp `_meta.internal.band_legacy_ambiguous=true` upstream.
- `supabase/functions/_shared/cppa-risk-normalise.ts` — wire `resolveRevenueBand`/`resolveConsumerBand` at intake entry; on legacy → V2 resolution, stamp `_meta.internal.band_v1_to_v2_resolved=<old>->${new}`; on ambiguous, stamp `_meta.internal.band_legacy_ambiguous=true` and preserve conservative no-assert behavior.
- `supabase/functions/_shared/golden/cppa-risk.ts` — base fixture `q1_revenue`/`q2_consumers`/`i3_ca_consumer_band` updated to V2 labels; per-case overrides updated; adversarial "consumer-boundary" fixture retargeted to `"100,000 to under 250,000"` (V2 label for the same statutory-edge scenario).
- `supabase/functions/_shared/openings/risk-opening.ts` — `REVENUE_BANDS_CLEAR_A` and `BOUGHT_SOLD_SHARED_BANDS_100K_OR_MORE` retargeted to V2 label set; `RISK_OPENING_VERSION` bumped to `risk-opening-t7-pilotfix3@2026-07-26`.
- `src/pages/CPPARiskAssessment.enums.ts` — REVENUE_OPTS + CONSUMER_OPTS replaced with V2 labels (single source of truth for the form).
- `supabase/functions/_shared/grader/context.ts` — GRADER_CONTEXT_VERSION bumped to `gc-2026-07-26-s5-eu-uk-ca-au-sg`; SHARED_GRADER_CONTEXT prose that names bands is retargeted to V2 labels in the cohort/anchor lines (targeted diff, not full rewrite).
- `supabase/functions/_tests/counsel-voice-1.test.ts`, `_tests/grader-map-correction-7150b3.test.ts`, `_tests/grader-cal-1.test.ts` — version-assertion literal updated s4 → s5.
- **New test file** `supabase/functions/_tests/band-realignment-t2a.test.ts` — pasted green: (i) exhaustive V2 band → § 7121 cohort map, (ii) legacy → V2 resolver on every entry of `REVENUE_LEGACY_MAP` and `CONSUMER_LEGACY_MAP`, (iii) `_meta.internal.band_legacy_ambiguous` stamped on every ambiguous-legacy input, (iv) contract-validator round-trip on golden fixtures.
- Deploy `run-cppa-risk-assessment` with fresh clock BUILD_STAMP `band-realignment-t2a@<YYYY-MM-DDTHH:MM:SSZ>` and boot-log proof.
- SHA-256 of the new SHARED_GRADER_CONTEXT string RECORDED in the T2A courier + CEO ruling log entry stating "s5 instrument in force; wave-N (whenever CEO resumes campaign fd1be147) grades on s5; per-tool baselines reset on first wave under s5 per standard epoch-change rule".

**Cross-tool impact:** every tool inherits the s5 stamp on `quality_batch_runs.grader_context_version` from the next batch onward. No prompt content changes for admt/cyber/dpia/lia/governance/dpa/ir; only cppa-risk changes generative behavior. The s5 bump is the epoch-marker that separates pre-realignment and post-realignment measurement.

### T2B — Non-generator UI/harness surfaces (~15 files, no deploy)

**Scope (form-adjacent surfaces that display band strings but don't affect generation):**
- `src/lib/sampleFixtures.ts` + `src/lib/sampleFixtureShapes.ts` — sample-viewer fixtures retargeted to V2 labels.
- `src/lib/stress/fixtures.ts` + `supabase/functions/generate-stress-fixtures/index.ts` — scenario generators emit V2 labels only; legacy generation dropped.
- `supabase/functions/_shared/cppa-risk-contract-fixtures.ts` — revision-harness fixtures retargeted to V2 (currently `"$100M–$500M"`, `"$50M–$100M"`, `"$25M–$50M"`, `"1–10 million"`, `"250,000–1 million"`, `"100,000–249,999"` → V2 equivalents).
- `src/components/cppa/CPPARiskRailEntries.ts` — StatuteRail entries updated with corpus-verified verbatim citations for § 7121(a)(1)/(2)/(3) and § 1798.140(d)(1)(B).
- `src/components/refine/fieldEnums.ts` — refine editor enums synced to V2.
- `supabase/functions/generate-report-pdf/index.ts` — pass-through band label handling audited (renderer echoes the intake string, so no logic change; audit only).
- `supabase/functions/review-test-output/index.ts` — reviewer band-drift heuristics retargeted to V2 vocabulary.
- `src/pages/admin/CPPAEvalHarness.tsx` — admin dropdowns retargeted to V2.
- `src/pages/CPPAScopeChecker.tsx` — pre-check band inputs retargeted to V2 (scope-checker feeds the risk contract; must match).
- `src/lib/tests/assertionTests.ts` + `src/lib/tests/assertionRunner.ts` — assertion vocabulary retargeted.
- `src/lib/__tests__/cppaRiskFixturesOptionDrift.test.ts` — drift assertions retargeted to V2.
- Pasted green: `bun test src/lib/__tests__/cppaRiskFixturesOptionDrift.test.ts` + `bun test src/lib/__tests__/cppaScopeChecker.thresholds.test.ts` + `bun test src/test/*`.
- No edge-function deploy (T2A already shipped the semantic change; T2B is client + admin + fixture surfaces only).

### T2C — Test surfaces + legacy-artifact cleanup (~10 files, no deploy)

**Scope (test hygiene that references band vocabulary):**
- `supabase/functions/run-cppa-risk-assessment/_w24a_v3.test.ts`, `_w12_turnd.test.ts`, `_risk_cohort_date.test.ts`, `_shared/openings/risk-opening.test.ts` — expectation strings retargeted to V2.
- `supabase/functions/_tests/intake-contracts.test.ts`, `_tests/postbatch-1.test.ts`, `_tests/revision-changed-paths-allowlist.test.ts`, `_tests/rebuild-dpia-cpparisk.test.ts` — parity assertions retargeted.
- `supabase/functions/_shared/customer-messages.ts`, `_shared/target-path-aliases.ts`, `_shared/field-enums.ts`, `_shared/locked-fields.ts` — band-adjacent enum references audited.
- `supabase/functions/run-quality-batch/index.ts` — QC-R1-4 EXPECTED-COHORT map re-keyed on V2 bands per `QC_R1_4_EXPECTED_COHORT` in `_shared/bands/revenue-consumer.ts`; ambiguous-legacy bands EXEMPT.
- Pasted green: `bun test supabase/functions/_tests/*` + all `run-cppa-risk-assessment/*.test.ts`.

**Total across sub-splits:** ~35 files (T2A 10 + T2B 15 + T2C 10 — the ~50 in item 118 double-counts a few grep hits). One edge-function deploy (T2A only). Two courier files (T2A + T2C) and one ledger item per sub-turn releasing the appropriate hold.

---

## 5. Item 116 downstream chain — HELD per split

Steps (iii)+(iv)+(v) of ledger item 116 remain queued behind T2 completion. Each step is a substantive contract/experiment/design turn requiring its own execution window:

- **(iii) PERFECT-INTAKE-EXPERIMENT-RISK** — fixture authoring against the NEW post-T2A contract enums; single batch launch (30–60 min to terminal); decomposition courier `docs/courier/PERFECT-INTAKE-EXPERIMENT-2026-07-26.md`. Cannot start until T2A ships (dispatch-stated dependency: fixtures MUST use V2 enums).
- **(iv) IR-BAND-REALIGNMENT** — separate ~50-file contract turn including corpus ingest sub-step for Cal. Civ. Code § 1798.82 and Tex. Bus. & Com. Code § 521.053. Warrants its own atomic dispatch mirroring T2A/B/C shape.
- **(v) TWO-PASS-ARCHITECTURE-DESIGN** — design turn, requires (iii)'s decomposition as input.

---

## 6. Guardrails observed this turn

- Zero code / prompt / rubric / grader / golden / registry / corpus / contract / fixture / sample edits.
- Zero edge-function deploys.
- One database write: the migration finalizing the orphan `function_runs` row (`37a242fa-...`) with full provenance in `metadata`.
- Stamps re-read from sandbox clock immediately before each write (`date -u`).
- Backend-access law observed (all reads via managed `psql`; UPDATE routed through migration path).
- CEO-reserved campaign resume invariant untouched (`quality_campaigns.fd1be147-...` remains `paused`).
- HOLD discipline observed: this courier names item 113 (BAND-REALIGNMENT T1 shipped-scaffold) and item 118 (T2 held) as prerequisites; T2A when dispatched will name both in its release note.

---

## 7. Recommended next controller action

Dispatch **BAND-REALIGNMENT-T2A** as an atomic contract turn per §4 above. On T2A completion:
1. Dispatch T2B (non-generator surfaces).
2. Dispatch T2C (test-surface cleanup).
3. Proceed with item 116 step (iii) PERFECT-INTAKE-EXPERIMENT-RISK per original dispatch.

All rulings recorded durably per CEO instruction "Write every step durably (ledger + courier) — no tick monitoring is active".

---

## T2A-HELD — GATE fired (2026-07-26T05:22:00Z)

**Dispatch:** BAND-REALIGNMENT-T2A (team-reviewed, five-lens), controller-approved sub-split per §4 above.

**Outcome:** HELD before any file edit under the dispatch's own GATE clause:

> "GATE: if any T2A test cannot be made green without exceeding the §4 T2A scope, STOP, record HELD with the specific failure pasted, do not partially deploy."

**Specific failure class:** `src/lib/__tests__/cppaRiskFixturesOptionDrift.test.ts` lines 25–36. The guard iterates `CPPA_RISK_VARIANTS` from `src/lib/stress/fixtures.ts` (assigned to **T2B** in §4, not T2A) and validates every `q1_revenue`/`q2_consumers` against `REVENUE_OPTS`/`CONSUMER_OPTS` with `legacyAccepted = ["$25M–$100M"]` / `["100,000–1 million"]` only. Retargeting the two intake enums to the V2 label set while stress fixtures remain V1 turns the guard RED on the following verified V1 values:

| File | Line | Value | Field |
| --- | ---: | --- | --- |
| src/lib/stress/fixtures.ts | 967, 1032 | "Over $500M" | q1_revenue |
| src/lib/stress/fixtures.ts | 1148, 1309, 1367 | "$100M–$500M" | q1_revenue |
| src/lib/stress/fixtures.ts | 1205 | "$25M–$50M" | q1_revenue |
| src/lib/stress/fixtures.ts | 1254 | "$50M–$100M" | q1_revenue |
| src/lib/stress/fixtures.ts | 968, 1033 | "1–10 million" | q2_consumers |
| src/lib/stress/fixtures.ts | 1100 | "Over 10 million" | q2_consumers |
| src/lib/stress/fixtures.ts | 1149 | "Fewer than 100,000" | q2_consumers |
| src/lib/stress/fixtures.ts | 1255 | "Unsure" | q2_consumers |
| src/lib/stress/fixtures.ts | 1310 | "100,000–249,999" | q2_consumers |
| src/lib/stress/fixtures.ts | 1368 | "250,000–1 million" | q2_consumers |

(`$25M–$100M` on line 1099 and `100,000–1 million` on line 1206 remain within the existing `legacyAccepted` allow-list.)

**Why in-scope repair is impossible:** the two repair paths — (P1) retarget `src/lib/stress/fixtures.ts` (T2B-assigned) or (P2) widen `legacyAccepted` in a test file not listed among the four T2A test surfaces in §4 — both exceed §4 T2A scope. §4 T2A tests are exhaustively: `_tests/counsel-voice-1.test.ts`, `_tests/grader-map-correction-7150b3.test.ts`, `_tests/grader-cal-1.test.ts` (all three s4→s5 literal), plus the new `_tests/band-realignment-t2a.test.ts`.

**Recommended micro-scope amendment (single-line §4 add):** add `src/lib/__tests__/cppaRiskFixturesOptionDrift.test.ts` to the T2A test-surface list with the widening described in ledger item 120. This is the minimal edit that preserves the guard's substantive protection (still catches values that are neither V2-current NOR V1-legacy), leaves `src/lib/stress/fixtures.ts` untouched for T2B where §4 assigns it, and lets the four §4 T2A tests (three version bumps + new t2a) plus the widened drift guard all pass green under a V2-only enum contract.

**Standing state:** item 113 remains DEPLOY-HELD; item 118 step (ii) remains HELD; items 114 + 115 remain HELD; item 116 sequencing intact. Zero code / prompt / rubric / grader / golden / registry / corpus / contract / fixture / sample edits this turn; zero edge-function deploys; zero migrations. See ledger item 120 for the full pasted failure classes and the CEO ruling log carry-forward for the s5 instrument commitment (deferred until T2A actually deploys).

---

## T2B-HELD-AWAITING-T2A (2026-07-26T05:31:00Z)

**Dispatch:** BAND-REALIGNMENT-T2B, team-reviewed five-lens.

**Dispatch GATE (verbatim):** "execute ONLY if the T2A ledger release (items 113/118-(ii) released) and T2A courier section exist; otherwise record HELD-awaiting-T2A and stop."

**Preflight result:** FAIL — item 113 still DEPLOY-HELD (unreleased), item 118 step (ii) still HELD (unreleased), T2A itself HELD before any file edit under its own GATE per ledger item 120. The `T2A-HELD` section above is a HELD marker, not the T2A-LANDED execution record the dispatch GATE requires.

**Ruling:** HELD-AWAITING-T2A. No file edits attempted on any of the ~15 §4 T2B surfaces (sampleFixtures + shapes, stress fixtures + generate-stress-fixtures, cppa-risk-contract-fixtures, CPPARiskRailEntries, refine/fieldEnums, generate-report-pdf audit, review-test-output heuristics, CPPAEvalHarness dropdowns, CPPAScopeChecker inputs, assertionTests/assertionRunner, option-drift test). No deploy attempted (T2B dispatch already prohibits deploy).

**Unblock condition:** T2A lands (items 113 and 118-(ii) both released via T2A execution turn). T2A landing is itself blocked pending controller/CEO ruling on the one-line §4 micro-scope amendment recommended in the T2A-HELD section above.

**Standing state carry-forward:** items 113, 118-(ii), 114, 115 all HELD; item 116 sequencing intact; campaign remains CEO-paused.
