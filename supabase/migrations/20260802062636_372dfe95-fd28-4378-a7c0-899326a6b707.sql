CREATE TABLE IF NOT EXISTS public.corpus_refetch_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL,
  cohort text NOT NULL,
  batch_index integer,
  authority_class text,
  start_after_id text,
  last_id text,
  attempted integer NOT NULL DEFAULT 0,
  fetched_ok integer NOT NULL DEFAULT 0,
  fetch_failed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  per_domain_failures jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reasons jsonb NOT NULL DEFAULT '{}'::jsonb,
  halted_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.corpus_refetch_ledger TO service_role;
ALTER TABLE public.corpus_refetch_ledger ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS corpus_refetch_ledger_campaign_idx
  ON public.corpus_refetch_ledger (campaign_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.job_leases (
  lock_key text PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  holder text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.job_leases TO service_role;
ALTER TABLE public.job_leases ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_corpus_refetch_ledger_updated_at ON public.corpus_refetch_ledger;
CREATE TRIGGER update_corpus_refetch_ledger_updated_at
BEFORE UPDATE ON public.corpus_refetch_ledger
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_leases_updated_at ON public.job_leases;
CREATE TRIGGER update_job_leases_updated_at
BEFORE UPDATE ON public.job_leases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.try_acquire_job_lease(_key text, _seconds integer, _holder text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  INSERT INTO public.job_leases (lock_key, locked_until, holder)
  VALUES (_key, now() + make_interval(secs => _seconds), _holder)
  ON CONFLICT (lock_key) DO UPDATE
    SET locked_until = EXCLUDED.locked_until,
        holder = EXCLUDED.holder,
        updated_at = now()
    WHERE public.job_leases.locked_until < now()
  RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_acquire_job_lease(text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_acquire_job_lease(text, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.release_job_lease(_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.job_leases SET locked_until = now() - interval '1 second', updated_at = now() WHERE lock_key = _key;
$$;

REVOKE EXECUTE ON FUNCTION public.release_job_lease(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_job_lease(text) TO service_role;