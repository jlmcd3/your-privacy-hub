ALTER TABLE public.edpb_guidelines
  ADD COLUMN IF NOT EXISTS endorsement_status text
  CHECK (endorsement_status IN ('edpb_adopted','wp29_endorsed_2018','wp29_not_endorsed','draft_consultation'));

UPDATE public.edpb_guidelines SET endorsement_status = 'draft_consultation' WHERE guideline_ref = 'EDPB Guidelines 1/2024';
UPDATE public.edpb_guidelines SET endorsement_status = 'wp29_endorsed_2018' WHERE guideline_ref IN ('WP248 rev.01','WP243 rev.01','WP260 rev.01');
UPDATE public.edpb_guidelines SET endorsement_status = 'edpb_adopted'
  WHERE guideline_ref IN ('EDPB Guidelines 2/2019','EDPB Guidelines 9/2022','EDPB Guidelines 07/2020','EDPB Guidelines 05/2020','EDPB Guidelines 3/2018','EDPB Recommendations 01/2020','EDPB Guidelines 01/2022');