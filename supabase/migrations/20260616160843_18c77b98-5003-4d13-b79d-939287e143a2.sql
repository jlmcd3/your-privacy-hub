
ALTER TABLE public.annual_tool_credits
  ADD COLUMN IF NOT EXISTS credit_index integer NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS public.annual_credit_one_per_cycle;

CREATE UNIQUE INDEX IF NOT EXISTS annual_credit_one_per_cycle_idx
  ON public.annual_tool_credits
  (user_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid), cycle_start, credit_index);
