UPDATE public.jurisdiction_requirements
SET
  notes = 'Annual ICO data protection fee (from April 2023): Tier 1 £55 (micro/small, ≤250 employees, turnover ≤£36M), Tier 2 £165 (medium), Tier 3 £3,400 (large, 251+ employees or turnover >£36M). Confirm current tier at https://ico.org.uk/for-organisations/paying-the-data-protection-fee/ — default Tier 1 for most SMEs.',
  last_verified_at = now()
WHERE jurisdiction_code = 'UK';