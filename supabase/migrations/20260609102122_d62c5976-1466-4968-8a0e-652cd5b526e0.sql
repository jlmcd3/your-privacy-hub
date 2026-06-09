UPDATE public.user_watchlist
SET slug = CASE slug
  WHEN 'european-union' THEN 'eu-all'
  WHEN 'united-states'  THEN 'us-states'
  WHEN 'united-kingdom' THEN 'uk'
  WHEN 'australia'      THEN 'australia'
  WHEN 'india'          THEN 'india'
  ELSE slug
END,
label = CASE slug
  WHEN 'european-union' THEN 'EU (All Member States)'
  WHEN 'united-states'  THEN 'U.S. States (all)'
  WHEN 'united-kingdom' THEN 'United Kingdom'
  WHEN 'australia'      THEN 'Australia & NZ'
  WHEN 'india'          THEN 'India (DPDP Act)'
  ELSE label
END
WHERE type = 'jurisdiction'
  AND slug IN ('european-union','united-states','united-kingdom','australia','india');

-- Drop watchlist rows whose jurisdiction slug has no brief-preference equivalent
-- (France, China, Brazil) — these are not selectable in BriefPreferences and
-- would otherwise be orphaned. Users can re-pick a regional equivalent (EU, APAC, LATAM).
DELETE FROM public.user_watchlist
WHERE type = 'jurisdiction'
  AND slug IN ('france','china','brazil');