CREATE TABLE IF NOT EXISTS public.sample_brief_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code varchar(10) NOT NULL,
  translated_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sample_brief_translations_lang_unique UNIQUE (language_code)
);

ALTER TABLE public.sample_brief_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read sample brief translations"
  ON public.sample_brief_translations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages sample brief translations"
  ON public.sample_brief_translations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_sample_brief_translations_updated_at
BEFORE UPDATE ON public.sample_brief_translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();