DO $$
DECLARE
  col text;
BEGIN
  FOR col IN SELECT unnest(ARRAY[
    'appeal_status',
    'case_reference',
    'disposition_type',
    'sector',
    'statutory_provisions'
  ]) LOOP
    EXECUTE format(
      'ALTER TABLE public.enforcement_actions DROP CONSTRAINT IF EXISTS %I_extraction_method_chk',
      col
    );
    EXECUTE format(
      'ALTER TABLE public.enforcement_actions ADD CONSTRAINT %I_extraction_method_chk
       CHECK (%I_extraction_method = ANY (ARRAY[
         ''none'',
         ''regex_high_confidence'',
         ''regex_low_confidence'',
         ''pattern_per_regulator'',
         ''pattern_per_regulator_verified'',
         ''no_pattern_found'',
         ''candidate_unverified'',
         ''source_extracted'',
         ''source_extracted_verified'',
         ''verification_failed'',
         ''manual''
       ]))',
      col, col
    );
  END LOOP;
END $$;