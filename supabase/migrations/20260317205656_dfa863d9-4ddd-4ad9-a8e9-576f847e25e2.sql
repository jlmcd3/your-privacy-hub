
-- User brief preferences
CREATE TABLE IF NOT EXISTS public.user_brief_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  industries text[] DEFAULT '{}',
  jurisdictions text[] DEFAULT '{}',
  topics text[] DEFAULT '{}',
  format text DEFAULT 'full',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_brief_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences"
  ON public.user_brief_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Custom brief outputs (one per user per week)
CREATE TABLE IF NOT EXISTS public.custom_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_brief_id uuid REFERENCES public.weekly_briefs(id),
  week_label text NOT NULL,
  custom_sections jsonb NOT NULL DEFAULT '{}',
  preferences_snapshot jsonb,
  generated_at timestamptz DEFAULT now()
);
ALTER TABLE public.custom_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own custom briefs"
  ON public.custom_briefs FOR SELECT
  USING (auth.uid() = user_id);

-- Add is_pro and stripe_price_id columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_price_id text;
