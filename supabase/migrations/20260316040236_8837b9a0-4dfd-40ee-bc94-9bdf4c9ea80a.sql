CREATE TABLE IF NOT EXISTS public.enforcement_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etid TEXT UNIQUE,
  regulator TEXT NOT NULL,
  subject TEXT,
  jurisdiction TEXT NOT NULL,
  violation TEXT,
  law TEXT,
  fine_amount TEXT,
  fine_eur NUMERIC,
  decision_date DATE,
  source_url TEXT,
  sector TEXT,
  action_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.enforcement_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enforcement actions"
  ON public.enforcement_actions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role manages enforcement actions"
  ON public.enforcement_actions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.enforcement_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator TEXT NOT NULL,
  subject TEXT,
  jurisdiction TEXT NOT NULL,
  violation TEXT,
  law TEXT,
  fine_amount TEXT,
  source_url TEXT,
  submitted_by TEXT,
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.enforcement_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit enforcement" ON public.enforcement_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service role manages submissions" ON public.enforcement_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);