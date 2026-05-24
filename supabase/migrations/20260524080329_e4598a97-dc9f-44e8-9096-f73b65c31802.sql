UPDATE public.updates
SET attention_level = CASE ai_summary->>'urgency'
  WHEN 'Immediate'    THEN 'High'
  WHEN 'This quarter' THEN 'Medium'
  WHEN 'Monitor'      THEN 'Low'
END
WHERE ai_summary->>'urgency' IN ('Immediate','This quarter','Monitor')
  AND attention_level IS DISTINCT FROM (CASE ai_summary->>'urgency'
    WHEN 'Immediate'    THEN 'High'
    WHEN 'This quarter' THEN 'Medium'
    WHEN 'Monitor'      THEN 'Low'
  END);