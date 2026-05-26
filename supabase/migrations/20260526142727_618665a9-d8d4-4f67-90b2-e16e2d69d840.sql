
-- =========================================================
-- Package 1.1: New columns on enforcement_actions
-- =========================================================
ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS statutory_provisions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS statutory_provisions_extraction_method text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS disposition_type text,
  ADD COLUMN IF NOT EXISTS disposition_type_extraction_method text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS appeal_status text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS appeal_status_extraction_method text DEFAULT 'none';

ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS sector_extraction_method text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS original_currency text,
  ADD COLUMN IF NOT EXISTS original_amount numeric,
  ADD COLUMN IF NOT EXISTS case_reference text,
  ADD COLUMN IF NOT EXISTS case_reference_extraction_method text DEFAULT 'none';

ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS regulatory_family text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_document_hash text,
  ADD COLUMN IF NOT EXISTS last_source_fetch_at timestamptz;

ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_deterministic_pass boolean,
  ADD COLUMN IF NOT EXISTS verification_paraphrase_confidence text DEFAULT 'not_run',
  ADD COLUMN IF NOT EXISTS memo_eligible boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.enforcement_actions
    ADD CONSTRAINT enforcement_actions_verification_status_chk
      CHECK (verification_status IN ('unverified','pending','verified','failed','requires_review'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.enforcement_actions
    ADD CONSTRAINT enforcement_actions_paraphrase_confidence_chk
      CHECK (verification_paraphrase_confidence IN ('high','medium','low','not_run','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.enforcement_actions
    ADD CONSTRAINT enforcement_actions_extraction_method_chk
      CHECK (statutory_provisions_extraction_method IN ('none','regex_high_confidence','regex_low_confidence','pattern_per_regulator','verified_from_source','manual'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS enforcement_actions_regulatory_family_idx
  ON public.enforcement_actions USING GIN (regulatory_family);
CREATE INDEX IF NOT EXISTS enforcement_actions_memo_eligible_idx
  ON public.enforcement_actions (memo_eligible) WHERE memo_eligible = true;
CREATE INDEX IF NOT EXISTS enforcement_actions_verification_status_idx
  ON public.enforcement_actions (verification_status);

-- =========================================================
-- Package 1.2: verification_results
-- =========================================================
CREATE TABLE IF NOT EXISTS public.verification_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_action_id uuid NOT NULL REFERENCES public.enforcement_actions(id) ON DELETE CASCADE,
  check_name text NOT NULL,
  check_category text NOT NULL,
  verdict text NOT NULL,
  evidence_text text,
  evidence_offset_start integer,
  evidence_offset_end integer,
  source_document_hash text,
  model_used text,
  ran_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verification_results_category_chk
    CHECK (check_category IN ('deterministic','semantic','paraphrase','fetch')),
  CONSTRAINT verification_results_verdict_chk
    CHECK (verdict IN ('pass','fail','uncertain','skipped'))
);

GRANT ALL ON public.verification_results TO service_role;

ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY verification_results_service_all ON public.verification_results
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS verification_results_action_idx
  ON public.verification_results (enforcement_action_id);
CREATE INDEX IF NOT EXISTS verification_results_ran_at_idx
  ON public.verification_results (ran_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS verification_results_latest_idx
  ON public.verification_results (enforcement_action_id, check_name, ran_at DESC);

-- =========================================================
-- Package 1.3: regulatory_guidance
-- =========================================================
CREATE TABLE IF NOT EXISTS public.regulatory_guidance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator text NOT NULL,
  jurisdiction text NOT NULL,
  regulatory_family text[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  document_type text NOT NULL,
  source_url text NOT NULL,
  effective_date date,
  summary text,
  full_text text,
  source_document_hash text,
  verification_status text NOT NULL DEFAULT 'unverified',
  last_source_fetch_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regulatory_guidance_doctype_chk
    CHECK (document_type IN (
      'guideline','opinion','regulation','technical_standard',
      'enforcement_priority','interpretation','rfc_response','q_and_a'
    ))
);

GRANT SELECT ON public.regulatory_guidance TO anon, authenticated;
GRANT ALL ON public.regulatory_guidance TO service_role;

ALTER TABLE public.regulatory_guidance ENABLE ROW LEVEL SECURITY;

CREATE POLICY regulatory_guidance_read ON public.regulatory_guidance
  FOR SELECT USING (true);
CREATE POLICY regulatory_guidance_service_write ON public.regulatory_guidance
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY regulatory_guidance_service_update ON public.regulatory_guidance
  FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS regulatory_guidance_family_idx
  ON public.regulatory_guidance USING GIN (regulatory_family);
CREATE INDEX IF NOT EXISTS regulatory_guidance_jurisdiction_idx
  ON public.regulatory_guidance (jurisdiction);

-- =========================================================
-- Package 1.4: corpus_versions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.corpus_versions (
  version_label text PRIMARY KEY,
  snapshot_date timestamptz NOT NULL DEFAULT now(),
  total_enforcement_actions integer NOT NULL,
  memo_eligible_count integer NOT NULL,
  total_regulatory_guidance integer NOT NULL DEFAULT 0,
  notes text
);

GRANT ALL ON public.corpus_versions TO service_role;

ALTER TABLE public.corpus_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY corpus_versions_service_all ON public.corpus_versions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.corpus_versions (version_label, total_enforcement_actions, memo_eligible_count, notes)
SELECT
  to_char(now(), 'YYYY-MM-DD') || '-baseline',
  count(*),
  0,
  'Baseline snapshot prior to candidate extraction and verification scan.'
FROM public.enforcement_actions
ON CONFLICT (version_label) DO NOTHING;

-- =========================================================
-- Package 1.5: jurisdiction_canonical
-- =========================================================
CREATE TABLE IF NOT EXISTS public.jurisdiction_canonical (
  canonical_name text PRIMARY KEY,
  iso_country_code text,
  iso_subdivision_code text,
  display_name text NOT NULL,
  is_subnational boolean NOT NULL DEFAULT false,
  parent_jurisdiction text REFERENCES public.jurisdiction_canonical(canonical_name),
  notes text
);

GRANT ALL ON public.jurisdiction_canonical TO service_role;

ALTER TABLE public.jurisdiction_canonical ENABLE ROW LEVEL SECURITY;

CREATE POLICY jurisdiction_canonical_service_all ON public.jurisdiction_canonical
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS jurisdiction_canonical_country_idx
  ON public.jurisdiction_canonical (iso_country_code);

-- =========================================================
-- Package 1.6: regulatory_family_mapping
-- =========================================================
CREATE TABLE IF NOT EXISTS public.regulatory_family_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator text NOT NULL,
  jurisdiction text NOT NULL REFERENCES public.jurisdiction_canonical(canonical_name),
  regulatory_family text NOT NULL,
  primary_statute text,
  notes text,
  UNIQUE (regulator, jurisdiction, regulatory_family)
);

GRANT ALL ON public.regulatory_family_mapping TO service_role;

ALTER TABLE public.regulatory_family_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY regulatory_family_mapping_service_all ON public.regulatory_family_mapping
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS regulatory_family_mapping_regulator_idx
  ON public.regulatory_family_mapping (regulator);
CREATE INDEX IF NOT EXISTS regulatory_family_mapping_family_idx
  ON public.regulatory_family_mapping (regulatory_family);
