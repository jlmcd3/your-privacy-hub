-- Free tool run tracking for paid subscribers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_tool_run_used_this_month boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_tool_run_reset_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'intelligence', 'professional')),
  ADD COLUMN IF NOT EXISTS stripe_trial_end timestamptz;

-- Professional client workspace
CREATE TABLE IF NOT EXISTS public.professional_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_matter text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.professional_clients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='professional_clients' AND policyname='Users manage own clients'
  ) THEN
    CREATE POLICY "Users manage own clients"
      ON public.professional_clients FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_sub_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_pro_clients_user ON public.professional_clients(user_id);