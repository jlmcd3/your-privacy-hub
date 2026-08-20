ALTER TABLE public.cppa_assessments DROP CONSTRAINT cppa_assessments_module_check;

ALTER TABLE public.cppa_assessments ADD CONSTRAINT cppa_assessments_module_check
  CHECK (module = ANY (ARRAY['risk_assessment'::text, 'cybersecurity'::text, 'suite'::text, 'admt'::text, 'admt_v2'::text]));