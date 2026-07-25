# WAVE21-FIX TURN C (cppa-cyber) — Courier Report

**Dispatch:** WAVE21-FIX TURN C (cppa-cyber) — deploy turn on `run-cppa-cybersecurity`, closing the five wave-21 cyber HIGH findings.
**Team review:** Five-lens (customer / legal / measurement / ops / regression) per dispatch.
**CEO frame:** CPPA priority per standing order.
**Delivered:** 2026-07-25T12:55:49Z (sandbox clock, fresh-read).
**Ledger entry:** `docs/pipeline-state.md` §2 item 54.

---

## 1. Source Findings (from `docs/courier/WAVE21-DIGEST-2026-07-25.md` §5 + digest ledger item 47/49/50)

| Doc         | Class                                    | Wave-21 evidence                                                    |
|-------------|------------------------------------------|---------------------------------------------------------------------|
| `2355ea77`  | § 7123(c)(N) subsection-map misapplied   | `(c)(N)` pinpoints attached to non-matching component objects       |
| `2355ea77`  | Unsupported data-category ("patient health information") | Category asserted with no intake support                            |
| `85478f8e`  | Derived-arithmetic from intake           | Number computed from intake presented as intake-stated fact         |
| `85478f8e`  | § 7122(g) retention-nuance misapplied    | § 7122(g) cited outside a retention-context sentence                |
| `49353ce0`  | Splice / garble ("SailPoint provides comparative guidance") | Vendor proper-noun spliced into "provides comparative guidance"     |

Baseline (frozen): `cyber-cppa-hf6@2026-07-20` prompt · s4 instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` · `cyber-va-w1-2026-07-24` registry (44 rows).

## 2. Deploy Locks — Pasted Tape

`supabase--read_query` immediately pre-deploy (12:55:15Z db_now):

```
qb_running_pending | null_cyber_recent | db_utc
                 0 |                 0 | 2026-07-25 12:55:15.492342
```

GREEN. HARD CUTOFF was 13:10Z; deployed well within window.

## 3. Stamp Tape (item-52 stamp-doctrine observed)

Fresh `date -u` re-read IMMEDIATELY BEFORE stamping:

```
$ date -u +%Y-%m-%dT%H:%M:%SZ
2026-07-25T12:53:27Z
```

Baked into both `BUILD_STAMP` (`run-cppa-cybersecurity/index.ts:15`) and `W21_CYBER_TURNC_STAMP` (`run-cppa-cybersecurity/_w21_cyber_turnc.ts:50`) via `sed -i` in one shot — no forward-projection.

Boot-log lines (`index.ts:16` and `:1918`):
```
[run-cppa-cybersecurity] boot build_stamp=w21-cyber-turnc@2026-07-25T12:53:27Z
{"evt":"cyber_build_stamp","build_stamp":"w21-cyber-turnc@2026-07-25T12:53:27Z"}
```

Header restamp (`docs/pipeline-state.md:11`): `Last updated: 2026-07-25T12:55:49Z` (fresh-read at write-time).

## 4. Guards C1-C6 — Implementation Summary

- **C1 (§ 7123(c)(N) subsection-map)** — three-route resolution: (a) parent `proposition_key` → registry N; (b) parent object's `control`/`component`/`label`/`name` → `CONTROL_NAME_TO_N`; (c) keyless prose names a canonical control. Mismatch → strip `(c)(N)` token, preserve composite `§ 7123`.
- **C2 (unsupported data-category)** — bounded rule set (PHI / biometric / children's data), each paired with an intake-cue regex. No cue in intake JSON haystack → rewrite to "the data categories reported in the intake". Never emits raw field IDs, never `information_needed` for citation-resolution gaps.
- **C3 (derived-arithmetic)** — one regex over "the intake records/states/… N <headcount-noun>"; if N is not a verbatim intake-JSON substring (comma OR plain-digit form), reframe to "based on the figures provided, approximately N <noun>".
- **C4 (§ 7122(g) retention-nuance)** — sentence-split walk keeps § 7122(g) only in retention context (retain/retention/five/5-year/audit-record/audit-support/records supporting/record-keeping); elsewhere downgrade to `11 CCR §§ 7120–7124`. Mirrors B5/B6 conservative pattern.
- **C5 (vendor splice)** — sentence-drop of `<VENDOR> provides comparative guidance` for a 20-vendor bounded token list; deterministic, terminal; ports admt/risk variant-splice scrub.
- **C6 (telemetry)** — `report._meta.internal.cyber_w21c = { stamp, cyber_va_version, strings_scanned, c1_c_n_stripped, c1_c_n_kept_registry, c1_c_n_kept_component, c2_unsupported_category_scrubbed, c3_derived_arith_reframed, c4_retention_downgraded, c5_splice_sentences_dropped }`. LEAK-PREV-P2 serializer (`rs-w1-2026-07-25`) preserves `_meta.internal` verbatim — no whitelist edit.

Anchor keys (`citation`, `regulatory_basis`, `fsor_citation`, `verbatim_quote`, `subsection`, `governing_anchor`, `proposition_key`, `primary_source_url`, `source_fields`, `id`, `key`, `stamp`, `build_stamp`, `url`, `deadline`, `deadline_basis`, `provision`) are never mutated by the walker. Reserved subtrees (`_meta`, `_staging`, `_drafting_record`, `_normalized_intake`, `deterministic_checks`, `annotations`, `lint_warnings`, `engagement_map`, `enforcement_meta`, `enforcement_precedents`, `enforcement_context`, `citation_ledger`, `crosswalk_matrix`) and any key starting with `_` pass through unchanged.

## 5. Wire Site

`run-cppa-cybersecurity/index.ts:1832-1852` — inserted between the W17 `applyCyberBoilerplateGuard` block and the terminal `_meta` reassignment, so LEAK-PREV P1 (`runEmitGate`, ~line 1866 post-insert) sees the fully-scrubbed customer surface. The `_meta` reassignment uses `{ ...((report as any)._meta ?? {}), prompt_version, build_stamp }` which preserves `_meta.internal.cyber_w21c` telemetry.

## 6. Ledger-side fold (item 31 per-tool deploy plan)

- `_w15_cyber_fl.test.ts:16-20` — BUILD_STAMP regex extended: `/^(w15-cyber-factledger|w16-cyber-flfix|w17-cyber-boiler|w21-cyber-turnc)@\d{4}-\d{2}-\d{2}T/`.
- `_w15_cyber_fl.test.ts:23-34` — new pin assertions: `src.includes("S-B INTAKE-FACT-LEDGER (sb-fl-w4-2026-07-25)")` + `assertEquals(FACT_LEDGER_VERSION, "sb-fl-w4-2026-07-25")`. Ordering assertion updated to search on the new anchor string.
- `index.ts:1656` — anchor comment updated in lock-step: `S-B INTAKE-FACT-LEDGER (sb-fl-w4-2026-07-25) wiring — pre-VA-stamp`.

## 7. Test Tape (pasted-green Deno output)

Command (colocated test file plus fact-ledger stamp-pin regression):

```
cd supabase/functions && deno test --no-check --allow-all \
    _tests/w21-cyber-turnc.test.ts \
    run-cppa-cybersecurity/_w15_cyber_fl.test.ts
```

Output (verbatim):

```
------- pre-test output -------
[build-marker] run-cppa-cybersecurity qi3-observations-not-directives-2026-07-03
[run-cppa-cybersecurity] boot build_stamp=w21-cyber-turnc@2026-07-25T12:53:27Z
{"evt":"fact_ledger_loaded","fn":"run-cppa-cybersecurity","version":"sb-fl-w4-2026-07-25"}
{"evt":"cyber_va_registry_loaded","fn":"run-cppa-cybersecurity","build_stamp":"w21-cyber-turnc@2026-07-25T12:53:27Z","va_version":"cyber-va-w1-2026-07-24","va_rows":44}
Listening on http://0.0.0.0:8000/ (http://localhost:8000/)
----- pre-test output end -----
running 8 tests from ./run-cppa-cybersecurity/_w15_cyber_fl.test.ts
W15-CYBER-FL: BUILD_STAMP restamped (accepts w15/w16-hotfix/w17-boiler/w21-turnc variants) ... ok (1ms)
W15-CYBER-FL: index.ts imports fact-ledger and inserts pre-cyber-VA pass ... ok (3ms)
W15-CYBER-FL: silence never supports a negative assertion (field in ledger as silent) ... ok (20ms)
W15-CYBER-FL: unsupported-positive with UNRESOLVABLE field is SKIPPED (wave-16 guard) ... ok (0ms)
W15-CYBER-FL: contradiction of denied fact is blocked with reconciliation rewrite ... ok (0ms)
W15-CYBER-FL: cross-attribution is blocked with reconciliation rewrite ... ok (1ms)
W15-CYBER-FL: fail-open on null intake/report/claims ... ok (0ms)
W15-CYBER-FL: counters land only under _meta.internal.fact_ledger; no _w* leak ... ok (0ms)
running 16 tests from ./_tests/w21-cyber-turnc.test.ts
W21-CYBER-TURNC — stamp is a well-formed build stamp ... ok (0ms)
W21-C1 — mismatched § 7123(c)(N) in keyless prose is stripped, § 7123 preserved ... ok (4ms)
W21-C1 — matching component-name keeps § 7123(c)(N) ... ok (0ms)
W21-C1 — anchor keys (citation/regulatory_basis) never touched ... ok (0ms)
W21-C2 — unsupported 'patient health information' rewritten (no intake cue) ... ok (0ms)
W21-C2 — supported PHI passes through when intake cues health ... ok (0ms)
W21-C3 — derived arithmetic reframed when number is not in intake verbatim ... ok (0ms)
W21-C3 — intake-verbatim number passes through ... ok (0ms)
W21-C4 — § 7122(g) downgraded outside retention context ... ok (0ms)
W21-C4 — § 7122(g) preserved when retention context is present ... ok (0ms)
W21-C5 — vendor 'provides comparative guidance' splice sentence dropped ... ok (0ms)
W21 — telemetry attaches at _meta.internal.cyber_w21c only (no top-level leak) ... ok (0ms)
W21 — pass-through: clean report untouched (idempotence) ... ok (0ms)
W21 — reserved subtrees (_meta, annotations, deterministic_checks) not walked-into for scrub ... ok (0ms)
W21 — fail-open on null / non-object report ... ok (0ms)
W21 — ledger-only path (no intake) still scrubs splice & retention ... ok (0ms)

ok | 24 passed | 0 failed (206ms)
```

Note on `--no-check`: two pre-existing type-check errors (unrelated to this dispatch) exist in the repo — a duplicate-key literal in `_shared/customer-messages.ts` and a `rank: null` field-widening issue in `run-cppa-cybersecurity/qbp25-cyber-schema.test.ts`. Neither is introduced or touched by this turn; both predate wave-21 by multiple commits. Running under `--no-check` per Deno's official hint is the correct posture for behavioral verification. The two type errors are noted here for a future TS-only maintenance turn; they do not gate deploy since Deno explicitly says "the program failed type-checking, but it still might work correctly" and runtime behavior is what wave-22 measures.

## 8. Deploy Tape

```
supabase--deploy_edge_functions(function_names=["run-cppa-cybersecurity"])
→ "Successfully deployed edge functions: run-cppa-cybersecurity"
```

Post-deploy `edge_function_logs` poll returned no rows — expected for a warm-cache function with no invocations post-deploy; the boot echo (`build_stamp=w21-cyber-turnc@2026-07-25T12:53:27Z` + `evt=cyber_build_stamp`) will materialize on the first cold-start invocation.

## 9. Guardrails Observed

No edits to rubrics, graders, instrument (s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` stays frozen), goldens, contracts, verified-authority registries, corpus tables, sample fixtures. No sample-report regeneration. No Fable-5 in prompts / generators. Edits confined to `run-cppa-cybersecurity/` + `_tests/` + `docs/`.

## 10. Files Touched (this turn ONLY)

- `supabase/functions/run-cppa-cybersecurity/_w21_cyber_turnc.ts` — **new** (340 lines).
- `supabase/functions/run-cppa-cybersecurity/index.ts` — BUILD_STAMP restamp (line 15) + import (line 35) + 20-line wire block (lines 1832-1852) + fact-ledger anchor comment (line 1656).
- `supabase/functions/run-cppa-cybersecurity/_w15_cyber_fl.test.ts` — BUILD_STAMP regex extended (line 18) + fact-ledger version pin assertions added (lines 28-33).
- `supabase/functions/_tests/w21-cyber-turnc.test.ts` — **new** (16/16 green).
- `docs/pipeline-state.md` — this ledger's Item 54 + header restamp.
- `docs/courier/WAVE21-FIX-TURNC-CYBER-2026-07-25.md` — this file.

Nothing else.

## 11. Next per T2

Wave-22 will measure C1-C5 efficacy under s4. Because no rubric change was made, trajectory comparison is valid from the wave-21 baseline (cyber 87.15). If C2 or C3 counters fire zero across a full run, the guard is INSUFFICIENT and warrants tightening in a subsequent fix turn; if C1 or C4 misfire on legitimate anchors we will see it in the survivor list and can adjust the parent-context matcher.
