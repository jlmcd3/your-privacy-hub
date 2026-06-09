
ALTER TABLE public.jurisdiction_requirements ADD COLUMN IF NOT EXISTS filing_steps jsonb;

DO $$
DECLARE
  r RECORD;
  steps jsonb;
  step_order int;
  fee_text text;
  step3_detail text;
  step3_url text;
  step6_detail text;
BEGIN
  FOR r IN SELECT * FROM public.jurisdiction_requirements LOOP
    steps := '[]'::jsonb;
    step_order := 1;

    -- Step 1: Prepare documents
    steps := steps || jsonb_build_array(jsonb_build_object(
      'order', step_order,
      'title', 'Prepare your documents',
      'detail', 'Complete all [bracketed placeholder] fields in the generated documents for ' || r.jurisdiction_name || '. Have them reviewed by your counsel or privacy professional.'
    ));
    step_order := step_order + 1;

    -- Step 2: Confirm with authority
    steps := steps || jsonb_build_array(
      CASE WHEN r.authority_url IS NOT NULL AND r.authority_url <> ''
        THEN jsonb_build_object(
          'order', step_order,
          'title', 'Confirm current requirements with the authority',
          'detail', 'Verify the current filing requirements with ' || COALESCE(r.authority_name, 'the supervisory authority') || '.',
          'url', r.authority_url
        )
        ELSE jsonb_build_object(
          'order', step_order,
          'title', 'Confirm current requirements with the authority',
          'detail', 'Verify the current filing requirements with ' || COALESCE(r.authority_name, 'the supervisory authority') || '.'
        )
      END
    );
    step_order := step_order + 1;

    -- Step 3: Complete filing process
    IF r.online_filing_available = true AND r.filing_portal_url IS NOT NULL AND r.filing_portal_url <> '' THEN
      step3_detail := 'File online via the authority''s portal.';
      step3_url := r.filing_portal_url;
    ELSE
      step3_detail := COALESCE(r.authority_name, 'The authority') || ' does not offer confirmed online filing — confirm the current submission method (post, email, or portal) with the authority before sending.';
      step3_url := r.authority_url;
    END IF;
    steps := steps || jsonb_build_array(
      CASE WHEN step3_url IS NOT NULL AND step3_url <> ''
        THEN jsonb_build_object('order', step_order, 'title', 'Complete the authority''s filing process', 'detail', step3_detail, 'url', step3_url)
        ELSE jsonb_build_object('order', step_order, 'title', 'Complete the authority''s filing process', 'detail', step3_detail)
      END
    );
    step_order := step_order + 1;

    -- Step 4: Fee
    IF r.filing_fee_cents IS NOT NULL AND r.filing_fee_cents > 0 THEN
      fee_text := trim(trailing '0' from trim(trailing '.' from round(r.filing_fee_cents / 100.0, 2)::text)) || ' ' || COALESCE(r.filing_currency, '');
      steps := steps || jsonb_build_array(jsonb_build_object(
        'order', step_order,
        'title', 'Pay the filing fee',
        'detail', 'Filing fee: ' || trim(fee_text) || '. Confirm the current amount with the authority before paying.'
      ));
      step_order := step_order + 1;
    END IF;

    -- Step 5: Language
    IF r.language_requirements IS NOT NULL AND array_length(r.language_requirements, 1) > 0 THEN
      steps := steps || jsonb_build_array(jsonb_build_object(
        'order', step_order,
        'title', 'Language requirements',
        'detail', 'Filings must be made in: ' || array_to_string(r.language_requirements, ', ') || '.'
      ));
      step_order := step_order + 1;
    END IF;

    -- Step 6: Renewal calendar
    IF r.renewal_period_months IS NOT NULL THEN
      step6_detail := 'This registration renews every ' || r.renewal_period_months || ' months. Calendar the renewal date now.';
    ELSE
      step6_detail := 'No periodic renewal is recorded for this jurisdiction — confirm with ' || COALESCE(r.authority_name, 'the authority') || ' and calendar any update obligations (for example, notifying personnel changes).';
    END IF;
    steps := steps || jsonb_build_array(jsonb_build_object(
      'order', step_order,
      'title', 'Calendar the renewal',
      'detail', step6_detail
    ));
    step_order := step_order + 1;

    -- Optional notes step
    IF r.notes IS NOT NULL AND r.notes <> '' THEN
      steps := steps || jsonb_build_array(jsonb_build_object(
        'order', step_order,
        'title', 'Jurisdiction notes',
        'detail', r.notes
      ));
    END IF;

    UPDATE public.jurisdiction_requirements
      SET filing_steps = steps,
          last_verified_at = now()
      WHERE jurisdiction_code = r.jurisdiction_code;
  END LOOP;
END $$;
