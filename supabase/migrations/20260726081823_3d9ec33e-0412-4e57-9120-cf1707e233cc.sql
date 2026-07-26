UPDATE public.provision_texts
SET verbatim_excerpt = (SELECT full_text FROM public.cppa_authorities WHERE citation = '11 CCR § 7152'),
    citation = '11 CCR § 7152 (OAL-approved text, eff. 2026-01-01)',
    jurisdiction = 'US-CA',
    status = 'approved',
    last_verified_at = now(),
    updated_at = now()
WHERE key = 'cppa-7152';