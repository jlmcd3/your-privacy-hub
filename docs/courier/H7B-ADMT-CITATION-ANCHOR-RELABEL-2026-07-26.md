# H7B-ADMT-CITATION-ANCHOR-RELABEL — Courier

**Dispatch id:** H7B-ADMT-CITATION-ANCHOR-RELABEL-2026-07-26
**Controller tick:** 2026-07-26T01:17Z
**Deploy:** 2026-07-26T01:19:55Z (well before 02:15Z soft / 02:20Z hard cutoff)
**BUILD_STAMP:** `h7b-admt-citation-relabel@2026-07-26T01:20:00Z`
**Module version:** `h7b-admt-citation-relabel-2026-07-26`
**Scope:** `run-admt-checker` ONLY — new module `_h7b_citation_relabel.ts` wired AFTER H7 and BEFORE the LEAK-PREV-P1 emit gate.
**Discharges:** ledger item 95 queued H7b (wave-27 residual: blanket "11 CCR §§ 7200–7222" surviving in `citation` anchor fields).
**Authoritative context:** `docs/pipeline-state.md` items 91 + 95. Opening-paragraph work explicitly NOT in scope.

## Attribution recap

H7 (`h7-admt-blanket-range@2026-07-25T23:48:00Z`) walks prose only — `citation`, `citations`, `regulatory_citation`, `verbatim_quote`, etc. are in `ANCHOR_KEYS` and are intentionally never mutated. Result on wave-27 admt docs `523107f3-db9f-4885-a669-144b06bff0ed` and `233b0a2f-f924-4651-ab71-806dccbafe60`: `notice_gaps[i].citation` and `opt_out_gaps[i].citation` on `insufficient_basis` entries still read verbatim "11 CCR §§ 7200–7222" (en-dash). Fixtures pinned in tests are byte-identical to the values retrieved via SELECT-only read of `quality_run_documents` at 01:17Z.

## Corpus pin-test (BINDING, SELECT-only, 2026-07-26T01:17Z)

- `cppa_authorities` "11 CCR § 7220" (Pre-use Notice Requirements) — id `45ff3c31-2534-42eb-86db-b383103debf0`, status `current`.
- `cppa_authorities` "11 CCR § 7221" (Requests to Opt-Out of ADMT) — id `4db8ee47-658c-471f-b730-f3f87a861138`, status `current`.

Both rows exist and are approved. Subdivision-level texts remain UNAPPROVED corpus; H7b NEVER emits subdivision pinpoints. Fallback contract (had either row been absent): abort relabel for that subtree, no code change, report. Not exercised.

## Shipped

`supabase/functions/run-admt-checker/_h7b_citation_relabel.ts`

1. `isBlanketOnlyCitation(v)` — string-typed, trims, reuses H7's `BLANKET_RANGE_RE` (hyphen/en-dash/em-dash + spacing variants), rejects any string carrying a subdivision suffix.
2. `applyH7bAdmtCitationRelabel(report, buildStamp)` — walks ONLY `report.notice_gaps[].citation` and `report.opt_out_gaps[].citation`; blanket → section-level relabel (`§ 7220` / `§ 7221`); nothing else touched.
3. Idempotence via `_h7b_citation_relabel_ran = true` tag per entry (LEAK-PREV strip removes `_`-prefixed customer-surface keys downstream).
4. Fail-open at every helper and orchestrator; malformed reports return empty diag with `errors:0`.
5. Telemetry ONLY under `_meta.internal.admt_h7b` (`citation_relabeled_notice`, `citation_relabeled_optout`, `entries_scanned_notice`, `entries_scanned_optout`, `errors`, `version`, `stamp`, `build_stamp`).

## Wire

`supabase/functions/run-admt-checker/index.ts`

- Import added alongside H7.
- Runs AFTER `applyH7AdmtBlanketRange` (line 2536) and BEFORE the LEAK-PREV-P1 emit gate (line 2555).
- `BUILD_STAMP` bumped `h7-admt-blanket-range@2026-07-25T23:48:00Z` → `h7b-admt-citation-relabel@2026-07-26T01:20:00Z`.
- Boot log now emits `prior_stamps: { h7, w26, w25 }` unchanged.
- New event `h7b_admt_citation_relabel` logs stamp + diag counters on every run.

## Tests (pasted-green)

Runner: `deno test --no-check --allow-env --allow-net --allow-read` (module-graph typecheck is blocked by pre-existing TS errors NOT introduced by this turn — see runner note below).

**New suite — `_h7b_citation_relabel.test.ts`:**

```
running 10 tests from ./_h7b_citation_relabel.test.ts
H7B stamp is exported and stable ... ok (0ms)
isBlanketOnlyCitation matches blanket range only ... ok (1ms)
H7 (prose module) leaves blanket in `citation` anchor field UNCHANGED ... ok (1ms)
H7b relabels notice_gaps[].citation to '11 CCR § 7220' only when blanket ... ok (0ms)
H7b relabels opt_out_gaps[].citation to '11 CCR § 7221' — all five blanket entries ... ok (0ms)
H7b does NOT touch other buckets (access_gaps.citation preserved) ... ok (0ms)
H7b writes telemetry under _meta.internal.admt_h7b ... ok (0ms)
H7b is idempotent (second pass is a no-op) ... ok (0ms)
H7b + H7 composition — prose stays H7's domain, citations become H7b's ... ok (0ms)
H7b fail-open on malformed report (returns empty diag, no throw) ... ok (0ms)

ok | 10 passed | 0 failed (27ms)
```

**Neighboring admt suites — `_h7_admt_blanket_range.test.ts` + `_w25_admt_sanitizer_fix.test.ts` + `_w26_admt_citation_audit.test.ts` + `_w12_c1_leak_guard.test.ts`:**

```
ok | 49 passed | 0 failed (419ms)
```

**Runner note (non-blocking):** the shared `deno test` module-graph typecheck for `run-admt-checker` continues to trip on several pre-existing TS errors NOT introduced by this turn — TS2589 `verifyRegistryAgainstCorpus` (line 139), TS2304 `first` (lines 969/975/985), TS2783/TS2785 spread-order collisions on `stamp` at W24-H6 (line 2485) and `build_stamp` at H7 (line 2540). All inherited from items 82/86/91. Runtime is unaffected (Deno's own hint: "The program failed type-checking, but it still might work correctly."). Queued as trivial reorders in the next W24/H6/H7-scoped turn per scope-fence discipline — this dispatch prohibits touching those surfaces.

## Deploy guards (RE-CHECKED immediately pre-deploy, 2026-07-26T01:19:47Z)

- `quality_batch_runs` running/pending = **0**
- `quality_runs` running/pending = **0**
- `cppa_assessments` in-flight (report_data IS NULL, created_at > now() − 15 min) = **0**

Deployed 2026-07-26T01:19:55Z. Cutoff 02:20:00Z met with >60-minute margin.

## Five-lens review

- **Semantics / rubric:** section-level relabel matches verified corpus; subdivision citations never invented; H7 domain (prose) untouched.
- **Report flow / plain language:** customer-visible surface improves — no widened citation text, only anchor labels swapped from blanket to section-level pinpoint.
- **Deterministic-builder doctrine:** deterministic; idempotent; fail-open at every helper and orchestrator; no model prose.
- **Telemetry / observability:** `admt_h7b` counters under `_meta.internal`; boot `prior_stamps` echoes H7/W26/W25 unchanged; per-run event `h7b_admt_citation_relabel`.
- **Scope discipline:** no rubric/grader/golden/contract/fixture(instrument)/sample/registry/corpus writes; instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` FROZEN; no other edge functions; no other admt buckets; no admt/cyber/pricing/payment/design-token/customer-revision-path/signup changes.

## GATE

H7b must read clean on the following admt wave (`_meta.internal.admt_h7b` telemetry present; zero `notice_gaps[].citation === "11 CCR §§ 7200–7222"` and zero `opt_out_gaps[].citation === "11 CCR §§ 7200–7222"` across the wave) before the `citation_misapplied` class is called fixed.

## Sandbox flag (John)

Controller VM disk-full persists on fresh tick sessions. All backend access this turn via Lovable tools per Backend-access law: SELECT-only DB reads for corpus pin-test + fixture retrieval + deploy guards; edge-function code edits + deploy via Lovable `deploy_edge_functions`. Stamps never carried forward (`date -u` re-read at 01:17:04Z and 01:19:55Z bracketing the deploy). No rule deviations.
