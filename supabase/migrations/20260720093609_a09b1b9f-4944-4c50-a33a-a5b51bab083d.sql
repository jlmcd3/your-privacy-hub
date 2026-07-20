
ALTER TABLE public.enforcement_actions
  DROP CONSTRAINT IF EXISTS case_reference_extraction_method_chk;

ALTER TABLE public.enforcement_actions
  ADD CONSTRAINT case_reference_extraction_method_chk
  CHECK (case_reference_extraction_method = ANY (ARRAY[
    'none','regex_high_confidence','regex_low_confidence',
    'pattern_per_regulator','pattern_per_regulator_verified',
    'no_pattern_found','candidate_unverified',
    'source_extracted','source_extracted_verified',
    'verification_failed','manual','register_deterministic'
  ]));
