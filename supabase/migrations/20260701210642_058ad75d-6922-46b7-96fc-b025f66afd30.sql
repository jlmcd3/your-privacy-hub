create table if not exists public.tool_run_meter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  tool_type text not null,
  assessment_id uuid not null,
  runs_allowed integer not null default 4,
  runs_used integer not null default 0,
  locked_fields jsonb,
  extension_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tool_type, assessment_id)
);
grant select on public.tool_run_meter to authenticated;
grant all on public.tool_run_meter to service_role;
alter table public.tool_run_meter enable row level security;
create policy "Users view own run meter"
  on public.tool_run_meter for select using (auth.uid() = user_id);
create index if not exists idx_tool_run_meter_user on public.tool_run_meter(user_id);
create index if not exists idx_tool_run_meter_lookup on public.tool_run_meter(tool_type, assessment_id);

create table if not exists public.tool_run_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  tool_type text not null,
  assessment_id uuid not null,
  version integer not null,
  intake_snapshot jsonb,
  report_data jsonb,
  document_text text,
  created_at timestamptz not null default now(),
  unique (tool_type, assessment_id, version)
);
grant select on public.tool_run_versions to authenticated;
grant all on public.tool_run_versions to service_role;
alter table public.tool_run_versions enable row level security;
create policy "Users view own run versions"
  on public.tool_run_versions for select using (auth.uid() = user_id);
create index if not exists idx_tool_run_versions_lookup on public.tool_run_versions(tool_type, assessment_id);