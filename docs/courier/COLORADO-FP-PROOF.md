Label: COLORADO-FP-PROOF
Dispatch: CHANNEL-FAILOVER-1
Timestamp: 2026-07-23T22:15:00Z
Mode: Read-only report; no product changes.

# Colorado FP — Primary-Source Proof (D-FIX2-D-COLORADO-FP)

## 1. Statute/section verified
- **C.R.S. § 6-1-1303(5)** — "Consent" definition.
- **C.R.S. § 6-1-1303(24)(b)** — "Sensitive data" definition (biometric branch).

## 2. Primary-source URLs consulted
- https://colorado.public.law/statutes/crs_6-1-1303 (enrolled text, verified 2026-07-23)
- Cross-reference: https://www.cliclaw.com/faqs/what-biometric-data-colorado-privacy-act-cpa/

## 3. Source vs. grader deduction
- **§ 6-1-1303(24)(b)**: Source text expressly includes "biometric data that may be processed for the purpose of uniquely identifying an individual." Product cited this exactly. Grader flagged the cite as unverifiable/misapplied. **Source directly supports the product; grader is wrong.**
- **§ 6-1-1303(5)**: Source requires a "clear, affirmative act." Product cited that pre-checked boxes do not constitute consent. Grader flagged as unsupported. **Source substantively supports the product** (pre-checked boxes are not clear affirmative acts).

## 4. Recommended disposition
- **Resolve D-FIX2-D-COLORADO-FP as grader false positives.** No product change.
- Void the two Colorado-specific grader firings in batch `dd7bdde6`:
  - biometric-checker `rubric_citation_misapplied` — 1 of 4 failing samples.
  - biometric-checker `rubric_unsupported_business_claim` — 1 of 2 failing samples.
