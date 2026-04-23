-- Public view exposing only basic, non-enriched columns for all enforcement actions
-- Used by detail pages so SEO/direct links keep working for older cases
CREATE OR REPLACE VIEW public.enforcement_actions_public
WITH (security_invoker = false) AS
SELECT
  id,
  etid,
  regulator,
  subject,
  jurisdiction,
  decision_date,
  fine_amount,
  fine_eur,
  fine_eur_equivalent,
  law,
  violation,
  source_url,
  sector,
  action_type,
  source_database,
  created_at
FROM public.enforcement_actions;

-- Grant read access
GRANT SELECT ON public.enforcement_actions_public TO anon, authenticated;