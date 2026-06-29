
-- biometric
UPDATE public.sample_reports s SET document_text = b.analysis_text, report_data = b.report_data
FROM public.biometric_assessments b
WHERE s.source_table='biometric_assessments' AND s.source_row_id=b.id
  AND (coalesce(s.document_text,'')='' OR s.report_data IS NULL);

-- ir-playbook
UPDATE public.sample_reports s SET document_text = ir.playbook_text, report_data = ir.report_data
FROM public.ir_playbooks ir
WHERE s.source_table='ir_playbooks' AND s.source_row_id=ir.id
  AND (coalesce(s.document_text,'')='' OR s.report_data IS NULL);

-- dpa
UPDATE public.sample_reports s SET document_text = d.document_text, report_data = d.report_data
FROM public.dpa_documents d
WHERE s.source_table='dpa_documents' AND s.source_row_id=d.id
  AND (coalesce(s.document_text,'')='' OR s.report_data IS NULL);

-- json-only sources (report_data only)
UPDATE public.sample_reports s SET report_data = x.report_data
FROM public.li_assessments x WHERE s.source_table='li_assessments' AND s.source_row_id=x.id AND s.report_data IS NULL;
UPDATE public.sample_reports s SET report_data = x.report_data
FROM public.dpia_frameworks x WHERE s.source_table='dpia_frameworks' AND s.source_row_id=x.id AND s.report_data IS NULL;
UPDATE public.sample_reports s SET report_data = x.report_data
FROM public.governance_assessments x WHERE s.source_table='governance_assessments' AND s.source_row_id=x.id AND s.report_data IS NULL;
UPDATE public.sample_reports s SET report_data = x.report_data
FROM public.cppa_assessments x WHERE s.source_table='cppa_assessments' AND s.source_row_id=x.id AND s.report_data IS NULL;
