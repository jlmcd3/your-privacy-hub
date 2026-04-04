ALTER TABLE updates
ADD COLUMN IF NOT EXISTS direct_jurisdictions text[],
ADD COLUMN IF NOT EXISTS affected_jurisdictions text[];