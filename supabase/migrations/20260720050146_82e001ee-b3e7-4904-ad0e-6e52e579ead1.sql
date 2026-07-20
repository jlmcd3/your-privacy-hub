CREATE TABLE public.purchase_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL UNIQUE,
  plan text,
  amount_cents integer,
  currency text,
  verified_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.purchase_ledger TO authenticated;
GRANT ALL ON public.purchase_ledger TO service_role;

ALTER TABLE public.purchase_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ledger read"
  ON public.purchase_ledger
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_purchase_ledger_user ON public.purchase_ledger(user_id, verified_at DESC);