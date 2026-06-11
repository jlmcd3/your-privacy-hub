CREATE OR REPLACE FUNCTION public.normalize_provisions(provs text[])
RETURNS text[] LANGUAGE sql IMMUTABLE AS $fn$
  SELECT COALESCE(array_agg(DISTINCT k ORDER BY k), '{}')
  FROM (
    SELECT lower(regexp_replace(trim(m[1]), '\s+', '-', 'g')) || ':' || regexp_replace(trim(m[2]), '\s+', '', 'g') AS k
    FROM unnest(provs) AS p,
         LATERAL regexp_matches(p, '^(.*?)\s+Article\s+(.+)$', 'i') AS m
    UNION
    SELECT lower(regexp_replace(trim(m[1]), '\s+', '-', 'g')) || ':' || split_part(regexp_replace(trim(m[2]), '\s+', '', 'g'), '(', 1) AS k
    FROM unnest(provs) AS p,
         LATERAL regexp_matches(p, '^(.*?)\s+Article\s+(.+)$', 'i') AS m
  ) keys
  WHERE k IS NOT NULL AND length(k) > 2;
$fn$;

ALTER TABLE public.enforcement_actions ADD COLUMN IF NOT EXISTS provisions_normalized text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_enforcement_provisions_normalized ON public.enforcement_actions USING gin (provisions_normalized);

CREATE OR REPLACE FUNCTION public.sync_provisions_normalized()
RETURNS trigger LANGUAGE plpgsql AS $tg$
BEGIN
  NEW.provisions_normalized := public.normalize_provisions(COALESCE(NEW.statutory_provisions, '{}'));
  RETURN NEW;
END;
$tg$;

DROP TRIGGER IF EXISTS trg_sync_provisions_normalized ON public.enforcement_actions;
CREATE TRIGGER trg_sync_provisions_normalized
  BEFORE INSERT OR UPDATE OF statutory_provisions ON public.enforcement_actions
  FOR EACH ROW EXECUTE FUNCTION public.sync_provisions_normalized();

UPDATE public.enforcement_actions
SET provisions_normalized = public.normalize_provisions(statutory_provisions)
WHERE COALESCE(array_length(statutory_provisions, 1), 0) > 0;