
-- 1. Questionnaire versions
CREATE TABLE IF NOT EXISTS public.questionnaire_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT false,
  schema jsonb NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.questionnaire_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read questionnaire versions"
  ON public.questionnaire_versions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Renewal opt-out + delivery on registration_orders
ALTER TABLE public.registration_orders
  ADD COLUMN IF NOT EXISTS renewal_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS renewal_reminder_email text,
  ADD COLUMN IF NOT EXISTS delivery_email text,
  ADD COLUMN IF NOT EXISTS delivery_sent_at timestamptz;

-- 3. Allow users to update their own orders (opt-out toggle, delivery email)
CREATE POLICY "Users update own orders limited"
  ON public.registration_orders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
