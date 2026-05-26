
-- ===== Block A: Additive schema =====
CREATE TABLE IF NOT EXISTS public.corpus_field_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_action_id uuid NOT NULL REFERENCES public.enforcement_actions(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  extraction_method text NOT NULL,
  source_url text,
  source_document_hash text,
  model_used text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
CREATE INDEX IF NOT EXISTS corpus_field_history_action_idx ON public.corpus_field_history (enforcement_action_id);
CREATE INDEX IF NOT EXISTS corpus_field_history_field_idx ON public.corpus_field_history (field_name);
GRANT SELECT ON public.corpus_field_history TO authenticated;
GRANT ALL ON public.corpus_field_history TO service_role;
ALTER TABLE public.corpus_field_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS corpus_field_history_service_all ON public.corpus_field_history;
CREATE POLICY corpus_field_history_service_all ON public.corpus_field_history
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS corpus_field_history_admin_read ON public.corpus_field_history;
CREATE POLICY corpus_field_history_admin_read ON public.corpus_field_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.corpus_drift_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_action_id uuid REFERENCES public.enforcement_actions(id) ON DELETE CASCADE,
  detected_at timestamptz NOT NULL DEFAULT now(),
  previous_hash text,
  new_hash text,
  previous_verdict text,
  new_verdict text,
  trigger_source text NOT NULL,
  notes text,
  CONSTRAINT corpus_drift_log_trigger_chk
    CHECK (trigger_source IN ('lazy_re_verification','new_row_verification','manual','sampling'))
);
CREATE INDEX IF NOT EXISTS corpus_drift_log_action_idx ON public.corpus_drift_log (enforcement_action_id);
CREATE INDEX IF NOT EXISTS corpus_drift_log_detected_idx ON public.corpus_drift_log (detected_at DESC);
GRANT SELECT ON public.corpus_drift_log TO authenticated;
GRANT ALL ON public.corpus_drift_log TO service_role;
ALTER TABLE public.corpus_drift_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS corpus_drift_log_service_all ON public.corpus_drift_log;
CREATE POLICY corpus_drift_log_service_all ON public.corpus_drift_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS corpus_drift_log_admin_read ON public.corpus_drift_log;
CREATE POLICY corpus_drift_log_admin_read ON public.corpus_drift_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.source_document_cache (
  source_url text PRIMARY KEY,
  content_hash text NOT NULL,
  content_text text NOT NULL,
  content_type text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
CREATE INDEX IF NOT EXISTS source_document_cache_expires_idx ON public.source_document_cache (expires_at);
GRANT ALL ON public.source_document_cache TO service_role;
ALTER TABLE public.source_document_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS source_document_cache_service_all ON public.source_document_cache;
CREATE POLICY source_document_cache_service_all ON public.source_document_cache
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.verification_queue (
  enforcement_action_id uuid PRIMARY KEY REFERENCES public.enforcement_actions(id) ON DELETE CASCADE,
  queued_at timestamptz NOT NULL DEFAULT now(),
  priority text NOT NULL DEFAULT 'normal',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_error text,
  in_flight_until timestamptz
);
CREATE INDEX IF NOT EXISTS verification_queue_priority_idx ON public.verification_queue (priority, queued_at);
CREATE INDEX IF NOT EXISTS verification_queue_in_flight_idx ON public.verification_queue (in_flight_until) WHERE in_flight_until IS NOT NULL;
GRANT SELECT ON public.verification_queue TO authenticated;
GRANT ALL ON public.verification_queue TO service_role;
ALTER TABLE public.verification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verification_queue_service_all ON public.verification_queue;
CREATE POLICY verification_queue_service_all ON public.verification_queue
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS verification_queue_admin_read ON public.verification_queue;
CREATE POLICY verification_queue_admin_read ON public.verification_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.verification_results ADD COLUMN IF NOT EXISTS notes text;

-- ===== Block B: Fix constraints =====
ALTER TABLE public.enforcement_actions DROP CONSTRAINT IF EXISTS enforcement_actions_extraction_method_chk;
ALTER TABLE public.enforcement_actions DROP CONSTRAINT IF EXISTS statutory_provisions_extraction_method_chk;
ALTER TABLE public.enforcement_actions DROP CONSTRAINT IF EXISTS disposition_type_extraction_method_chk;
ALTER TABLE public.enforcement_actions DROP CONSTRAINT IF EXISTS appeal_status_extraction_method_chk;
ALTER TABLE public.enforcement_actions DROP CONSTRAINT IF EXISTS sector_extraction_method_chk;
ALTER TABLE public.enforcement_actions DROP CONSTRAINT IF EXISTS case_reference_extraction_method_chk;

ALTER TABLE public.enforcement_actions
  ADD CONSTRAINT statutory_provisions_extraction_method_chk
    CHECK (statutory_provisions_extraction_method IN (
      'none','regex_high_confidence','regex_low_confidence','pattern_per_regulator','no_pattern_found',
      'candidate_unverified','source_extracted','source_extracted_verified','verification_failed','manual'
    )),
  ADD CONSTRAINT disposition_type_extraction_method_chk
    CHECK (disposition_type_extraction_method IN (
      'none','regex_high_confidence','regex_low_confidence','pattern_per_regulator','no_pattern_found',
      'candidate_unverified','source_extracted','source_extracted_verified','verification_failed','manual'
    )),
  ADD CONSTRAINT appeal_status_extraction_method_chk
    CHECK (appeal_status_extraction_method IN (
      'none','regex_high_confidence','regex_low_confidence','pattern_per_regulator','no_pattern_found',
      'candidate_unverified','source_extracted','source_extracted_verified','verification_failed','manual'
    )),
  ADD CONSTRAINT sector_extraction_method_chk
    CHECK (sector_extraction_method IN (
      'none','regex_high_confidence','regex_low_confidence','pattern_per_regulator','no_pattern_found',
      'candidate_unverified','source_extracted','source_extracted_verified','verification_failed','manual'
    )),
  ADD CONSTRAINT case_reference_extraction_method_chk
    CHECK (case_reference_extraction_method IN (
      'none','regex_high_confidence','regex_low_confidence','pattern_per_regulator','no_pattern_found',
      'candidate_unverified','source_extracted','source_extracted_verified','verification_failed','manual'
    ));

DROP INDEX IF EXISTS verification_results_latest_idx;
CREATE INDEX IF NOT EXISTS verification_results_latest_idx
  ON public.verification_results (enforcement_action_id, check_name, ran_at DESC);

-- ===== Block C: Demote Package 3 candidates + reset memo_eligible =====
UPDATE public.enforcement_actions
SET statutory_provisions_extraction_method = 'candidate_unverified'
WHERE statutory_provisions_extraction_method IN ('regex_high_confidence','regex_low_confidence','pattern_per_regulator');

UPDATE public.enforcement_actions
SET disposition_type_extraction_method = 'candidate_unverified'
WHERE disposition_type_extraction_method = 'regex_low_confidence';

UPDATE public.enforcement_actions
SET case_reference_extraction_method = 'candidate_unverified'
WHERE case_reference_extraction_method = 'regex_high_confidence';

UPDATE public.enforcement_actions
SET appeal_status_extraction_method = 'candidate_unverified'
WHERE appeal_status_extraction_method NOT IN ('none','no_pattern_found','candidate_unverified');

UPDATE public.enforcement_actions
SET sector_extraction_method = 'candidate_unverified'
WHERE sector_extraction_method NOT IN ('none','no_pattern_found','candidate_unverified');

UPDATE public.enforcement_actions
SET memo_eligible = false
WHERE memo_eligible IS DISTINCT FROM false;
