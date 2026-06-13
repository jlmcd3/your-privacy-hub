
-- Batches
create table public.static_stress_batches (
  id uuid primary key default gen_random_uuid(),
  run_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  industries text[] not null default '{}',
  geo_filter text not null default 'all',
  total_jobs integer not null default 0,
  completed_jobs integer not null default 0,
  failed_jobs integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_log text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.static_stress_batches to authenticated;
grant all on public.static_stress_batches to service_role;

alter table public.static_stress_batches enable row level security;

create policy "Admins manage stress batches"
  on public.static_stress_batches for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Jobs
create table public.static_stress_jobs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.static_stress_batches(id) on delete cascade,
  company_id text not null,
  company_name text not null,
  industry text not null,
  geo text not null,
  tool_slug text not null,
  status text not null default 'pending',
  fixture_data jsonb,
  source_table text,
  source_row_id text,
  pdf_path text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.static_stress_jobs to authenticated;
grant all on public.static_stress_jobs to service_role;

alter table public.static_stress_jobs enable row level security;

create policy "Admins manage stress jobs"
  on public.static_stress_jobs for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index static_stress_jobs_batch_status on public.static_stress_jobs(batch_id, status);
create index static_stress_jobs_batch_id on public.static_stress_jobs(batch_id);

-- Progress RPCs
create or replace function public.increment_batch_completed(batch_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.static_stress_batches
  set completed_jobs = completed_jobs + 1,
      status = case when completed_jobs + 1 + failed_jobs >= total_jobs then 'complete' else 'running' end,
      completed_at = case when completed_jobs + 1 + failed_jobs >= total_jobs then now() else null end
  where id = batch_id;
$$;

create or replace function public.increment_batch_failed(batch_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.static_stress_batches
  set failed_jobs = failed_jobs + 1,
      status = case when completed_jobs + failed_jobs + 1 >= total_jobs then 'complete' else 'running' end,
      completed_at = case when completed_jobs + failed_jobs + 1 >= total_jobs then now() else null end
  where id = batch_id;
$$;
