-- RC-B.1 advisory-register fix on dpia_frameworks 3ac4c884.
-- Rewrites the five previously-stored advisory_notes on that row to the
-- CEO-ratified single-sentence suggestive template ("If your organization
-- [can document / does] X, a reassessment covering it may be worth
-- considering, based on your counsel's advice."). Preserves fact_ref on
-- every note. Also writes an admin_action_log row documenting the fix.
--
-- NOTE: notes 3-5 originally shared fact_ref answered_item:dpia-data-categories-…;
-- the substantive contradiction content (genetic-marker mismatch, nationality
-- proxy) belongs in item_verdicts[].reason for the not_resolved item, not in
-- advisory. Rewrites route those to the suggestive register.

update dpia_frameworks
set report_data = jsonb_set(
  report_data,
  '{advisory_notes}',
  '[
    {
      "fact_ref": "answered_item:dpia-third-party-processors-gdpr-art-28-processor-ob",
      "text": "If your organization can document that Snowflake processing occurs exclusively within EEA data centres, a reassessment covering the transfer position may be worth considering, based on your counsel''s advice."
    },
    {
      "fact_ref": "answered_item:dpia-third-party-processors-gdpr-art-28-processor-ob",
      "text": "If your organization can document SendGrid''s EU–US Data Privacy Framework certification for the transactional email flow, a reassessment covering the Chapter V transfer basis may be worth considering, based on your counsel''s advice."
    },
    {
      "fact_ref": "answered_item:dpia-data-categories-gdpr-art-9-1-special-cat",
      "text": "If your organization can document whether genetic-marker processing has ceased or was mis-listed in intake, a reassessment covering the special-category scope may be worth considering, based on your counsel''s advice."
    },
    {
      "fact_ref": "answered_item:dpia-data-categories-gdpr-art-9-1-special-cat",
      "text": "If your organization can document a nationality-as-proxy-for-race assessment aligned with EDPB WP251 rev.01, a reassessment covering the Article 9 scope may be worth considering, based on your counsel''s advice."
    },
    {
      "fact_ref": "answered_item:dpia-data-categories-gdpr-art-9-1-special-cat",
      "text": "If your organization can document that inferred mental-health indicators from mood diaries are handled under the existing Article 9 health-data controls, a reassessment covering the classification may be worth considering, based on your counsel''s advice."
    }
  ]'::jsonb
),
updated_at = now()
where id = '3ac4c884-5d94-4e62-93d1-83f13351b0ef';

insert into admin_action_log (actor_user_id, action, target_table, target_id, payload, ok)
values (
  '02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122',
  'advisory_notes_rewrite_d8_and_register',
  'dpia_frameworks',
  '3ac4c884-5d94-4e62-93d1-83f13351b0ef',
  jsonb_build_object(
    'reason', 'RC-B.1 courier: D8 banned word ("gap") in note 1; five notes failed CEO advisory register (multi-sentence, contradiction-style). Rewritten to single suggestive sentence per note; fact_refs preserved.',
    'notes_before', 5,
    'notes_after', 5,
    'guard_updated', true
  ),
  true
);
