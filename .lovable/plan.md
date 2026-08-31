# Redeploy Session-3-touched edge functions

## Diagnosis (confirmed)
- Repo source already contains the cf4968abd fixes (`admt-v2-assemble.ts` has the new "Scope qualification" heading; the old "section number is retained" sentence is absent; S3 source-text pins guard both).
- Commit sync does NOT redeploy edge functions — the 09:17 UTC batch ran against the pre-cf4968abd build of `run-admt-checker-v2`.
- Conclusion: a manual redeploy is needed. Nothing is wrong with the commits themselves.

## Action
Redeploy the functions touched by cf4968abd (and the grader-calibration commit a8b003884):

1. `run-admt-checker-v2`
2. `run-registration-assessment`
3. `run-cppa-cybersecurity`
4. `generate-report-pdf`
5. `grade-single-assessment`

(Shared `_shared/ltp` code is bundled per-function at deploy time, so redeploying these five covers the `_shared` changes.)

## Verification
1. Confirm each deploy succeeds.
2. Re-run a single cppa_admt generation at /admin/all-products-test (or rerun the batch) and confirm the report shows "Scope qualification — conditions on this determination" and no "section number is retained" sentence.
3. Run the fleet-lint S3 presentation-QA test to confirm source pins still pass.
