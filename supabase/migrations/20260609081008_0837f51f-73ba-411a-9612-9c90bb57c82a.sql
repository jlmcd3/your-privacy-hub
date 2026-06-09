
CREATE TABLE public.cppa_drift_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES public.cppa_assessments(id) ON DELETE CASCADE,
  client_id uuid,
  module text NOT NULL DEFAULT 'cybersecurity',
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id)
);

GRANT SELECT, UPDATE ON public.cppa_drift_reminders TO authenticated;
GRANT ALL ON public.cppa_drift_reminders TO service_role;

ALTER TABLE public.cppa_drift_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own drift reminders"
  ON public.cppa_drift_reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users dismiss own drift reminders"
  ON public.cppa_drift_reminders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER cppa_drift_reminders_updated_at
  BEFORE UPDATE ON public.cppa_drift_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX cppa_drift_reminders_due_idx
  ON public.cppa_drift_reminders (scheduled_for)
  WHERE sent_at IS NULL AND dismissed_at IS NULL;

CREATE INDEX cppa_drift_reminders_user_idx
  ON public.cppa_drift_reminders (user_id, dismissed_at);

-- Trigger: schedule a drift reminder when a cybersecurity assessment completes.
CREATE OR REPLACE FUNCTION public.schedule_cppa_drift_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.module = 'cybersecurity'
     AND NEW.status = 'complete'
     AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.user_id IS NOT NULL
  THEN
    INSERT INTO public.cppa_drift_reminders (user_id, assessment_id, client_id, module, scheduled_for)
    VALUES (NEW.user_id, NEW.id, NEW.client_id, 'cybersecurity', NEW.created_at + interval '11 months')
    ON CONFLICT (assessment_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cppa_assessments_schedule_drift_reminder
  AFTER INSERT OR UPDATE OF status ON public.cppa_assessments
  FOR EACH ROW EXECUTE FUNCTION public.schedule_cppa_drift_reminder();
