
-- Improved provision normalizer: handles Article, Art., Art, "cikk" (HU),
-- and bidirectional law-name placement (e.g. "GDPR Article 6" OR "Article 6 GDPR").
CREATE OR REPLACE FUNCTION public.normalize_provisions(provs text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $function$
  WITH raw AS (
    SELECT lower(coalesce(p,'')) AS p_lc, p AS p_orig
    FROM unnest(coalesce(provs, '{}'::text[])) AS p
  ),
  matches AS (
    -- Pattern A: "<law> Article|Art.? <num>(...)"  e.g. "GDPR Article 6(1)(f)"
    SELECT
      regexp_replace(trim(m[1]), '\s+', '-', 'g') AS law_raw,
      regexp_replace(trim(m[2]), '\s+', '', 'g') AS art_raw
    FROM raw,
         LATERAL regexp_matches(p_lc, '^(.*?)\s+(?:article|art\.?)\s+([0-9a-z\-]+(?:\([^)]+\))*)', 'i') AS m
    UNION ALL
    -- Pattern B: "Article|Art.? <num> ... <law>"  e.g. "Article 6 GDPR"
    SELECT
      regexp_replace(trim(m[2]), '\s+', '-', 'g') AS law_raw,
      regexp_replace(trim(m[1]), '\s+', '', 'g') AS art_raw
    FROM raw,
         LATERAL regexp_matches(p_lc, '(?:article|art\.?)\s+([0-9a-z\-]+(?:\([^)]+\))*)\s+(?:of\s+the\s+)?(gdpr|uk\s*gdpr|lopdgdd|bdsg|codice\s+privacy|dpa\s*2018|ccpa|cpra|pecr)', 'i') AS m
    UNION ALL
    -- Pattern C: Hungarian "<law> N. cikk" (cikk = article)
    SELECT
      regexp_replace(trim(m[1]), '\s+', '-', 'g') AS law_raw,
      regexp_replace(trim(m[2]), '\s+', '', 'g') AS art_raw
    FROM raw,
         LATERAL regexp_matches(p_lc, '^(gdpr|uk\s*gdpr)\s+([0-9]+(?:\([^)]+\))*)\.\s*cikk', 'i') AS m
  ),
  -- Canonicalise law tokens (whitespace already stripped to dashes above)
  canon AS (
    SELECT
      CASE
        WHEN law_raw ~ '^uk[- ]?gdpr$' THEN 'uk-gdpr'
        WHEN law_raw = 'gdpr' THEN 'gdpr'
        WHEN law_raw = 'lopdgdd' THEN 'lopdgdd'
        WHEN law_raw = 'bdsg' THEN 'bdsg'
        WHEN law_raw ~ 'codice' THEN 'codice-privacy'
        WHEN law_raw ~ 'dpa' THEN 'dpa-2018'
        WHEN law_raw = 'ccpa' THEN 'ccpa'
        WHEN law_raw = 'cpra' THEN 'cpra'
        WHEN law_raw = 'pecr' THEN 'pecr'
        ELSE law_raw
      END AS law_k,
      art_raw
    FROM matches
    WHERE law_raw IS NOT NULL AND art_raw IS NOT NULL AND length(art_raw) > 0
  ),
  expanded AS (
    -- Emit both the full key (with sub-paragraphs) and the base article key
    SELECT law_k || ':' || art_raw AS k FROM canon
    UNION
    SELECT law_k || ':' || split_part(art_raw, '(', 1) AS k FROM canon
  )
  SELECT COALESCE(array_agg(DISTINCT k ORDER BY k), '{}')
  FROM expanded
  WHERE k IS NOT NULL AND length(k) > 2;
$function$;

-- Backfill: re-sync provisions_normalized for every row by re-running the trigger.
-- The sync_provisions_normalized BEFORE-UPDATE trigger does the work.
UPDATE public.enforcement_actions
SET statutory_provisions = statutory_provisions
WHERE statutory_provisions IS NOT NULL;

-- Invalidate the enforcement context cache so the next LIA/DPIA query reflects
-- both the new regime/jurisdiction gates and the backfilled normalisations.
DELETE FROM public.enforcement_context_cache;
