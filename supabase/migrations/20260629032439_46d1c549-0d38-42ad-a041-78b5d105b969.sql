ALTER TABLE public.quality_fix_deliberations ADD COLUMN IF NOT EXISTS ab_evidence jsonb;

UPDATE public.tool_improvement_cycles
SET status = 'failed',
    last_error = 'Hung in deliberation: quality_fix_deliberations had no ab_evidence column, so deliberate-quality-fixes upserts failed silently and improve-tool-quality polled forever. Column added; rerun the cycle.',
    completed_at = now(),
    updated_at = now()
WHERE id = '3721cf78-9c29-489f-aaf7-41ec16ee2a1a';