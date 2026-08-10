insert into public.prose_document_plans (product, version, library_schema_version, approved, provenance, content_hash, plan, notes)
select 'ir-playbook', 2, library_schema_version, true,
  'Incident_Response_Playbook_Skeleton_v3_CORRECTED_2026-08-10.docx @ SO-7 — panel-delegated approval per CEO delegation 2026-08-06; SUPERSEDES row 797606ab-e2f7-4a2e-b631-dcc2bd3a3c43 (ir-playbook version 1, ITEM 414), which is retained and set approved=false with a pointer to this row.',
  '61bd929aa4061f32b0944722dd537db7f3c37676e21cf94098dadff526059789',
  plan || jsonb_build_object(
    'version', 'prose-plans-2026-08-10-item-so7',
    'skeleton', jsonb_build_object(
      'source_file', 'Incident_Response_Playbook_Skeleton_v3_CORRECTED_2026-08-10.docx',
      'paragraphs', 17,
      'content_hash', '61bd929aa4061f32b0944722dd537db7f3c37676e21cf94098dadff526059789',
      'original_hash', '3497e5085bf5151fc7802c502c4735d499d2d3cd51d2c7910c1c5035e95daea3',
      'spine', 'supabase/functions/_shared/prose/plans/ir-playbook.spine.ts',
      'slotmap', 'supabase/functions/_shared/prose/plans/ir-playbook.slotmap.ts',
      'assembler', 'supabase/functions/_shared/ltp/ir-skeleton-assemble.ts',
      'stamp', 'ir-pipeline@item-so7-2026-08-10',
      'retired_slots', jsonb_build_array('orgSize','incidentDescription','incidentStatus','incidentOwner','dataSubjectTypes','additionalContext','containmentActions','investigationStatus'),
      'new_slots', jsonb_build_array('containmentState')
    )
  ),
  'SO-7 encode. The corrected v3 skeleton is this product''s render law; the assembled document is written to report_data.skeleton_document.'
from public.prose_document_plans where id = '797606ab-e2f7-4a2e-b631-dcc2bd3a3c43';

update public.prose_document_plans
set approved = false,
    notes = coalesce(notes || ' ', '') || 'SUPERSEDED at SO-7 (2026-08-10) by the ir-playbook version 2 row pinned to the CEO-corrected v3 skeleton. Demoted to approved=false. RETAINED for audit, not deleted and not reused.'
where id = '797606ab-e2f7-4a2e-b631-dcc2bd3a3c43';