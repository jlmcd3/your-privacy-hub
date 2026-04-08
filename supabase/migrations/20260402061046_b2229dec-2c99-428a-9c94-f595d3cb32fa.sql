CREATE TABLE IF NOT EXISTS public.report_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  jurisdiction text NOT NULL,
  topics text[] NOT NULL,
  industry text,
  user_id uuid,
  converted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.report_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only" ON public.report_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_insert" ON public.report_configs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);