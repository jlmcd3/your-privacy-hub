
-- Remove non-privacy noise previously ingested from the Federal Register.
-- Strategy: delete rows where neither title nor summary contains any of
-- our privacy / data / cybersecurity / AI topic keywords, OR where the
-- title clearly matches an exclusion pattern (meetings, PRA notices,
-- Medicaid/Medicare, FDA drug clearances, advisory committees, etc.).

WITH kw AS (
  SELECT unnest(ARRAY[
    'privacy','data protection','personal data','personal information',
    'data broker','artificial intelligence',' ai ','biometric',
    'facial recognition','consent','surveillance','cybersecurity',
    'cyber security','breach notification','data breach','children online',
    'childrens online','kids online','online safety','hipaa',
    'protected health information','glba','gramm-leach','coppa','ferpa',
    'safeguards rule','red flags rule','dark pattern','geolocation',
    'tracking technologies','identity theft','telemarketing','robocall',
    'tcpa','do not call','encryption','ransomware','incident reporting'
  ]) AS term
)
DELETE FROM public.updates u
WHERE u.source_name = 'Federal Register'
  AND (
    -- Hard-exclude obvious non-privacy notices regardless of keywords
    u.title ~* 'notice of (a |an )?(public |closed )?meeting'
    OR u.title ~* 'sunshine act meeting'
    OR u.title ~* 'advisory committee'
    OR u.title ~* 'information collection'
    OR u.title ~* 'paperwork reduction'
    OR u.title ~* 'medicaid|medicare|hospital inpatient|prospective payment'
    OR u.title ~* 'vaccine injury|clinical electronic|product-specific guidance'
    OR u.title ~* 'food and drug|new animal drug|infant formula|cigarette package'
    OR u.title ~* 'tropical disease|communicable disease|public health service act'
    OR u.title ~* 'patent term restoration'
    OR u.title ~* 'scientific review|national cancer institute|national institute on'
    OR u.title ~* 'notice of (a |an )?(available |job )?(position|opening|vacancy)'
    -- Or no privacy/data/AI/cyber keyword anywhere in title+summary
    OR NOT EXISTS (
      SELECT 1 FROM kw
      WHERE position(kw.term IN lower(coalesce(u.title,'') || ' ' || coalesce(u.summary,''))) > 0
    )
  );
