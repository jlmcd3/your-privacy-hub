-- 1. Add preferred_language to profiles (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language varchar(10) NOT NULL DEFAULT 'en';

-- 2. Create brief_translations table
CREATE TABLE IF NOT EXISTS public.brief_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date date NOT NULL,
  language_code varchar(10) NOT NULL,
  translated_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brief_translations_date_lang_unique UNIQUE (brief_date, language_code)
);

ALTER TABLE public.brief_translations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read translations
DROP POLICY IF EXISTS "Authenticated users can read brief translations" ON public.brief_translations;
CREATE POLICY "Authenticated users can read brief translations"
  ON public.brief_translations
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access (insert/select/update/delete)
DROP POLICY IF EXISTS "Service role manages brief translations" ON public.brief_translations;
CREATE POLICY "Service role manages brief translations"
  ON public.brief_translations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_brief_translations_date ON public.brief_translations(brief_date);