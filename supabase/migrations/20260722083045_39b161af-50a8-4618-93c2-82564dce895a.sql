
UPDATE public.quality_campaigns
SET
  wave_interval_minutes = 120,
  tool_state = (
    SELECT jsonb_object_agg(
      k,
      CASE
        WHEN jsonb_typeof(v) = 'object' THEN v || jsonb_build_object('max_runs', 6)
        ELSE v
      END
    )
    FROM jsonb_each(tool_state) AS t(k, v)
  ),
  updated_at = now()
WHERE id = 'fd1be147-2cee-4402-acfd-a63114b9a651';
