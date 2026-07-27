# LTP-RISK WAVE-C — Citation Closure Landed + Wave-C Launched

**Stamp:** 2026-07-27T02:03:20Z
**Dispatch:** WAVE-B2-CITATION-CLOSURE + WAVE-C LAUNCH (CEO-approved 2026-07-27).
**Deploy target:** `run-cppa-risk-assessment` (instrument s6 frozen).
**BUILD_STAMP:** `ltp-risk-waveb2-closure@2026-07-27T04:20:00Z`.

## Fixes

### (1) Token-substitution truncation guard
`supabase/functions/_shared/ltp/waveb2-closure.ts` — scans narrative strings for
citation fragments truncated mid-token (patterns: `§…`, `(pinpoint)…`,
`\d[\d.]*\(pinpoint\)…`). Drops the containing sentence when detected.
Truncation may never split a substituted citation span.

### (2) `information_needed` self-contradiction filter
Cross-checks every `information_needed` entry against the rendered report's
pinpoint inventory (excluding `_meta`). If every pinpoint requested by an
entry is already stated elsewhere in the report, the entry is dropped.
Runs on both top-level `information_needed` and per-activity
`risk_assessment_by_activity[].information_needed`.

### (3) § 7150(b) prong-map verified against verbatim registry
Registry: `supabase/functions/_shared/openings/ccpa-7150-pin.ts` (source-of-truth,
verbatim from provision_texts `cppa-7150`, status=approved). All six prong
labels aligned to statute; no map fix required. Exhaustive regression
test asserts:
- (b)(1) selling/sharing, (b)(2) sensitive PI, (b)(3) ADMT significant
  decision, (b)(4) systematic observation in worker/student/applicant
  contexts, (b)(5) sensitive location, (b)(6) training ADMT/biometric.
- Cross-guards: (b)(4) label MUST NOT claim sensitive location; (b)(5)
  MUST NOT claim worker/student/applicant.

### (4) Attestation citation discipline
`_w9_risk_slots.ts`: `attestation_block.statutory_basis` now emits
`§ 7157(b)(5), § 7157(c)` — the registry-verified perjury/attestation and
executive-authority anchors — replacing the unverified `§ 7156(a)`.
`waveb2-closure.ts` also rewrites any residual § 7156(a) at render time.
Validator relaxed to accept § 7156 OR § 7157 (transitional).

### (5) Cyber crosswalk § 7120(b)(2)(A) — band matrix
`waveb-completion.ts::computeProngOutcomes` now treats
`$25M to under $50M` as STRADDLING § 1798.140(d)(1)(A) → outcome
`indeterminate` (the band edge crosses the CPI-adjusted revenue
threshold). Only cleanly-clearing bands
(`$50M to $100M`, `Over $100M`) paired with 250K+ consumers render `met`.
Consumer bands under 250K render `not met`. Indeterminate outcomes render
the crosswalk clause with the literal outcome `indeterminate`, never
`met`.

### (6) Regression suite — 8/8 green
```
§ 7150(b) prong verbatim texts anchor to their glossed labels ... ok
b2A crosswalk: $25M-under-$50M straddles (d)(1)(A) → indeterminate ... ok
b2A crosswalk: $50M-$100M + 250K+ → met ... ok
b2A crosswalk: Under $25M → not met ... ok
b2A crosswalk: consumers under 250K → not met ... ok
closure: truncation guard drops garbled citation sentence in priority_actions ... ok
closure: information_needed self-contradiction dropped when pinpoint already rendered ... ok
closure: attestation_block statutory_basis rewritten off unverified § 7156(a) ... ok
ok | 8 passed | 0 failed
```

## Wave-C launch (batch-wrapped per item 152 standing rule)

- `quality_batch_runs.id = 9c1e3a8f-5b2d-4e7c-9a4b-8f2d1e5c7b3a`
- tools=`{cppa-risk}`, `batch_size=6`, `scenario_set=tuning`, standalone s6,
  `campaign_id=NULL`, single launch.
- Kicked via `kick-wrapped-batch` → orchestrator returned
  `202 { ok: true, build_stamp: "ds-t2c-orch-hbfix@2026-07-25T04:54:00Z" }`.
- Batch state at launch: `status=queued phase=starting`
  `last_heartbeat_at=2026-07-27T02:03:07.853Z`.

## Success criteria (monitor extracts at terminal)

- Intake-drift: 0 (must hold from Wave-B.2).
- Gate-violations: 0 (must hold from Wave-B.2).
- Citation-binding: 0 (NEW REQUIREMENT this wave — post-closure).
- Tuning/holdout split reported (4 tuning / 2 holdout).
- Per-doc enforce-mode confirmation across all mapped surfaces
  (item-154 completion pass + s6 re-keyed checks + item-157 closure pass).

## Files touched

- `supabase/functions/_shared/ltp/waveb2-closure.ts` (NEW)
- `supabase/functions/_shared/ltp/waveb-completion.ts` (b2A tightening)
- `supabase/functions/run-cppa-risk-assessment/_w9_risk_slots.ts`
  (attestation § 7157 anchor + validator)
- `supabase/functions/run-cppa-risk-assessment/index.ts`
  (BUILD_STAMP bump + closure wiring)
- `supabase/functions/_shared/__tests__/waveb2-closure.test.ts` (NEW)
