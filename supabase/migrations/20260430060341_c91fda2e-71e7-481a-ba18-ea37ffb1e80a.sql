-- Reset articles that were falsely marked as skipped due to a parser bug in
-- backfill-ai-summaries (truncated/markdown-wrapped Anthropic output). These
-- will be re-picked up by the next enrichment run with the fixed parser.
UPDATE public.updates
SET ai_summary = NULL,
    enrichment_version = 0
WHERE ai_summary = '{"skipped": true}'::jsonb;