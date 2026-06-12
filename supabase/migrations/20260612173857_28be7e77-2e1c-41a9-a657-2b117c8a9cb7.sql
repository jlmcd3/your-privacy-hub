
UPDATE public.enforcement_actions
SET disposition_type = 'proposed_fine_reported_to_police',
    disposition_type_extraction_method = 'manual'
WHERE regulator ILIKE '%Datatilsynet%'
  AND jurisdiction = 'Denmark'
  AND (disposition_type IS NULL OR disposition_type <> 'proposed_fine_reported_to_police');

INSERT INTO public.enforcement_actions (
  regulator, subject, jurisdiction, decision_date, fine_eur_equivalent,
  key_compliance_failure, preventive_measures, law, action_type,
  disposition_type, disposition_type_extraction_method, sector, fine_verified, source_database
)
SELECT
  'Multistate coalition (50 states + DC, co-led by Connecticut Attorney General)',
  'Marriott International / Starwood',
  'United States (multistate)',
  DATE '2024-10-09',
  47500000,
  'Failure to maintain reasonable security safeguards over Starwood guest reservation database (2014-2018 breach affecting ~131M US records). Settlement co-led by Connecticut, with a parallel FTC order. Total $52M across states.',
  'Implement and maintain a comprehensive information security program; consumer redress; offer impacted consumers seven years of credit monitoring; periodic third-party assessments.',
  'State UDAP / breach notification statutes',
  'multistate_settlement',
  'settled',
  'manual',
  'Hospitality',
  TRUE,
  'manual_round2_fix_2026_06'
WHERE NOT EXISTS (
  SELECT 1 FROM public.enforcement_actions
  WHERE subject ILIKE '%marriott%starwood%multistate%'
     OR (subject ILIKE '%marriott%' AND jurisdiction ILIKE '%multistate%')
);

INSERT INTO public.enforcement_actions (
  regulator, subject, jurisdiction, decision_date,
  key_compliance_failure, preventive_measures, law, action_type,
  disposition_type, disposition_type_extraction_method, sector, fine_verified, biometric_related, source_database, case_reference
)
SELECT
  'U.S. Court of Appeals for the Seventh Circuit',
  'Gregg v. Central Transport LLC (consolidated appeals)',
  'United States (federal — Seventh Circuit)',
  DATE '2026-04-01',
  'Resolved district-court split on retroactivity of Illinois P.A. 103-0769 (single-violation rule). Held the amendment applies retroactively to cases pending at enactment, limiting pre-amendment BIPA conduct to one recovery per person in federal court. Illinois state courts are not bound; Illinois Supreme Court has not ruled.',
  'Frame pre-amendment BIPA exposure as substantially reduced in federal court, with residual state-court uncertainty. Maintain standalone written-consent practices for biometric collection.',
  'BIPA (740 ILCS 14/20), as amended by P.A. 103-0769',
  'court_of_appeals_ruling',
  'court_decision',
  'manual',
  'Logistics / Transportation',
  TRUE,
  TRUE,
  'manual_round2_fix_2026_06',
  '7th Cir. consolidated appeals (April 1, 2026)'
WHERE NOT EXISTS (
  SELECT 1 FROM public.enforcement_actions
  WHERE subject ILIKE '%gregg%central transport%consolidated%'
     OR (regulator ILIKE '%Seventh Circuit%' AND subject ILIKE '%gregg%')
);
