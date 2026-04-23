-- Recreate view with security_invoker so it respects caller's RLS
DROP VIEW IF EXISTS public.enforcement_actions_public;

CREATE VIEW public.enforcement_actions_public
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.enforcement_actions_public TO anon, authenticated;

-- Since security_invoker means the view respects the caller's RLS,
-- we need to allow public read of basic columns for ALL ages on the underlying table,
-- but column-level grants will limit what columns the public role can SELECT.
-- Approach: drop the date-restricted policy and replace with two policies:
--   1. Public read of all columns for last 45 days (for the merged Enforcement page)
--   2. Public read of basic columns for any age (for detail pages via the view)
-- Postgres column-level privileges enforce which columns the anon/authenticated roles can SELECT.

DROP POLICY IF EXISTS "Public can read recent enforcement actions" ON public.enforcement_actions;

-- Policy: anyone can read any enforcement action row (RLS allows all rows)
-- BUT column-level grants below will restrict non-recent rows to basic columns only via the view.
-- For the rich list page (last 45 days), the table is queried directly and gets all columns.
-- For older actions, only the view is queryable (column subset).
-- We enforce the 45-day window in application code + the edge function for premium archive.

-- Re-add a policy that allows public read but with a date filter for direct table access
CREATE POLICY "Public can read recent enforcement actions (table)"
ON public.enforcement_actions
FOR SELECT
TO anon, authenticated
USING (
  decision_date IS NOT NULL
  AND decision_date >= (CURRENT_DATE - INTERVAL '45 days')
);

-- Separate policy: allow single-row id lookups for older actions, but only via the view
-- (we accomplish this by allowing the SELECT and revoking direct table column access for older rows is not
-- straightforward in PG; instead, the view exposes only safe columns and we trust the view as the public surface.)
-- The view uses security_invoker=true, so the view's RLS check is the table's RLS.
-- Therefore we ALSO need a policy permitting reads when accessed via the view. Since RLS can't distinguish view vs table,
-- we simply allow public read of all rows AND restrict the view's columns. Anyone querying the table directly with
-- enriched columns is still blocked by the 45-day policy above (because policies are OR'd — wait, that allows everything).
--
-- Correction: multiple permissive policies are OR'd. So adding a wider policy here defeats the purpose.
-- Instead, we keep ONLY the 45-day policy on the table and create a security definer function for id lookups.

-- Drop the policy attempt above; we'll use a SECURITY DEFINER RPC for older detail pages instead
-- (the view alone won't work because security_invoker still enforces the 45-day RLS on older rows).

-- Create a SECURITY DEFINER function for safe single-id detail lookups (basic columns only, any age)
CREATE OR REPLACE FUNCTION public.get_enforcement_action_basic(_id uuid)
RETURNS TABLE (
  id uuid,
  etid text,
  regulator text,
  subject text,
  jurisdiction text,
  decision_date date,
  fine_amount text,
  fine_eur numeric,
  fine_eur_equivalent numeric,
  law text,
  violation text,
  source_url text,
  sector text,
  action_type text,
  source_database text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ea.id, ea.etid, ea.regulator, ea.subject, ea.jurisdiction, ea.decision_date,
    ea.fine_amount, ea.fine_eur, ea.fine_eur_equivalent, ea.law, ea.violation,
    ea.source_url, ea.sector, ea.action_type, ea.source_database, ea.created_at
  FROM public.enforcement_actions ea
  WHERE ea.id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.get_enforcement_action_basic(uuid) TO anon, authenticated;

-- Drop the unused view to keep things clean
DROP VIEW IF EXISTS public.enforcement_actions_public;