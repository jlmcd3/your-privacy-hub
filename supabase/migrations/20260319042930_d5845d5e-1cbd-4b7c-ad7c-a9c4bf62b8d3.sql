-- REC-19: Add cross_jurisdiction_patterns column and indexes for new ai_summary fields

ALTER TABLE weekly_briefs ADD COLUMN IF NOT EXISTS cross_jurisdiction_patterns text;

CREATE INDEX IF NOT EXISTS idx_updates_ai_summary_legal_weight ON updates ((ai_summary->>'legal_weight'));
CREATE INDEX IF NOT EXISTS idx_updates_ai_summary_source_strength ON updates ((ai_summary->>'source_strength'));