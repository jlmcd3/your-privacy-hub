DROP POLICY IF EXISTS "Public can read recent enforcement actions (table)" ON public.enforcement_actions;

CREATE POLICY "Public can read recent enforcement actions (table)"
ON public.enforcement_actions
FOR SELECT
TO anon, authenticated
USING (
  decision_date IS NOT NULL
  AND decision_date >= (CURRENT_DATE - INTERVAL '60 days')
);