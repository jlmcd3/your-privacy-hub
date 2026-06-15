UPDATE cppa_fsor_commentary
SET source_url = REPLACE(
  source_url,
  'ccpa_updates_cyber_risk_admt_fsor.pdf',
  'ccpa_updates_cyber_risk_admt_fsor_and_uid.pdf'
)
WHERE source_url LIKE '%ccpa_updates_cyber_risk_admt_fsor.pdf'
  AND source_url NOT LIKE '%fsor_and_uid%';