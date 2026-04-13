-- PART A: Add digest preference columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS digest_jurisdictions text[],
ADD COLUMN IF NOT EXISTS digest_topics text[];

CREATE INDEX IF NOT EXISTS idx_profiles_digest_jurisdictions
ON public.profiles USING GIN (digest_jurisdictions);

-- PART B: Create free_digests table
CREATE TABLE IF NOT EXISTS public.free_digests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL,
    week_label      text NOT NULL,
    period_start    date NOT NULL,
    period_end      date NOT NULL,
    digest_items    jsonb NOT NULL DEFAULT '[]',
    pattern_observation text,
    jurisdictions_used  text[],
    topics_used         text[],
    generated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, period_end)
);

CREATE INDEX IF NOT EXISTS idx_free_digests_user_week
ON public.free_digests (user_id, period_end DESC);

-- Enable RLS
ALTER TABLE public.free_digests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own digests"
ON public.free_digests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own digests"
ON public.free_digests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Service role needs full access for the edge function
CREATE POLICY "Service role full access on free_digests"
ON public.free_digests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);