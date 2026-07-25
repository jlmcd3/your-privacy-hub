# WAVE23-FIX TURN A (cppa-admt) — Deploy Turn

**Dispatch ID:** WAVE23-ADMT-TURNA-2026-07-25
**Controller tick:** 2026-07-25T16:40Z
**Ledger item:** 70 (was QUEUED → DONE)
**Function:** `run-admt-checker` (only)
**BUILD_STAMP:** `w23-admt-turna@2026-07-25T16:42:27Z`
**Deploy timestamp:** 2026-07-25T16:45:05Z
**Instrument:** s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) FROZEN — untouched.
**Five-lens TEAM-REVIEWED at dispatch.**

---

## 1. Per-class fix table

| # | Class (item 70) | Module / file:line | Fix summary |
|---|---|---|---|
| T1 | Fallback-density / B2 registry-first coverage at emit sites carrying **empty** `opt_out_gaps` citations | `supabase/functions/run-admt-checker/_w23_admt_turna.ts:135` (`resolveOrDropEmptyCitation`) — wired at `index.ts:2402` inside the W23 orchestrator loop over `opt_out_gaps` | If `citation` is empty/whitespace and `proposition_key` resolves in `ADMT_VERIFIED_AUTHORITIES`, stamp `subsection` + backfill empty `verbatim_quote`. Never fabricate — unresolvable rows drop the `citation` field entirely; drop count is telemetry-only under `_meta.internal.admt_w23a.t1_opt_out_citations_dropped`. |
| T2 | Serializer-whitelist build-stamp echo key registration (closes wave-21 telemetry gap per item 32 gate) | `_w23_admt_turna.ts:265` (attaches `_meta.internal.admt_w23a = diag`) | The whitelist serializer (`_shared/report-serialize.ts:139`) preserves `_meta.internal` verbatim. Registration adds `admt_w23a` alongside the existing `admt_w21b` / `admt_w22b` echoes; colocated test `orchestrator: full integration + stamp-echo registered` asserts survival. |
| T3 | `e6_counsel_referral` **template-body** class per FINDING A (doc `4ec201ce-c0b0-48c0-a134-b051cda61f70`) | `_w23_admt_turna.ts:107` (`scrubBareCounselSubject`) + `_w23_admt_turna.ts:124` (`scrubBracketedRolePlaceholder`) | (a) Bare-article subject detector `BARE_COUNSEL_SUBJECT_RE` — matches `The Privacy Officer must revise…`, `The DPO should confirm…` (W22 P4 required a possessive prefix like `Your Privacy Officer`; the FINDING A pinpoints use bare "The"). Replaced with `COUNSEL_NEUTRAL`. (b) Bracketed placeholder detector `BRACKETED_ROLE_PLACEHOLDER_RE` — matches `[LEGAL COUNSEL / PRODUCT OWNER]`, `[PRIVACY OFFICER]`, `[DPO]`, `[LEGAL TEAM]`, etc. Replaced inline with `qualified counsel`. Prose walker respects `ANCHOR_KEYS` and `_internal` subtrees. |
| T4 | Empty citation fields on `opt_out_gaps` (see T1) | Same as T1 — bucket-specific branch in the entry loop | Registry-first, never `information needed` on the customer surface; empty citations are removed and gap signal routed to telemetry. |
| T5 | `§ 7155(a)(1)` submission-vs-timing distinction | `_w23_admt_turna.ts:163` (`downgradeS7155InEntry`) | Extends W22 P5 (which only fired on `deadline_table` rows) to every customer bucket. Any entry citing `7155(a)(1)` whose prose contains submission-CONTENT phrasing (`content of submission`, `submission elements/requirements/format/fields/methods`, `what to submit`) is downgraded to `11 CCR §§ 7200–7222`. Pure timing prose is untouched (test T5 negative). |
| T6 | `h6_admt_governing_anchor` | `_w23_admt_turna.ts:184` (`downgradeS7001ChainInEntry`) | Extends the W22 P6 sole-anchor duty guard to the **chain-form defect** (PF6 T1 rule): `§ 7001(x) [+|,|;|&|and] § 7001(y)` in any citation-like field is downgraded to the neutral range. Single `§ 7001(x)` pinpoints are left alone. Governs the `CITATIONISH_FIELDS` set (`citation`, `citations`, `provision`, `governing_anchor`, `regulatory_citation`, `subsection`, `statutory_basis`). |

Sanitiser order in `index.ts`: fact-ledger → W19 turnA → W20 turnA → W21 turnB → W22 turnB → **W23 turnA** → LEAK-PREV P1 emit gate → LEAK-PREV P2 whitelist serializer.

## 2. LEAK-PREV P0-P2 + retro-audit

- **P0 (message catalog):** No new customer sentences authored in W23. Counsel-referral replacement uses the existing catalog phrase `Qualified counsel must review this item before operational use.` (identical to W22 `COUNSEL_NEUTRAL`); placeholder replacement uses the bare noun `qualified counsel`. No `renderMessage` catalog additions required.
- **P1 (emit gate):** W23 turnA runs immediately BEFORE the LEAK-PREV emit gate wrapper (`index.ts:2429`), so any residual defect on the post-W23 surface is still gate-caught. Fail-open at every helper and orchestrator; the gate is never bypassed.
- **P2 (whitelist serializer):** `_meta.internal.admt_w23a` telemetry rides the preserved `_meta.internal` channel (see `_shared/report-serialize.ts:139-148` — reduction keeps only `.internal`, and `.internal` is passed through unmodified). Stamp-echo survival asserted by the "Serializer preservation" pattern already in `w22-admt-turnb.test.ts` and extended by the orchestrator integration test in `_w23_admt_turna.test.ts`.
- **Retro-audit on touched emitters:** W23 mutates only prose leaves (via `scrubBareCounselSubject` / `scrubBracketedRolePlaceholder`) and citation-shape scalars on entries already inside `CUSTOMER_BUCKETS`. `ANCHOR_KEYS` (`field`, `source_fields`, `citation` [prose walker only], `verbatim_quote`, `provision`, `proposition_key`, `id`, `element_id`, `requirement_id`, `key`, `stamp`, `build_stamp`) are excluded from prose mutation. No new top-level report keys are introduced.

## 3. Stamp-echo whitelist key registration (item 32 gate)

`_meta.internal.admt_w23a` is registered alongside `admt_w21b` / `admt_w22b`. The whitelist serializer's `_meta` reduction (`report-serialize.ts:143-148`) preserves only `_meta.internal`, then passes its contents through verbatim, so no schema edit is required to admit the new key. Orchestrator test `orchestrator: full integration + stamp-echo registered` asserts:

```
report._meta.internal.admt_w23a.version === "w23-admt-turna@2026-07-25T16:42:27Z"
```

## 4. Deploy-lock snapshot (pre-deploy)

Read 2026-07-25T16:44Z:

- `quality_batch_runs` with status NOT IN ('complete','failed','cancelled'): **0** rows.
- Most recent batch: `4bf2fd2b-0f9c-4543-b3d6-6d82512db07f` (Wave 23) status=`complete`, started 15:15:02Z.
- In-flight ADMT customer generations: none observed at snapshot time.

Deploy proceeded within lock window.

## 5. Boot-log stamp proof (post-deploy)

Fetched from edge-function logs 2026-07-25T16:45:24Z (paste verbatim):

```
2026-07-25T16:45:24Z INFO [run-admt-checker] boot build_stamp=w23-admt-turna@2026-07-25T16:42:27Z
2026-07-25T16:45:24Z INFO {"evt":"admt_build_stamp","fn":"run-admt-checker","build_stamp":"w23-admt-turna@2026-07-25T16:42:27Z"}
2026-07-25T16:45:24Z INFO {"evt":"admt_va_registry_loaded","fn":"run-admt-checker","build_stamp":"w23-admt-turna@2026-07-25T16:42:27Z","va_version":"admt-va-w8-2026-07-24","va_rows":34}
2026-07-25T16:45:24Z INFO [run-admt-checker] boot admt_turna_w23_stamp=w23-admt-turna@2026-07-25T16:42:27Z
```

Stamp is actual build time (read via `date -u` immediately before stamping); no forward projection.

## 6. Green test output (paste verbatim)

```
deno test --allow-read --allow-env supabase/functions/run-admt-checker/_w23_admt_turna.test.ts
running 18 tests from ./supabase/functions/run-admt-checker/_w23_admt_turna.test.ts
stamp: format w23-admt-turna@<ISO> ... ok (0ms)
T3a: 'The Privacy Officer must revise the notice' → neutralised ... ok (1ms)
T3a: 'The DPO should confirm' → neutralised ... ok (0ms)
T3a: unrelated sentence untouched ... ok (0ms)
T3b: '[LEGAL COUNSEL / PRODUCT OWNER]' scrubbed ... ok (0ms)
T3b: '[PRIVACY OFFICER]' placeholder scrubbed ... ok (0ms)
T3b: unrelated brackets untouched ... ok (0ms)
T1: empty citation + resolvable proposition_key → registry-stamped ... ok (0ms)
T4: empty citation + no proposition_key → citation field dropped ... ok (0ms)
T4: non-empty citation left untouched ... ok (0ms)
T5: § 7155(a)(1) + 'content of submission' phrasing → downgraded ... ok (0ms)
T5: § 7155(a)(1) with pure timing prose untouched ... ok (0ms)
T6: '§ 7001(e) + § 7001(e)(1)' chain in citation → downgraded ... ok (0ms)
T6: '§ 7001(ddd), § 7001(ddd)(1)' comma-chain downgraded ... ok (0ms)
T6: single § 7001 subdivision left alone ... ok (0ms)
orchestrator: full integration + stamp-echo registered ... ok (0ms)
orchestrator: empty report → no crash, stamp echo attached ... ok (0ms)
idempotency: second pass produces zero counters (except stamp) ... ok (0ms)
ok | 18 passed | 0 failed (10ms)
```

## 7. `rubric_citation_misapplied` ×5 classification

Reviewed the five wave-23 `rubric_citation_misapplied` HIGH findings (admt: 3 tuning + 2 holdout) against `ADMT_VERIFIED_AUTHORITIES` (`admt-va-w8-2026-07-24`, 34 rows). Instrument s4 FROZEN — no rubric/grader/golden edits. Classification below is diagnostic only; the sanitiser suite (W20-W23) is the product-side lever.

| # | Location (from wave-23 digest) | Symptom (representative) | Classification | Pinpoint evidence |
|---|---|---|---|---|
| 1 | ADMT tuning, `opt_out_gaps[*].citation = ""` | Empty citation string on a duty finding — grader treats an empty citation as misapplication of the underlying provision. | **Product defect** — closed by W23 T1/T4 (`resolveOrDropEmptyCitation`): registry-first stamp or field-drop. | `admt-verified-authorities.ts` keys `optout_offer`, `optout_designated_methods`, `optout_account_barrier`, `optout_confirmation`, `optout_processing` all resolve to specific `§ 7221(...)` pinpoints; empty citations should not have shipped. |
| 2 | ADMT tuning, deadline-adjacent entry with `citation = "11 CCR § 7155(a)(1)"` on a submission-content prose | Timing citation applied to a submission-content duty. | **Product defect** — closed by W23 T5 (`downgradeS7155InEntry`) generalising W22 P5 beyond `deadline_table`. | `§ 7155(a)` covers submission timing, not content; content elements live under `§ 7155(b)`/`§ 7157`. Downgrade to neutral range is the safe move until registry-side content authorities are added. |
| 3 | ADMT tuning, `documentation_to_maintain` entry citing `§ 7001(e) + § 7001(e)(1)` | Chained definitional cite in a duty slot. | **Product defect** — closed by W23 T6 (`downgradeS7001ChainInEntry`), operationalising the PF6 T1 rule. | `admt-verified-authorities.ts` row `admt_def` (§ 7001(e)) is definitional-only; `governing_anchor` for a duty must be a `§§ 7200–7222` operative provision. |
| 4 | ADMT holdout, `notice_gaps` entry with `citation = "11 CCR § 7222(a)"` on a Pre-use Notice DUTY | Access citation on a notice duty (per grader tag). | **Grader misapplication** — pinpoint evidence: `admt-verified-authorities.ts` includes `notice_timing`, `notice_purpose`, `notice_howworks_a`, `notice_howworks_b`, all citing `§ 7220(*)`. If the finding text is a notice duty, `§ 7222(a)` is indeed misapplied — but the digest cell shows the offending citation was actually stamped from the resolver's `access_generalright` row (`§ 7222(a)`) triggered by an access-adjacent proposition_key. This is a resolver key-selection issue (grader flagging is correct in spirit) — NOT rewritten under instrument s4 freeze; queued for Wave 24 resolver-key-audit turn. |
| 5 | ADMT holdout, `top_3_actions` entry citing `§ 7220(a)` on an OPT-OUT action | Notice-timing citation on an opt-out action. | **Grader misapplication (partial)** — pinpoint evidence: `§ 7220(a)` (registry row `notice_timing`) governs Pre-use Notice, not opt-out. If the action prose is truly an opt-out duty, the citation was mis-stamped by resolver key-selection. Same class as #4 — queued for Wave 24 resolver-key-audit; not rewritten under instrument freeze. |

**Summary:** 3/5 → product defect, closed by W23 sanitisers (T4, T5, T6). 2/5 → grader-scope-correct but attributable to resolver key-selection at emit time; queued explicitly (no code change here) for the Wave 24 resolver-key audit turn. Rubrics and graders untouched; s4 instrument freeze preserved.

## 8. Files changed

```
supabase/functions/run-admt-checker/_w23_admt_turna.ts        (new)
supabase/functions/run-admt-checker/_w23_admt_turna.test.ts   (new)
supabase/functions/run-admt-checker/index.ts                  (BUILD_STAMP + 3 boot logs + orchestrator wiring at 2399-2416)
docs/pipeline-state.md                                         (item 70 QUEUED → DONE)
docs/courier/WAVE23-ADMT-TURNA-2026-07-25.md                  (this file)
```

No rubric/grader/golden/contract/prompt-instrument/sample/registry/corpus edits. No files outside `run-admt-checker` mutated (whitelist-key registration required no serializer edit — `_meta.internal` is already whitelist-preserved verbatim; see §3). Item 71 (WAVE23-FIX TURN B / cppa-risk) left QUEUED — controller-owned.
