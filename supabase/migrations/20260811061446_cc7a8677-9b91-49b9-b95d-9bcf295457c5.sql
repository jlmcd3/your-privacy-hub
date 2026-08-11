ALTER TABLE public.annual_tool_credits ADD COLUMN IF NOT EXISTS pool text NOT NULL DEFAULT 'smart_tool';

ALTER TABLE public.annual_tool_credits DROP CONSTRAINT IF EXISTS annual_tool_credits_redeemed_tool_check;
ALTER TABLE public.annual_tool_credits ADD CONSTRAINT annual_tool_credits_redeemed_tool_check
  CHECK (redeemed_tool IS NULL OR redeemed_tool IN ('governance','lia','dpia','ropa'));

ALTER TABLE public.annual_tool_credits DROP CONSTRAINT IF EXISTS annual_tool_credits_pool_check;
ALTER TABLE public.annual_tool_credits ADD CONSTRAINT annual_tool_credits_pool_check
  CHECK (pool IN ('smart_tool','ropa'));

DROP INDEX IF EXISTS annual_credit_one_per_cycle_v2;
DROP INDEX IF EXISTS annual_credit_one_per_cycle;
CREATE UNIQUE INDEX IF NOT EXISTS annual_credit_one_per_cycle_v3 ON public.annual_tool_credits
  (user_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid), cycle_start, credit_index, pool);