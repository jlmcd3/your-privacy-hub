
CREATE OR REPLACE FUNCTION public.get_portfolio_summary(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow callers to read their own portfolio.
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  WITH my_clients AS (
    SELECT id, name, sector
    FROM public.clients
    WHERE user_id = _user_id
  ),
  lia AS (
    SELECT client_id, count(*)::int AS n
    FROM public.li_assessments
    WHERE client_id IN (SELECT id FROM my_clients)
    GROUP BY client_id
  ),
  dpia AS (
    SELECT client_id, count(*)::int AS n
    FROM public.dpia_frameworks
    WHERE client_id IN (SELECT id FROM my_clients)
    GROUP BY client_id
  ),
  dpa AS (
    SELECT client_id, count(*)::int AS n
    FROM public.dpa_documents
    WHERE client_id IN (SELECT id FROM my_clients)
    GROUP BY client_id
  ),
  ir AS (
    SELECT client_id, count(*)::int AS n
    FROM public.ir_playbooks
    WHERE client_id IN (SELECT id FROM my_clients)
    GROUP BY client_id
  ),
  gov AS (
    SELECT client_id, count(*)::int AS n
    FROM public.governance_assessments
    WHERE client_id IN (SELECT id FROM my_clients)
    GROUP BY client_id
  ),
  bio AS (
    SELECT client_id, count(*)::int AS n
    FROM public.biometric_assessments
    WHERE client_id IN (SELECT id FROM my_clients)
    GROUP BY client_id
  ),
  reg AS (
    SELECT client_id, count(*)::int AS n
    FROM public.registration_orders
    WHERE client_id IN (SELECT id FROM my_clients)
    GROUP BY client_id
  ),
  ropa_latest AS (
    SELECT DISTINCT ON (s.client_id)
      s.client_id,
      v.version_number AS latest_version,
      v.created_at AS latest_date
    FROM public.ropa_sessions s
    JOIN public.ropa_document_versions v ON v.session_id = s.id
    WHERE s.client_id IN (SELECT id FROM my_clients)
    ORDER BY s.client_id, v.created_at DESC
  ),
  us_latest AS (
    SELECT DISTINCT ON (client_id) id, client_id, completed_at
    FROM public.us_notice_sessions
    WHERE client_id IN (SELECT id FROM my_clients)
      AND completed_at IS NOT NULL
    ORDER BY client_id, completed_at DESC
  ),
  us_states AS (
    SELECT u.client_id, u.completed_at AS latest_date, count(sel.id)::int AS state_count
    FROM us_latest u
    LEFT JOIN public.us_notice_state_selections sel ON sel.session_id = u.id
    GROUP BY u.client_id, u.completed_at
  ),
  eu AS (
    SELECT
      client_id,
      array_agg(DISTINCT framework_code ORDER BY framework_code) AS frameworks,
      max(generated_at) AS latest_date,
      min(generated_at) AS earliest_date
    FROM public.eu_notice_documents
    WHERE client_id IN (SELECT id FROM my_clients)
      AND is_current = true
      AND is_combined = false
    GROUP BY client_id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'client_id', c.id,
      'name', c.name,
      'sector', c.sector,
      'lia_count', coalesce(lia.n, 0),
      'dpia_count', coalesce(dpia.n, 0),
      'dpa_count', coalesce(dpa.n, 0),
      'ir_count', coalesce(ir.n, 0),
      'gov_count', coalesce(gov.n, 0),
      'biometric_count', coalesce(bio.n, 0),
      'registration_count', coalesce(reg.n, 0),
      'ropa', jsonb_build_object(
        'latest_version', ropa_latest.latest_version,
        'latest_date', ropa_latest.latest_date
      ),
      'us_notices', jsonb_build_object(
        'state_count', coalesce(us_states.state_count, 0),
        'latest_date', us_states.latest_date
      ),
      'eu_notices', jsonb_build_object(
        'frameworks', coalesce(eu.frameworks, ARRAY[]::text[]),
        'latest_date', eu.latest_date,
        'earliest_date', eu.earliest_date
      )
    )
    ORDER BY c.name
  )
  INTO result
  FROM my_clients c
  LEFT JOIN lia ON lia.client_id = c.id
  LEFT JOIN dpia ON dpia.client_id = c.id
  LEFT JOIN dpa ON dpa.client_id = c.id
  LEFT JOIN ir ON ir.client_id = c.id
  LEFT JOIN gov ON gov.client_id = c.id
  LEFT JOIN bio ON bio.client_id = c.id
  LEFT JOIN reg ON reg.client_id = c.id
  LEFT JOIN ropa_latest ON ropa_latest.client_id = c.id
  LEFT JOIN us_states ON us_states.client_id = c.id
  LEFT JOIN eu ON eu.client_id = c.id;

  RETURN coalesce(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_portfolio_summary(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_portfolio_summary(uuid) FROM anon;
