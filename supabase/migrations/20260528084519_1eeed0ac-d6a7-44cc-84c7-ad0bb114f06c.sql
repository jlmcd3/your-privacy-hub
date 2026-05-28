ALTER TABLE public.enforcement_actions DROP CONSTRAINT IF EXISTS statutory_provisions_extraction_method_chk;
ALTER TABLE public.enforcement_actions ADD CONSTRAINT statutory_provisions_extraction_method_chk
  CHECK (statutory_provisions_extraction_method = ANY (ARRAY[
    'none','regex_high_confidence','regex_low_confidence',
    'pattern_per_regulator','pattern_per_regulator_verified',
    'pattern_per_regulator_verified_kcf_unverified',
    'no_pattern_found','candidate_unverified',
    'source_extracted','source_extracted_verified',
    'verification_failed','manual'
  ]));