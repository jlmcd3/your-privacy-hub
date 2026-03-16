CREATE TABLE IF NOT EXISTS public.regulator_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  follow_type TEXT NOT NULL,
  follow_key TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, follow_type, follow_key)
);
ALTER TABLE public.regulator_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can follow" ON public.regulator_follows FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service role manages follows" ON public.regulator_follows FOR ALL TO service_role USING (true) WITH CHECK (true);