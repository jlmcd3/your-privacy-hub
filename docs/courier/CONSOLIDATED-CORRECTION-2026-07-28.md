# CONSOLIDATED CORRECTION — Item 240 (Checkpoint 1)

Dispatch: CONSOLIDATED CORRECTION TURN (Item 240) — SINGLE-WRITER LAW + SEAM CONTRACTS + FOSSILS.
Date: 2026-07-28.
Scope shipped this turn: **CHECKPOINT 1** — items (B) unifications, (C) validator evidence, and one (A)-adjacent hardening. Items (A full), (D), (E), (F) are deferred to Checkpoint 2 under the dispatch's explicit "checkpoint at a clean boundary and STOP" clause; no half-wired call sites in this turn.

---

## Verify-first evidence (read this turn)

- `supabase/functions/_shared/ltp/composition-hook-audit.ts:43` — `WriteAroundOrigin` string-union (pre-edit had 5 variants).
- `supabase/functions/_shared/ltp/composition-hook-audit.ts:45-50` — `AUTHORIZED_ORIGINS` set.
- `supabase/functions/_shared/ltp/pass1-llm.ts:200-205` (pre-edit) — validator-reject branch pushed `{outcome:"error", error:"validator_issues:N"}` with **no issue-code evidence**.
- `supabase/functions/_shared/ltp/closeness.ts:46` (pre-edit) — `chooseVariant(closeness: number, threshold = 0.6)` — literal `0.6` in place of the canonical `FIRM_VARIANT_CLOSENESS_MAX`.
- `supabase/functions/_shared/ltp/content/pass2-templates.ts:441` — `export const FIRM_VARIANT_CLOSENESS_MAX = 0.6;` (canonical).
- `supabase/functions/run-cppa-risk-assessment/index.ts:3592-3595` (pre-edit) — inline union `"clock_cap" | "test_forced" | "pass1_abort_timeout" | null` with `_pass1.telemetry.error` conditional chain.
- `supabase/functions/run-cppa-risk-assessment/index.ts:3733-3737` (pre-edit) — same inline union at the finalize site.
- `supabase/functions/_shared/ltp/pass2-assembler.ts:535` — `buildTypeJWriteAroundBody.origin` string-union (needed to accept new variants when validator-reject/model-error propagate).
- `supabase/functions/_shared/render-plan/validators.ts:35-40` — `Issue { code; severity; message; path? }` — the shape captured in new telemetry.

---

## Diffs (this turn)

### (B.1) Canonical `WriteAroundOrigin` + AUTHORIZED_ORIGINS + classifier

`supabase/functions/_shared/ltp/composition-hook-audit.ts` — added variants `pass1_validator_reject` and `pass1_model_error`; both added to `AUTHORIZED_ORIGINS`; introduced `classifyPass1WriteAroundOrigin(err)` as the single canonical mapping from `Pass1Telemetry.error` → `WriteAroundOrigin`.

### (B.2) Kill inline origin unions in `run-cppa-risk-assessment/index.ts`

Both sites (assembler cutover at ~L3592 and finalize-site at ~L3733) now import `WriteAroundOrigin` + `classifyPass1WriteAroundOrigin` from `composition-hook-audit.ts`. Any future failure class is picked up automatically once added to the enum.

### (B.3) Kill `0.6` literal in `chooseVariant`

`supabase/functions/_shared/ltp/closeness.ts` — `chooseVariant(closeness, threshold = FIRM_VARIANT_CLOSENESS_MAX)`. Canonical constant re-exported for consumer convenience. All existing callers (`section-composers/cppa-risk.ts`, `pipeline.ts`, `e2e-document.test.ts`) unchanged.

### (B.4) Widen `buildTypeJWriteAroundBody.origin` to accept new variants

`supabase/functions/_shared/ltp/pass2-assembler.ts:535` — union widened; behaviour unchanged.

### (C) Validator evidence in `attempts_detail`

`supabase/functions/_shared/ltp/pass1-llm.ts` — new `Pass1AttemptIssueEvidence { code; path?; message? }`; new field `Pass1AttemptDetail.validator_issues_detail?`; on validator-reject the first `PASS1_MAX_ISSUE_EVIDENCE=5` issues are captured. A validator reject now names itself in telemetry forever after (issue code + path).

### Tests

- `composition-hook-audit.test.ts` — added: pass1_validator_reject OK, pass1_model_error OK, canonical classifier mapping for every recognised failure string.
- Suite result: **224/224 passed, 0 failed** (Deno test — `_shared/ltp/`).

---

## Deferred to Checkpoint 2 (with justification)

Explicitly NOT shipped this turn to honour the dispatch's "checkpoint at a clean boundary; no half-wired call sites" clause. Each requires content-anchored prompt/schema surgery and/or reads of files outside this turn's evidence scope; splitting the courier keeps every change in this turn verify-first.

- **(A) SINGLE-WRITER adapter injection + prompt/wire-schema shrink.** Requires: revised `PASS1_DERIVE_SYSTEM` verbatim (content-anchored), matching `renderplan-wire-schema.ts` shrink, adapter code that replaces `plan_version|product|build_stamp|jurisdiction_tag|intake_ledger|citation_bindings|gate_outcomes` and injects the factor-table scaffold, drift telemetry (`ledger_drift_count` etc.), and validator re-orientation (V1/V2 check refs against adapter truth). Structurally sound but needs full prompt authoring + a joint test asserting old-shape model outputs still land clean via adapter replacement.
- **(D) Fossil retirement.** `assembleReportShadow`, `enforce_preview` slot, `withRetryPersistFirst` + `POST_LINT_*` dead constants, wave-suppression stamps `w4–w24`. Requires grep-evidence table per module (retire vs. retain justification), safe rename of survivors (e.g. `PASS1_*`), and a preservation-check pass. Deferred pending Checkpoint 2.
- **(E) PDF + serializer seams + shared shape contract.** `generate-report-pdf/index.ts` (2,595 lines) and the LEAK-PREV-P2 serializer were not read this turn; a shared contract without those reads would violate CEO's verify-first rule.
- **(F) Joint tests** for the seams above. Composition-hook-audit joint contract is landed (canonical classifier + AUTHORIZED_ORIGINS covered); Pass-1→assembler and cutover-invariant joint tests remain for Checkpoint 2 alongside (A).
- **HARVEST_SOURCE_PREFIXES** unification (B item 7) — deferred with (A) since the prefixes appear in the T7 opening artifact and the harvest guard; correct home for the enum is the same PR as the harvest-side changes.

Items 14–15 remain deferred as data-migration-dependent per the dispatch.

---

## Deploy

Fresh self-computed stamp: `ltp-risk-item240-checkpoint1@2026-07-28T11:28:14Z`.
Deploy target: `run-cppa-risk-assessment`. Ping expected: fresh stamp visible in `manifest.stamp`.
