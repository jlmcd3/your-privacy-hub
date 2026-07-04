-- Restore damaged risk_assessment rows from tool_run_versions.
-- Scope: only rows whose report_data.error matches the exact ReferenceError,
-- joined per-id to their most recent retained version.
WITH latest_versions AS (
  SELECT DISTINCT ON (assessment_id) assessment_id, report_data
  FROM public.tool_run_versions
  WHERE tool_type = 'cppa_risk_assessment'
  ORDER BY assessment_id, created_at DESC
)
UPDATE public.cppa_assessments a
SET status = 'complete',
    report_data = v.report_data,
    updated_at = now()
FROM latest_versions v
WHERE a.id = v.assessment_id
  AND a.module = 'risk_assessment'
  AND a.status = 'error'
  AND a.report_data->>'error' LIKE '%authorities is not defined%';