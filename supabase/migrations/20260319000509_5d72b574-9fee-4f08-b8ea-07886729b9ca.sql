
-- Add metadata columns to track generation quality
ALTER TABLE custom_briefs
  ADD COLUMN IF NOT EXISTS articles_used integer,
  ADD COLUMN IF NOT EXISTS generation_model text,
  ADD COLUMN IF NOT EXISTS verification_result jsonb;

-- Index for faster custom brief lookups
CREATE INDEX IF NOT EXISTS idx_custom_briefs_user_generated
  ON custom_briefs(user_id, generated_at DESC);

-- Index for faster enforcement history queries
CREATE INDEX IF NOT EXISTS idx_weekly_briefs_published
  ON weekly_briefs(published_at DESC);
