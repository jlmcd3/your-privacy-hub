Label: RULING-COLORADO-FP
Dispatch: RULING-COLORADO-FP-1
Timestamp: 2026-07-23T22:30:00Z
Mode: Ledger/ruling only. No product/prompt/grader edits. No batches launched.

# Ruling — D-FIX2-D-COLORADO-FP: RESOLVED (grader false positives)

Primary-source basis (CEO-verified, both pre-7/1/2025 CRS and HB 24-1130 effective 7/1/2025):
- **§ 6-1-1303(24)(b)** — verbatim: "Genetic or biometric data that may be processed for the purpose of uniquely identifying an individual." Unchanged across versions.
- **§ 6-1-1303(5)** — consent requires a "clear, affirmative act ... unambiguous agreement." Pre-checked boxes fail this standard as a matter of application; product's cited source supports the claim.

## Voided firings in batch dd7bdde6

| Tool | check_id | Voided samples | Basis |
|---|---|---|---|
| biometric-checker | rubric_citation_misapplied | 1 of 4 | § 6-1-1303(24)(b) is verbatim correct |
| biometric-checker | rubric_unsupported_business_claim | 1 of 2 | § 6-1-1303(5) supports pre-checked-box conclusion |

Only biometric-checker is affected. cppa-admt and cppa-risk scores are unchanged.

## Recomputed dd7bdde6 scores (voids applied)

| Tool | Before (as reported) | After (voids applied) | Delta |
|---|---|---|---|
| cppa-admt | 78.75 | 78.75 | 0.00 |
| **biometric-checker** | **79.90** | **~82.4** (approx; +2.5) | **+2.5** |
| cppa-risk | 86.18 | 86.18 | 0.00 |

Note on the biometric recomputation: shown as an approximation using the tool's per-finding weight (~1.25 pts per failing sample against a 3-doc batch, consistent with prior rubric weightings). Exact figure requires a grader replay with the two firings marked voided — not run this tick per HOLD.

## Character of the ruling
This is a **measurement correction** backed by primary-source proof, not a grader weakening. Grader rules and prompts remain unchanged.

## Learnings-log nuance (not a deviation)
Statute does not expressly name pre-checked boxes. Ideal biometric output frames the pre-checked-box conclusion as an **application** of the § 6-1-1303(5) "clear, affirmative act" standard, optionally cross-citing **4 CCR 904-3** (CPA Rules) consent provisions for reinforcement.

## Register status
- Register #16 (Indiana pinpoint prerequisite) — OPEN.
- Register #17 (PDF export state persistence on `quality_run_documents`) — OPEN.
- No new register-class items identified this review.
