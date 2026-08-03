WITH c AS (
  SELECT id,
         rtrim(regexp_replace(split_part(source_url, '/decyzje/', 2), '[^A-Za-z0-9.]', '', 'g'), '.') AS ref
  FROM public.enforcement_actions
  WHERE source_url ~ 'uodo\.gov\.pl/decyzje/'
), m AS (
  SELECT id,
         reverse(split_part(reverse(ref), '.', 1)) AS yr,
         lower(replace(left(ref, length(ref) - length(reverse(split_part(reverse(ref), '.', 1))) - 1), '.', '_')) AS slug
  FROM c
)
UPDATE public.enforcement_actions e
SET source_url = 'https://orzeczenia.uodo.gov.pl/document/urn:ndoc:gov:pl:uodo:' || m.yr || ':' || m.slug || '/content',
    refetch_attempts = 0,
    refetch_last_error = NULL,
    source_type = 'regulator_primary'
FROM m
WHERE e.id = m.id
  AND m.yr ~ '^[0-9]{4}$'
  AND m.slug <> '';