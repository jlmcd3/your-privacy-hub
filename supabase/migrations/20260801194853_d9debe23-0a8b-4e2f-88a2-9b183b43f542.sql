insert into public.static_stress_batches (id, run_by, status, industries, geo_filter, total_jobs, completed_jobs, failed_jobs, started_at, setup_total, setup_done, selected_tools)
values ('a3490000-0000-4000-8000-000000000349', '1aebbff1-56b5-48e6-9d70-49276e56a2ec', 'running', array['tech'], 'us', 2, 0, 0, now(), 2, 2, array['cppa-risk']);

insert into public.static_stress_jobs (id, batch_id, company_id, company_name, industry, geo, tool_slug, status, fixture_data)
select 'a3490000-0000-4000-8000-000000000001', 'a3490000-0000-4000-8000-000000000349', 'item349-perfect', coalesce(intake_data->>'entity_name','Item349 Perfect'), 'tech', 'us', 'cppa-risk', 'pending', intake_data
from public.cppa_assessments where id = 'ea3d7354-43b4-4688-b2d5-fb569578e7b3';

insert into public.static_stress_jobs (id, batch_id, company_id, company_name, industry, geo, tool_slug, status, fixture_data)
select 'a3490000-0000-4000-8000-000000000002', 'a3490000-0000-4000-8000-000000000349', 'item349-messy', coalesce(intake_data->>'entity_name','Item349 Messy'), 'tech', 'us', 'cppa-risk', 'pending', intake_data
from public.cppa_assessments where id = '885cab1d-7369-446e-a3aa-5cc546d462c6';