-- Shared translation infrastructure for all report tools

-- 1) Glossary: authoritative term mappings (e.g., GDPR statutory terms per language)
CREATE TABLE public.translation_glossary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_term TEXT NOT NULL,
  source_lang VARCHAR(8) NOT NULL DEFAULT 'en',
  target_lang VARCHAR(8) NOT NULL,
  target_term TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'gdpr',
  authority TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_term, source_lang, target_lang, domain)
);

CREATE INDEX idx_translation_glossary_lookup
  ON public.translation_glossary (target_lang, domain);

ALTER TABLE public.translation_glossary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read glossary"
  ON public.translation_glossary
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages glossary"
  ON public.translation_glossary
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_translation_glossary_updated_at
  BEFORE UPDATE ON public.translation_glossary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Report translation cache: keyed by (report_type, report_id, target_lang, content_hash)
CREATE TABLE public.report_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,        -- 'biometric' | 'dpa' | 'dpia' | 'li' | 'governance' | 'ir' | 'registration' | 'brief' | ...
  report_id UUID NOT NULL,
  target_lang VARCHAR(8) NOT NULL,
  source_lang VARCHAR(8) NOT NULL DEFAULT 'en',
  content_hash TEXT NOT NULL,        -- sha256 of the source content; invalidates cache when source changes
  translated_content JSONB NOT NULL, -- mirrors the shape of the source report_data
  model TEXT,
  user_id UUID,                      -- the user who triggered the translation (for auditing)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_type, report_id, target_lang, content_hash)
);

CREATE INDEX idx_report_translations_lookup
  ON public.report_translations (report_type, report_id, target_lang);

ALTER TABLE public.report_translations ENABLE ROW LEVEL SECURITY;

-- Owners of the underlying report can read its translations.
-- We check ownership against each report table the user can own.
CREATE POLICY "Users can read translations of their own reports"
  ON public.report_translations
  FOR SELECT
  TO authenticated
  USING (
    (report_type = 'biometric'    AND EXISTS (SELECT 1 FROM public.biometric_assessments    r WHERE r.id = report_translations.report_id AND r.user_id = auth.uid()))
 OR (report_type = 'dpa'          AND EXISTS (SELECT 1 FROM public.dpa_documents           r WHERE r.id = report_translations.report_id AND r.user_id = auth.uid()))
 OR (report_type = 'dpia'         AND EXISTS (SELECT 1 FROM public.dpia_frameworks         r WHERE r.id = report_translations.report_id AND r.user_id = auth.uid()))
 OR (report_type = 'li'           AND EXISTS (SELECT 1 FROM public.li_assessments          r WHERE r.id = report_translations.report_id AND r.user_id = auth.uid()))
 OR (report_type = 'governance'   AND EXISTS (SELECT 1 FROM public.governance_assessments  r WHERE r.id = report_translations.report_id AND r.user_id = auth.uid()))
 OR (report_type = 'ir'           AND EXISTS (SELECT 1 FROM public.ir_playbooks            r WHERE r.id = report_translations.report_id AND r.user_id = auth.uid()))
 OR (report_type = 'registration' AND EXISTS (SELECT 1 FROM public.registration_assessments r WHERE r.id = report_translations.report_id AND r.user_id = auth.uid()))
  );

CREATE POLICY "Service role manages report translations"
  ON public.report_translations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_report_translations_updated_at
  BEFORE UPDATE ON public.report_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();