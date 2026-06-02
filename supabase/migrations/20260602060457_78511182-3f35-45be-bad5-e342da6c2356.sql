
ALTER TABLE public.ropa_processing_activities
  DROP CONSTRAINT IF EXISTS ropa_processing_activities_category_check;

ALTER TABLE public.ropa_processing_activities
  ADD CONSTRAINT ropa_processing_activities_category_check
  CHECK (category = ANY (ARRAY[
    'hr_employment','marketing','customer_service','patient_records',
    'technology','finance_legal','third_party','operations','other'
  ]));
