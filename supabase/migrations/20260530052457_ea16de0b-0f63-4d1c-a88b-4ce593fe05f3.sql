CREATE OR REPLACE FUNCTION public.admin_pending_fetch_counts()
RETURNS TABLE(source_database text, pending bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  RETURN QUERY
  SELECT COALESCE(ea.source_database, '(unlabeled)')::text AS source_database,
         COUNT(*)::bigint AS pending
  FROM public.enforcement_actions ea
  WHERE ea.primary_source_status = 'pending_fetch'
    AND ea.primary_source_url IS NOT NULL
  GROUP BY COALESCE(ea.source_database, '(unlabeled)')
  ORDER BY COUNT(*) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_pending_fetch_counts() TO authenticated;