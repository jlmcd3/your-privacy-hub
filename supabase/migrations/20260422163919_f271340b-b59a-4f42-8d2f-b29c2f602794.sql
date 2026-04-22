UPDATE public.updates
SET summary = TRIM(BOTH ' .' FROM
  REGEXP_REPLACE(summary, '\s*The post\s+.*$', '', 'i')
)
WHERE summary ILIKE '%The post %appeared first on%'
   OR summary ILIKE '%The post U.S.%'
   OR summary ~* '\s*The post\s+[^.]*$';