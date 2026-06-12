
-- 1) Typo sweep across text + array fields
UPDATE public.enforcement_actions SET
  violation = regexp_replace(regexp_replace(violation, 'GPDR', 'GDPR', 'g'), 'GDRP', 'GDPR', 'g')
WHERE violation ~ 'GPDR|GDRP';

UPDATE public.enforcement_actions SET
  key_compliance_failure = regexp_replace(regexp_replace(key_compliance_failure, 'GPDR', 'GDPR', 'g'), 'GDRP', 'GDPR', 'g')
WHERE key_compliance_failure ~ 'GPDR|GDRP';

UPDATE public.enforcement_actions SET
  law = regexp_replace(regexp_replace(law, 'GPDR', 'GDPR', 'g'), 'GDRP', 'GDPR', 'g')
WHERE law ~ 'GPDR|GDRP';

UPDATE public.enforcement_actions SET
  preventive_measures = regexp_replace(regexp_replace(preventive_measures, 'GPDR', 'GDPR', 'g'), 'GDRP', 'GDPR', 'g')
WHERE preventive_measures ~ 'GPDR|GDRP';

UPDATE public.enforcement_actions SET
  statutory_provisions = ARRAY(
    SELECT regexp_replace(regexp_replace(x, 'GPDR', 'GDPR', 'g'), 'GDRP', 'GDPR', 'g')
    FROM unnest(statutory_provisions) AS x
  )
WHERE EXISTS (SELECT 1 FROM unnest(coalesce(statutory_provisions, ARRAY[]::text[])) y WHERE y ~ 'GPDR|GDRP');

UPDATE public.enforcement_actions SET
  provisions_normalized = ARRAY(
    SELECT regexp_replace(regexp_replace(x, 'GPDR', 'GDPR', 'g'), 'GDRP', 'GDPR', 'g')
    FROM unnest(provisions_normalized) AS x
  )
WHERE EXISTS (SELECT 1 FROM unnest(coalesce(provisions_normalized, ARRAY[]::text[])) y WHERE y ~ 'GPDR|GDRP');

-- 2) Fine verification gate
ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS fine_verified boolean NOT NULL DEFAULT true;

-- Flip the two known-unverified rows
UPDATE public.enforcement_actions SET fine_verified = false
WHERE id IN (
  '51a89bd9-7786-4edf-9be3-874482153740'::uuid,  -- Garante 2024 €85k failure-to-notify
  '9f3545ba-ae23-4bd9-bf37-a3c8b056280b'::uuid   -- UODO 2026 inadequate DPA notification
);
