# ENFORCE-MODE REGRESSION — 2026-07-27

**Incident dispatch:** controller double-check + CEO-ordered verification, 2026-07-27 ~02:10Z. Ledger item 159.

## What happened

Two consecutive batches on `run-cppa-risk-assessment` measured a customer-visible generator whose per-doc telemetry envelope reported `legal_test_pipeline.mode = "shadow"`, while the surrounding turns declared themselves enforce-mode reads:

| Batch | Run | Launched by | Score | Real mode | Ruling |
|---|---|---|---|---|---|
| `127a6714-1062-427e-8f94-484ca9241006` | 146 | INSTRUMENT-EPOCH-AUDIT s5→s6 (item 155) as "WAVE B.2" | 72.35 | shadow (per-doc telemetry) | **NON-EVIDENTIAL** for enforce-mode claims |
| `9c1e3a8f-5b2d-4e7c-9a4b-8f2d1e5c7b3a` | — | WAVE-B.2 CITATION CLOSURE (item 157) as "Wave C" | — | shadow (would-have-been) | Controller set `cancel_requested=true` at 02:03:07Z. **Wave C did not happen on this batch.** |

## Root cause

`supabase/functions/_shared/ltp/pipeline.ts` — the top-level `LtpTelemetry.mode` field was **hardcoded to `"shadow"`** on both return branches of `runLegalTestPipelineShadow()`. The `LTP_ENFORCE_ENABLED=1` env var was correctly set on the function environment throughout and correctly gated whether Pass-1 LLM ran (per-doc `enforce_preview.telemetry.ok=true`). What was missing:

1. The mode **label** never read the env — it was a string constant.
2. No boot-log line dedicated to `ltp_mode`.
3. No side-effect-free ping surface to interrogate the generator's configuration.
4. No header-based mode-mismatch abort on the generator.
5. No pre-assertion in the batch-wrap kicker to compare declared expectation against generator reality before spending model credits.

Because (1)–(5) were all absent, a controller could not detect the mismatch until after generation completed and per-doc telemetry was written.

The label defect has been present since `ltp-risk-p2@2026-07-26T08:50:44Z` (item 137). All later deploys inherited it. **No deploy dropped the env flag; the label was blind to the flag.** This is a spec/architecture defect, not an ops mistake — a hand-set env cannot fix it.

## Structural fix (deployed this turn)

**Code:**
- `_shared/ltp/pipeline.ts` — `export function ltpMode()` reads `LTP_ENFORCE_ENABLED`; both return branches emit the real label.
- `run-cppa-risk-assessment/index.ts` — dedicated boot line `boot ltp_mode=<enforce|shadow>`; `GET /?ping=1` returns `{fn, build_stamp, ltp_mode, ltp_version}`; `x-ltp-mode-expected` header aborts pre-work with HTTP 409 `ltp_mode_mismatch` on mismatch. `BUILD_STAMP = ltp-risk-enforce-regression-fix@2026-07-27T02:20:00Z`.
- `kick-wrapped-batch/index.ts` — accepts `mode_expected` + `target_fn`; PINGS the target's `?ping=1` first; returns HTTP 409 (never spawns the batch) on mismatch.

**Boot-log proof (live logs, 2026-07-27T02:11:51Z):**
```
[run-cppa-risk-assessment] boot ltp_mode=enforce design=docs/design/LEGAL-TEST-PIPELINE.md §16-measurement-validity-law
[run-cppa-risk-assessment] boot build_stamp=ltp-risk-enforce-regression-fix@2026-07-27T02:20:00Z
```
**Ping response:** `{"fn":"run-cppa-risk-assessment","build_stamp":"ltp-risk-enforce-regression-fix@2026-07-27T02:20:00Z","ltp_mode":"enforce","ltp_version":"ltp-risk-p2"}`.

## Generalized design law (spec-writeback)

`docs/design/LEGAL-TEST-PIPELINE.md` §16 **measurement-validity law** — product-agnostic, standing. Every measurement records and asserts the generative configuration it claims to measure. Three requirements: (a) generator boot line prints `ltp_mode=…` at every cold start; (b) generator exposes ping + honors `x-ltp-mode-expected`; (c) batch harness records the reported mode on the run row at dispatch AND pre-asserts equality before the first generation call. Silent measurement against a different configuration than declared yields **non-evidential** runs — not passes, not fails, measurement errors.

Boot-log assertion is now part of the deploy protocol: post-deploy turns MUST paste the boot line as evidence.

## Wave C relaunch (proper)

- New batch `2a3c07a2-7bd3-4250-a73e-ce19ea725633` (tools=`{cppa-risk}`, batch_size=6, standalone `gc-2026-07-27-s6-eu-uk-ca-au-sg`, concurrency=1).
- Kicked via `kick-wrapped-batch` with `mode_expected="enforce"`. Pre-assertion: `expected=enforce, actual=enforce, build_stamp=ltp-risk-enforce-regression-fix@2026-07-27T02:20:00Z`. Orchestrator returned `202 {ok:true}`.
- Monitor extracts at terminal against §5 success criteria (intake-drift 0 / gate violations 0 / citation-binding 0) AND confirms per-doc `_meta.internal.legal_test_pipeline.mode="enforce"` on all 6 documents.

## Addendum — Run 146 fingerprint refinement (2026-07-27 ~02:43Z)

Controller fingerprint verification against run 146 documents refines the evidential status of the mislabel:

- **assessment_summary.narrative ABSENT on 3/3 docs checked** → enforce-gated composition genuinely did not execute at generation time. The hardcoded `mode:"shadow"` label matched actual behavior; the mislabel was cosmetic on run 146 (behavior was in fact shadow). The structural fix in this courier still stands — the label was blind to the flag and could have masked the opposite mismatch on any later deploy.
- **purpose === intake.i1_processing_purpose byte-verbatim on 3/3 docs** → the Wave-B COMPLETION turn's ALWAYS-ON deterministic fixes (purpose-verbatim wiring, and by extension the sibling always-on surfaces from `waveb-completion.ts`) were live in shadow and behaved as specified.

**Refined ledger status for run 146:**
- **NON-EVIDENTIAL** for pipeline rendering / enforce-gated composition (Wave C did not happen on this batch).
- **EVIDENTIAL (positive)** for the always-on deterministic fix subset — purpose-verbatim wiring holds under shadow, consistent with the completion-turn contract.

Wave C proper (`2a3c07a2-7bd3-4250-a73e-ce19ea725633`, enforce/enforce pre-checked) proceeds undisturbed.
