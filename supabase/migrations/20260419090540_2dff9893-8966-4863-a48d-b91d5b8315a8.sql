
ALTER TABLE public.registration_documents
  DROP CONSTRAINT IF EXISTS registration_documents_unique_doc;

ALTER TABLE public.registration_documents
  ADD CONSTRAINT registration_documents_unique_doc
  UNIQUE (order_id, jurisdiction_code, document_type, version);
