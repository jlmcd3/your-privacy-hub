# WAVE21-FIX TURN B (cppa-admt) — Courier Report

**Turn:** WAVE21-FIX TURN B (cppa-admt) — deploy turn on `run-admt-checker`.
**Dispatched:** 2026-07-25 (post item 49 sequencing).
**Ledger:** `docs/pipeline-state.md` item 50.
**BUILD_STAMP:** `w21-admt-turnb@2026-07-25T12:20:33Z` (fresh sandbox clock read immediately before stamping).
**Source findings:** `docs/courier/WAVE21-DIGEST-2026-07-25.md` §5; quality_run `991b2fda`, run 110, ours 84.05 on instrument s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`); batch `12640b0f`, campaign `fd1be147`.

---

## 1. Scope Delivered (B1-B8)

- **B1 — REGISTRY-FIRST RESOLUTION AT KEYLESS CALL SITES.** Extends the w19 A1 registry consult to entries with no `proposition_key`. When the entry carries the neutral fallback phrase (or an empty citation) AND its own prose fields carry a `11 CCR § NNNN(...)` token that matches a registry `subsection` exactly, the citation is promoted from that anchor and `proposition_key` is back-filled. Never invents — registry rows only.
- **B2 — NO EMPTY CITATIONS ON `*_gaps`.** Keyed entries with empty citation resolve from `proposition_key`. Keyless entries with no in-prose registry anchor take the neutral catalog phrase `11 CCR §§ 7200–7222`. Applies to `notice_gaps`, `opt_out_gaps`, `access_gaps` (and touches all customer buckets for keyed empties).
- **B3 — BODY-TEXT COUNSEL-REFERRAL SCRUB.** Sentence-level pass across every non-citation customer-facing prose field. Detects "your Privacy Officer should…", "consult outside counsel", "engage the legal team", etc. and rewrites to a single neutral sentence. Ownership-disclaimer carve-out (`must review, complete, and own`) preserved. Defence in depth over the w9 G2 pre-emit gate — this catches strings that reappear post-G2 via later shaping.
- **B4 — § 7001 SOLE-ANCHOR DUTY GUARD.** Entries whose `citation` consists solely of § 7001 subsection(s) but whose prose carries an action-duty verb (`must disclose|provide|notify|respond|confirm|deliver|honor|honour|allow|permit|conduct|document|submit`, `the business must`, `response must`, `access response`, `pre-use notice`, `access request`) are either promoted to an in-prose subchapter anchor (when the registry has it) or downgraded to `11 CCR §§ 7200–7222`. § 7001 stands alone only for definitional propositions.
- **B5 — § 7155(a)(1) SUBMISSION-VS-TIMING GUARD in `deadline_table`.** Rows citing `§ 7155(a)(1)` that are labelled as content-of-submission (`field`/`topic`/`label`/`row_type`/`type` matches `/submission[-\s]?content|content\s+of\s+submission|what\s+to\s+submit/i`) are downgraded to the neutral phrase. Timing rows keep the citation. Verbatim quote for § 7155(a)(1) in the registry ("conduct and document a risk assessment … before initiating any processing activity …") is a timing anchor for RA conduct, not submission content.
- **B6 — § 7150(b)(3) PROPOSITION GUARD.** Preserved only when `proposition_key === "ra_trigger_admt"` OR the entry is keyless AND its prose co-mentions "ADMT" and "risk assessment". Elsewhere the `(b)(3)` token is stripped from the citation; the rest of any composite anchor is preserved; if that was the only anchor, the neutral phrase is substituted. Aligns with the ruling that § 7150(b)(3) is the ADMT threshold trigger for risk assessments only.
- **B7 — INTAKE-SUPPORTED TIMELINE RESTORATION.** When intake carries a concrete access/response/opt-out timeline (`access_response_timeline` / `response_timeline` / `opt_out_timeline` — regex-extracted `within N (business|calendar) days`), the w19 A4 stub "on a timeline that requires confirmation" is rewritten back to the intake-supplied phrasing. `information_needed` is cleared only when no A4 stubs remain on the entry (partial restoration is preserved conservatively).
- **B8 — TELEMETRY.** `applyW21AdmtTurnB` writes directly to `report._meta.internal.admt_w21b = { version, b1_keyless_resolved, b2_empty_citations_filled, b3_counsel_scrubs, b4_definitional_only_downgrades, b5_7155_content_row_downgrades, b6_7150b3_misapplication_downgrades, b7_timelines_restored, strings_scanned, entries_scanned }`. Because the P2 serializer preserves `_meta.internal` verbatim, no whitelist edit is required. The pass also mirrors any existing top-level `_w19_admt_turna` / `_w20_admt_turna` diag onto `_meta.internal.admt_w19a` / `_meta.internal.admt_w20a` — closing the item-47 monitoring flag for admt so wave-going-forward pass telemetry survives P2 whitelist serialization.

## 2. Files Touched (scope-clean)

- `supabase/functions/run-admt-checker/_w21_admt_turnb.ts` (new; 306 lines).
- `supabase/functions/run-admt-checker/index.ts` (import + call block wired AFTER `applyW20AdmtTurnA` and BEFORE `runEmitGate`; `BUILD_STAMP` bumped; new boot-log line for w21).
- `supabase/functions/_tests/w21-admt-turnb.test.ts` (new; 18 tests).
- `docs/pipeline-state.md` (item 50 + `Last updated` header).
- `docs/courier/WAVE21-FIX-TURNB-ADMT-2026-07-25.md` (this file).

**Guardrails observed:** no rubric/grader/instrument/golden/contract/registry/corpus/fixture edits; no sample-report regeneration; no intake-contract changes; no Fable-5 anywhere in prompts/generators; edits confined to `run-admt-checker/` + `_tests/` + `docs/`. Telemetry only under `_meta.internal` / `_w<digits>_*`.

## 3. Lock-Check Evidence (immediately pre-deploy)

```
db_now                : 2026-07-25 12:20:29.629774 UTC
quality_batch_runs    : running+pending = 0
cppa_assessments      : module='cppa-admt' AND report_data IS NULL AND created_at > now()-15min = 0
wave-22 batch in flight: none
```

Result: locks GREEN → proceed to deploy.

## 4. Stamp & Boot-Log Proof

```
$ date -u +%Y-%m-%dT%H:%M:%SZ   # re-read immediately before stamping
2026-07-25T12:20:33Z

$ grep "W21_ADMT_TURNB_STAMP =" supabase/functions/run-admt-checker/_w21_admt_turnb.ts
export const W21_ADMT_TURNB_STAMP = "w21-admt-turnb@2026-07-25T12:20:33Z";

$ grep BUILD_STAMP supabase/functions/run-admt-checker/index.ts | head -1
export const BUILD_STAMP = "w21-admt-turnb@2026-07-25T12:20:33Z";
```

Boot-log lines authored (fires on first cold-start invocation):

```
console.log(`[run-admt-checker] boot build_stamp=${BUILD_STAMP}`);
...
console.log(`[run-admt-checker] boot admt_turna_w20_stamp=${W20_ADMT_TURNA_STAMP}`);
console.log(`[run-admt-checker] boot admt_turnb_w21_stamp=${W21_ADMT_TURNB_STAMP}`);
```

Platform `edge_function_logs` returned no rows in the immediate post-deploy poll (normal for a warm-cache function with no incoming traffic in the poll window); boot line will surface on the next cold-start invocation. Deploy call returned `Successfully deployed edge functions: run-admt-checker` at 2026-07-25T12:21Z sandbox clock (post fresh lock-check).

## 5. Green Tests (pasted)

```
$ deno test --no-check --allow-net --allow-env --allow-read \
    supabase/functions/_tests/w21-admt-turnb.test.ts

Check supabase/functions/_tests/w21-admt-turnb.test.ts
running 18 tests from ./supabase/functions/_tests/w21-admt-turnb.test.ts
stamp has w21-admt-turnb prefix ... ok
B1: keyless entry with in-prose registry anchor gets citation promoted ... ok
B1: keyless entry with no in-prose anchor leaves fallback for w20 to handle ... ok
B2: opt_out_gaps entry with empty citation and no anchor gets neutral catalog phrase ... ok
B2: keyed entry with empty citation resolves from proposition_key ... ok
B3: 'your Privacy Officer should review' sentence is rewritten to neutral ... ok
B3: ownership disclaimer sentence is preserved ... ok
B4: entry with duty verb and § 7001-only citation gets downgraded to neutral ... ok
B4: § 7001-only citation with no duty verb is left alone ... ok
B4: entry promotes to in-prose subchapter anchor when available ... ok
B5: § 7155(a)(1) on content-of-submission row is downgraded ... ok
B6: § 7150(b)(3) with non-ra_trigger_admt proposition is downgraded ... ok
B6: § 7150(b)(3) with ra_trigger_admt is preserved ... ok
B7: entry with A4 stub restores intake 'Within 45 calendar days' ... ok
B7: no restoration when intake has no timeline ... ok
B8: applyW21AdmtTurnB attaches _meta.internal.admt_w21b and mirrors w19/w20 diag ... ok
orchestrator: end-to-end on a shaped report is idempotent ... ok
extractIntakeTimeline pulls timeline from access_response_timeline ... ok

ok | 18 passed | 0 failed (18ms)
```

Full admt suite (per turn contract):

```
$ deno test --no-check --allow-net --allow-env --allow-read \
    supabase/functions/run-admt-checker/ \
    supabase/functions/_tests/w21-admt-turnb.test.ts

FAILED | 137 passed | 1 failed  (1s)

Only failure (declared out-of-scope by dispatch):
  deadline_table sources from registry (>=3 rows, each stamped)
  => _w9_admt_slots.test.ts:41:6  (pre-existing; access_timeline empty subsection)
```

## 6. Regression Safety

- Each B-item is a deterministic post-pass with dedicated unit tests.
- Existing W19/W20 admt passes run BEFORE this pass in unchanged order; only their output surfaces are inspected.
- Fail-open on every try-block; any throw returns the input unchanged.
- No mutation of `_meta.internal` other than the additive telemetry writes (`admt_w21b`, `admt_w19a`, `admt_w20a`).
- Idempotence verified: second invocation on an already-scrubbed report reports 0 counters (test: `orchestrator: end-to-end on a shaped report is idempotent`).

## 7. Measurement Expectation

Wave-22 (next scheduled batch on `gc-2026-07-25-s4-eu-uk-ca-au-sg`) should show:
- `rubric_invented_admt_section` CRITICAL (fallback-density) — down (B1 keyless coverage).
- `rubric_citation_misapplied` empty-citation cases on `opt_out_gaps` — eliminated (B2).
- `e6_counsel_referral` body-text hits — down (B3).
- `h6_admt_governing_anchor` § 7001-only cases — down (B4).
- No new `deadline_table` § 7155(a)(1) submission-row misapplications (B5).
- No new `§ 7150(b)(3)` off-topic citations (B6).
- Intake-supported timelines rendered rather than stubbed (B7).
- `_meta.internal.admt_w21b` (+ mirrored `admt_w19a`/`admt_w20a`) present in customer report payloads for wave-monitoring visibility (B8; item 47 monitoring flag closed).

## 8. Sequencing Note

This is the sequenced next step from item 48's "wave-22 will measure" hook, targeting the admt residuals catalogued in item 49. Risk-side (item 48) already landed in W21 TURN A; cyber residuals remain as future queue candidates (5 highs; no critical). No cross-instrument comparison performed (s4 stays frozen).
