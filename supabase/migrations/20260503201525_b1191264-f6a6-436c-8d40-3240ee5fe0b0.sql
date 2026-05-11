
create table if not exists public.state_law_update_candidates (
  id uuid primary key default gen_random_uuid(),
  state_slug text not null,
  state_name text not null,
  detected_law_name text,
  detected_effective_date text,
  detected_authority text,
  detected_statute_url text,
  source_summary text,
  confidence text check (confidence in ('high','medium','low')),
  status text not null default 'pending'
    check (status in ('pending','confirmed','dismissed')),
  detected_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

comment on table public.state_law_update_candidates is
  'Candidate state privacy law updates awaiting admin confirmation before being applied to the UI data.';

alter table public.state_law_update_candidates enable row level security;

create policy "Admins manage candidates"
  on public.state_law_update_candidates for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.function_run_log (
  function_name text primary key,
  last_run_at timestamptz,
  last_result jsonb
);

alter table public.function_run_log enable row level security;

create policy "Admins read run log"
  on public.function_run_log for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create table if not exists public.state_law_overrides (
  state_slug text primary key,
  state_name text not null,
  statute_status text not null,
  statute_name text,
  effective_date text,
  authority_name text,
  statute_url text,
  confirmed_at timestamptz default now(),
  confirmed_by text
);

alter table public.state_law_overrides enable row level security;

create policy "Anyone reads overrides"
  on public.state_law_overrides for select
  using (true);

create policy "Admins manage overrides"
  on public.state_law_overrides for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
