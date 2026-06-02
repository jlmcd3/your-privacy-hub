
-- Remove duplicate activities (keep the earliest created per session+template_key)
WITH dupes AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY session_id, template_key
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.ropa_processing_activities
  WHERE template_key IS NOT NULL
)
DELETE FROM public.ropa_processing_activities a
USING dupes d
WHERE a.id = d.id AND d.rn > 1;

-- Prevent future duplicates per session
CREATE UNIQUE INDEX IF NOT EXISTS ropa_activities_session_template_uniq
  ON public.ropa_processing_activities (session_id, template_key)
  WHERE template_key IS NOT NULL;
