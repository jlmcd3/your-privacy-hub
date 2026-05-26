DELETE FROM public.source_document_cache
WHERE source_url IN (
  SELECT source_url FROM public.enforcement_actions
  WHERE id IN (
    '007d52f3-fcb9-493a-8af6-05c9bb719525',
    '7959a847-7a08-4011-9e4a-b97cf4683d3a',
    'caefce52-2ddb-41d5-9e54-b28c3202ec5c',
    '5b4a5fcf-6bd2-4d7e-a2c4-24405b064617',
    'ed743116-ae2d-46ff-93c7-1ebe1980ce85',
    '55435dc2-93c2-4437-8d88-bc67c5d1c9b4'
  )
);