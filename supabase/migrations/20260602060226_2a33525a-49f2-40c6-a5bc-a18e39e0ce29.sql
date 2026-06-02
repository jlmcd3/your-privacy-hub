
INSERT INTO public.ropa_activity_templates
  (template_key, display_name, description, category, sector_tags, is_high_risk, is_public_facing, display_order, is_active)
VALUES
  ('patient_medical_records',
   'Patient medical records (EHR/EMR)',
   'Creating, maintaining, and accessing patient electronic health records, clinical notes, diagnoses, lab results, and treatment history.',
   'patient_records', ARRAY['Healthcare']::text[], true, false, 500, true),
  ('patient_appointments',
   'Patient appointment scheduling',
   'Booking, rescheduling, and reminders for patient appointments, including visit reason and provider assignment.',
   'patient_records', ARRAY['Healthcare']::text[], false, true, 510, true),
  ('patient_billing_insurance',
   'Patient billing & insurance claims',
   'Processing patient billing, co-pays, insurance eligibility verification, and claims submission to payers.',
   'patient_records', ARRAY['Healthcare']::text[], true, false, 520, true),
  ('patient_telehealth',
   'Telehealth consultations',
   'Conducting and recording virtual patient consultations, including video, audio, and chat-based clinical encounters.',
   'patient_records', ARRAY['Healthcare']::text[], true, false, 530, true),
  ('patient_clinical_research',
   'Clinical research & trials',
   'Recruiting patients for and conducting clinical studies, including consent, study data, and outcomes tracking.',
   'patient_records', ARRAY['Healthcare']::text[], true, false, 540, true),
  ('patient_communications',
   'Patient communications & portal',
   'Patient portal messaging, secure email, SMS reminders, and other direct communications with patients about their care.',
   'patient_records', ARRAY['Healthcare']::text[], false, true, 550, true)
ON CONFLICT (template_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sector_tags = EXCLUDED.sector_tags,
  is_high_risk = EXCLUDED.is_high_risk,
  is_public_facing = EXCLUDED.is_public_facing,
  display_order = EXCLUDED.display_order,
  is_active = true;
