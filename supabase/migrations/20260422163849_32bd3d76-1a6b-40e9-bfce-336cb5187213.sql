UPDATE public.updates
SET summary = TRIM(BOTH ' .' FROM
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        summary,
        '\s*The post\s+.+?\s+appeared first on\s+.+?\.?\s*$',
        '',
        'i'
      ),
      '\s*(?:[…\.]{1,3}|\[\s*(?:…|\.{3})\s*\])?\s*(?:Continue\s+reading|Read\s+more|Read\s+the\s+full\s+(?:article|post)|Click\s+here\s+to\s+read\s+more)\s*(?:[→»>\.…]+)?\s*$',
      '',
      'i'
    ),
    '\[\s*(?:…|\.{3})\s*\]',
    '',
    'g'
  )
)
WHERE summary ~* '(continue reading|read more|read the full|appeared first on|\[\s*(…|\.{3})\s*\])';