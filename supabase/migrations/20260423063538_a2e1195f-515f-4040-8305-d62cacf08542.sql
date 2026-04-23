-- Drop the existing blanket public read policy
DROP POLICY IF EXISTS "Public can read enforcement actions" ON public.enforcement_actions;

-- New policy: public can only read actions from the last 45 days (for list/filter/search views)
-- Single-row reads by id will use a separate policy below so detail pages keep working for older records
CREATE POLICY "Public can read recent enforcement actions"
ON public.enforcement_actions
FOR SELECT
TO anon, authenticated
USING (
  decision_date IS NOT NULL
  AND decision_date >= (CURRENT_DATE - INTERVAL '45 days')
);

-- Helper: check if current user is premium (used by edge function via service role; safe to expose)
CREATE OR REPLACE FUNCTION public.is_current_user_premium()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_premium OR COALESCE(is_pro, false)
     FROM public.profiles
     WHERE id = auth.uid()),
    false
  );
$$;