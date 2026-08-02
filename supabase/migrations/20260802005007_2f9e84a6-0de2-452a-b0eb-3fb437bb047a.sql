-- ITEM 360 — profiles column-level lockdown (Item 332 precedent).
REVOKE UPDATE ON public.profiles FROM anon, authenticated;

GRANT UPDATE (
  brief_role,
  digest_jurisdictions,
  digest_topics,
  jurisdictions,
  onboarding_complete,
  preferred_language,
  primary_jurisdiction,
  sector,
  updated_at
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

-- Self-declared role: still user-chosen, but the confirmation timestamp is
-- stamped server-side so it cannot be fabricated.
CREATE OR REPLACE FUNCTION public.set_self_declared_role(
  _role text,
  _primary_jurisdiction text DEFAULT NULL,
  _sector text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _role IS NOT NULL AND length(_role) > 120 THEN
    RAISE EXCEPTION 'role too long';
  END IF;
  UPDATE public.profiles
     SET user_role = COALESCE(NULLIF(_role, ''), user_role),
         primary_jurisdiction = COALESCE(NULLIF(_primary_jurisdiction, ''), primary_jurisdiction),
         sector = COALESCE(NULLIF(_sector, ''), sector),
         role_confirmed_at = now(),
         updated_at = now()
   WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_self_declared_role(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_self_declared_role(text, text, text) TO authenticated;

-- One-shot free biometric run claim; quota column stays service-role-only.
CREATE OR REPLACE FUNCTION public.claim_biometric_free_run()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claimed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  UPDATE public.profiles
     SET biometric_free_run_claimed = true,
         updated_at = now()
   WHERE id = auth.uid()
     AND COALESCE(biometric_free_run_claimed, false) = false
  RETURNING true INTO v_claimed;
  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_biometric_free_run() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_biometric_free_run() TO authenticated;