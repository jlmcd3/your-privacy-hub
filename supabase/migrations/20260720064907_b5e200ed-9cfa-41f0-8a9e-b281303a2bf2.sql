
-- 1) Clear malformed subjects created by the earlier L4 SQL backfill
--    (fragmentary captures starting mid-sentence). Keep short lowercase
--    proper-name tokens like "mBank" or "iRobot" intact.
UPDATE public.enforcement_actions
SET subject = NULL
WHERE subject ~ '^[a-z]'
  AND length(subject) >= 20;

-- 2) Rebuild top_enforcement_signals on the latest weekly brief so the
--    Top 10 list shows only clean, entity-named actions.
WITH latest AS (
  SELECT id
  FROM public.weekly_briefs
  ORDER BY published_at DESC
  LIMIT 1
),
candidates AS (
  SELECT
    id, regulator, jurisdiction, subject,
    COALESCE(key_compliance_failure, violation) AS summary,
    CASE WHEN fine_eur_equivalent IS NOT NULL
         THEN '€' || to_char(fine_eur_equivalent, 'FM999,999,999,999') END AS fine,
    fine_eur_equivalent,
    decision_date, precedent_significance, industry_sector AS sector,
    COALESCE(violation_types, '{}') AS violation_types, source_url,
    (precedent_significance::float * 2)
      + GREATEST(0::float,
          (90 - LEAST(90, EXTRACT(EPOCH FROM (now() - decision_date::timestamp)) / 86400))::float / 90
        ) AS score
  FROM public.enforcement_actions
  WHERE enrichment_version = 1
    AND decision_date >= (current_date - INTERVAL '90 days')
    AND precedent_significance IS NOT NULL
    AND subject IS NOT NULL
  ORDER BY precedent_significance DESC, decision_date DESC
  LIMIT 40
),
top10 AS (
  SELECT * FROM candidates ORDER BY score DESC, decision_date DESC LIMIT 10
),
payload AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'regulator', regulator,
      'jurisdiction', jurisdiction,
      'subject', subject,
      'summary', summary,
      'fine', fine,
      'fine_eur_equivalent', fine_eur_equivalent,
      'decision_date', decision_date,
      'precedent_significance', precedent_significance,
      'sector', sector,
      'violation_types', to_jsonb(violation_types),
      'source_url', source_url
    )
    ORDER BY score DESC, decision_date DESC
  ) AS signals
  FROM top10
)
UPDATE public.weekly_briefs wb
SET top_enforcement_signals = payload.signals
FROM payload, latest
WHERE wb.id = latest.id;
