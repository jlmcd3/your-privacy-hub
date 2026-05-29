ALTER TABLE updates
  ADD COLUMN IF NOT EXISTS enforcement_action_id uuid
  REFERENCES enforcement_actions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS updates_enforcement_action_id_idx
  ON updates(enforcement_action_id)
  WHERE enforcement_action_id IS NOT NULL;