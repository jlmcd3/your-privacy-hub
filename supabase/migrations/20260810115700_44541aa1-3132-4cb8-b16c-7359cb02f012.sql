UPDATE public.prose_document_plans
SET
  version = version + 1,
  library_schema_version = library_schema_version + 1,
  provenance = 'ADMT_Compliance_Assessment_Skeleton_v3_CORRECTED_2026-08-10.docx @ SO-2 — panel-delegated approval per CEO delegation 2026-08-06',
  content_hash = 'bf12a8bbd882465296823072f3a58c7aad2dfda0f35fdead65f433507ecf8088',
  approved = true,
  notes = COALESCE(notes, '') ||
    E'\nSO-2 (2026-08-10): superseded by the CEO-corrected v3 skeleton. The prior skeleton carried a {systemPurpose} slot with no live source (no system_purpose on the cppa-admt contract, none in the ADMTChecker submit payload, none in any persisted ADMT intake row); SO-2 stopped on it and the correction DROPS the slot — system_description carries that ground. Render law encoded at supabase/functions/_shared/prose/plans/cppa-admt.spine.ts with the slot map at cppa-admt.slotmap.ts. Encode version string: prose-plans-2026-08-10-item-so2.',
  plan = jsonb_set(
    COALESCE(plan, '{}'::jsonb),
    '{render_law}',
    jsonb_build_object(
      'module', 'supabase/functions/_shared/prose/plans/cppa-admt.spine.ts',
      'slot_map', 'supabase/functions/_shared/prose/plans/cppa-admt.slotmap.ts',
      'source_file', 'ADMT_Compliance_Assessment_Skeleton_v3_CORRECTED_2026-08-10.docx',
      'content_hash', 'bf12a8bbd882465296823072f3a58c7aad2dfda0f35fdead65f433507ecf8088',
      'encode_version', 'prose-plans-2026-08-10-item-so2',
      'sections', jsonb_build_array(
        'executive_summary','applicability','pre_use_notice','opt_out_appeal',
        'access_explanation','findings_actions','table_of_authorities'
      ),
      'item', 'SO-2',
      'stamp', 'admt-pipeline@item-so2-2026-08-10'
    ),
    true
  ),
  updated_at = now()
WHERE id = 'f59eb3b8-d747-4110-a3ab-0452e9cf92fd';