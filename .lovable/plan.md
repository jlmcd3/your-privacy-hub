# Cursor-batched corpus classification

## What will change
- Add the service-only `corpus_classification_results` scratch table, indexes, RLS policy, and required grants.
- Add `classify_from_db` to the existing corpus-profile function with strict request validation, batches of 6 by default (maximum 10), UUID cursoring, server-side excerpt extraction for the three approved source tables, idempotent result upserts, and no writes to `authority_relevance_profiles`.
- Persist enough run state to enforce one active batch at a time and pause safely on terminal model-provider failures; completed profiles remain idempotently recorded in the results table.
- Add `corpus-classify-driver` with the requested two-minute schedule but leave it inactive. Its request uses the stored internal credential and reads the future run ID from the database setting.
- Resolve the existing deployment-only import packaging failure without changing classifier behavior, then deploy `generate-corpus-relevance-profiles` without invoking either classification action.

## Verification
- Add focused tests for validation, cursor derivation, excerpt windows/fallbacks, outcome/result mapping, and the no-write boundary.
- Run the affected corpus test files and deploy the function.
- Confirm `DEFAULT_CLASSIFIER_MODEL` remains exactly `claude-opus-5`, the cron is inactive, and no classification result rows were created.

## Technical details
- Request: `{ action: "classify_from_db", product: "lia", run_id: string, batch_size?: number, cursor?: uuid | null, only_unclassified?: boolean }`.
- Response: `{ action, product, run_id, model, processed, next_cursor, done, elapsed_ms }` plus a clear error response if validation, source loading, model calls, or persistence fails.
- Starting later will set `app.settings.corpus_classify_run_id` and activate the existing cron row; stopping is one SQL statement that marks that cron row inactive.
