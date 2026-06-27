create table public.quality_fix_deliberations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.quality_runs(id) on delete cascade,
  tool text not null,
  check_id text not null,
  dimension text,
  severity text,
  team1_position jsonb,
  team2_position jsonb,
  team3_position jsonb,
  team4_position jsonb,
  devils_advocate jsonb,
  team3_approve boolean,
  team4_approve boolean,
  consensus boolean not null default false,
  verdict text not null default 'pending',
  disagreements jsonb,
  recommended_change text,
  change_location text,
  status text not null default 'pending',
  auto_applied boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.quality_fix_deliberations to authenticated;
grant all on public.quality_fix_deliberations to service_role;

alter table public.quality_fix_deliberations enable row level security;

create policy "Admin quality_fix_deliberations" on public.quality_fix_deliberations
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create unique index quality_fix_deliberations_run_check_idx
  on public.quality_fix_deliberations(run_id, check_id);

create index quality_fix_deliberations_tool_idx
  on public.quality_fix_deliberations(tool, verdict);

create table public.quality_autoapply_tool_state (
  tool text primary key,
  runs_used int not null default 0,
  cap int not null default 15,
  enabled boolean not null default true,
  target_branch text not null default 'quality-auto',
  last_score_overall int,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.quality_autoapply_tool_state to authenticated;
grant all on public.quality_autoapply_tool_state to service_role;

alter table public.quality_autoapply_tool_state enable row level security;

create policy "Admin quality_autoapply_tool_state" on public.quality_autoapply_tool_state
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));