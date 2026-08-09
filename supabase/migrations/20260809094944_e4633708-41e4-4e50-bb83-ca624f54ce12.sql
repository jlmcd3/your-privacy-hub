insert into public.quality_batch_runs (tools, batch_size, status, phase, created_by, fixture_variant)
select array['cppa-risk'], 1, 'running', 'kickoff', created_by, 'perfect'
from public.quality_batch_runs
order by started_at desc
limit 1;