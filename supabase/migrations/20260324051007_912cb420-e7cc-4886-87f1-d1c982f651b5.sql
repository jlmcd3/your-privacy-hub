ALTER TABLE custom_briefs ADD COLUMN IF NOT EXISTS issue_tags jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brief_role text;