-- 1) Normalize any existing rows so the unique(lower(email)) index reflects stored data too
UPDATE public.email_signups
SET email = lower(btrim(email))
WHERE email IS DISTINCT FROM lower(btrim(email));

-- 2) Trigger function: normalize email on insert/update
CREATE OR REPLACE FUNCTION public.normalize_email_signup()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email = lower(btrim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Attach trigger (drop first so this migration is idempotent)
DROP TRIGGER IF EXISTS email_signups_normalize_email ON public.email_signups;
CREATE TRIGGER email_signups_normalize_email
BEFORE INSERT OR UPDATE OF email ON public.email_signups
FOR EACH ROW
EXECUTE FUNCTION public.normalize_email_signup();