ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ask_privacy_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ask_privacy_reset_date date DEFAULT CURRENT_DATE;