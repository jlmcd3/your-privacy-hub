ALTER TABLE updates ADD COLUMN IF NOT EXISTS entities jsonb;
ALTER TABLE updates ADD COLUMN IF NOT EXISTS defense_considerations text;
ALTER TABLE updates ADD COLUMN IF NOT EXISTS action_items jsonb;
-- key_date and regulatory_theory already exist per schema; using IF NOT EXISTS for safety
ALTER TABLE updates ADD COLUMN IF NOT EXISTS key_date date;
ALTER TABLE updates ADD COLUMN IF NOT EXISTS regulatory_theory text;

CREATE INDEX IF NOT EXISTS idx_updates_entities ON updates USING gin(entities);
CREATE INDEX IF NOT EXISTS idx_updates_key_date ON updates (key_date) WHERE key_date IS NOT NULL;