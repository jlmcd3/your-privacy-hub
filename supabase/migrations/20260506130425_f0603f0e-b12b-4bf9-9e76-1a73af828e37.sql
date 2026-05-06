-- 1. Column + constraint
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS clients_one_personal_per_owner
  ON public.clients (owner_id)
  WHERE is_personal = true;

-- 2. Update new-user trigger to seed a personal workspace
CREATE OR REPLACE FUNCTION public.handle_new_user_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.clients (owner_id, name, is_personal)
  VALUES (NEW.id, 'My Workspace', true);
  RETURN NEW;
END;
$function$;

-- 3. Backfill: mark each owner's earliest client row as personal
WITH first_rows AS (
  SELECT DISTINCT ON (owner_id) id
  FROM public.clients
  ORDER BY owner_id, created_at ASC
)
UPDATE public.clients c
SET is_personal = true
FROM first_rows
WHERE c.id = first_rows.id
  AND c.is_personal = false
  AND NOT EXISTS (
    SELECT 1 FROM public.clients c2
    WHERE c2.owner_id = c.owner_id AND c2.is_personal = true
  );

-- 4. Prevent deletion of the personal workspace row
CREATE OR REPLACE FUNCTION public.prevent_personal_client_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_personal THEN
    RAISE EXCEPTION 'Cannot delete personal workspace';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS clients_block_personal_delete ON public.clients;
CREATE TRIGGER clients_block_personal_delete
  BEFORE DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.prevent_personal_client_delete();
