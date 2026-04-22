
UPDATE public.updates
SET summary = (
  WITH s0 AS (
    SELECT
      -- Decode common HTML entities
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(summary, '&nbsp;', ' ', 'gi'),
                  '&amp;', '&', 'gi'),
                '&quot;', '"', 'gi'),
              '&#39;|&apos;', '''', 'gi'),
            '&lt;', '<', 'gi'),
          '&gt;', '>', 'gi'),
        '&hellip;', '…', 'gi') AS t
  ),
  s1 AS (
    SELECT
      -- Smart quotes / dashes
      regexp_replace(
        regexp_replace(
          regexp_replace(t, '[\u2018\u2019]', '''', 'g'),
          '[\u201C\u201D]', '"', 'g'),
        '[\u2013\u2014]', '—', 'g') AS t
    FROM s0
  ),
  s2 AS (
    SELECT
      -- Collapse whitespace, fix punctuation spacing, collapse repeats
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(t, '\s+', ' ', 'g'),
              '\s+([.,;:!?])', '\1', 'g'),
            '([.,;:!?])([A-Za-z])', '\1 \2', 'g'),
          '([,;:!?])\1+', '\1', 'g'),
        '\.{4,}', '…', 'g') AS t
    FROM s1
  ),
  s3 AS (
    SELECT trim(regexp_replace(t, '[\s,;:\-—–]+$', '', 'g')) AS t FROM s2
  ),
  s4 AS (
    SELECT
      CASE
        WHEN length(t) = 0 THEN t
        WHEN substring(t from 1 for 1) ~ '[a-z]'
          THEN upper(substring(t from 1 for 1)) || substring(t from 2)
        ELSE t
      END AS t
    FROM s3
  )
  SELECT
    CASE
      WHEN length(t) = 0 THEN t
      WHEN t ~ '[.!?…]$' THEN t
      ELSE t || '.'
    END
  FROM s4
)
WHERE summary IS NOT NULL
  AND length(trim(summary)) > 0
  AND (
    summary ~ '\s+[.,;:!?]'         -- space before punctuation
    OR summary ~ '[.!?]{2,}'        -- repeated end punctuation
    OR summary ~ '[,;:]{2,}'        -- repeated middle punctuation
    OR summary ~ '\.{4,}'           -- 4+ dots
    OR summary ~ '\s{2,}'           -- double spaces
    OR summary !~ '[.!?…]$'         -- missing terminal punctuation
    OR substring(summary from 1 for 1) ~ '[a-z]'  -- lowercase first letter
    OR summary ~ '&(nbsp|amp|quot|#39|apos|lt|gt|hellip);'
    OR summary ~ '[\u2018\u2019\u201C\u201D\u2013\u2014]'
  );
