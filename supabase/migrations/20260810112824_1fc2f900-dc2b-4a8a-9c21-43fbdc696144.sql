update public.prose_document_plans
set plan = jsonb_set(
      jsonb_set(plan, '{version}', to_jsonb('prose-plans-2026-08-10-item-so1'::text), true),
      '{render_law}',
      jsonb_build_object(
        'source_file', 'CPPA_Risk_Assessment_Skeleton_v3.docx',
        'encode_module', 'supabase/functions/_shared/prose/plans/cppa-risk.spine.ts',
        'skeleton_content_hash', 'f0276a8e4768020169d08c28aba3b25d72327194804c1001d0c226b7501213a9',
        'sections', 10,
        'fixed_prose_blocks', 9,
        'protected', 'the skeleton fixed prose is splice-barred; only braced slots are mutable',
        'superseded_at', '2026-08-10',
        'approval_authority', 'panel-delegated approval per CEO delegation 2026-08-06'
      ), true),
    version = version + 1,
    provenance = 'CPPA_Risk_Assessment_Skeleton_v3.docx @ SO-1 — panel-delegated approval per CEO delegation 2026-08-06',
    content_hash = 'f0276a8e4768020169d08c28aba3b25d72327194804c1001d0c226b7501213a9',
    notes = 'SO-1: superseded by the CEO-ratified v3 counsel-register skeleton (2026-08-10 resupply, carrying the Section 7152(a)(7) correction). Render law now lives byte-pinned in cppa-risk.spine.ts; the sections array is retained unchanged for renderer stability.',
    updated_at = now()
where product = 'cppa-risk';