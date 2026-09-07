create table public.authority_hooks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.authority_relevance_profiles(id),
  product text not null default 'lia',
  hook_version int not null default 1,
  hook_status text not null check (hook_status in ('drafted','critiqued','settled','contested','ratified','retired')),
  fact_atoms text[] not null default '{}',
  distinguishing_atoms text[] not null default '{}',
  not_distinguishable boolean not null default false,
  required_atoms text[] not null default '{}',
  finding_span text not null,
  fact_pattern_paraphrase text not null,
  finding_paraphrase text not null,
  trigger_terms text[] not null default '{}',
  settledness text not null check (settledness in ('R1','R2','R3','R4')),
  drafter jsonb not null,
  critic jsonb,
  round int not null default 1,
  substring_checks_passed boolean not null default false,
  vocabulary_checks_passed boolean not null default false,
  lawyer_edits jsonb,
  rendered_samples_reviewed uuid[] not null default '{}',
  ratified_by text, ratified_at timestamptz, ledger_ref text,
  retired_at timestamptz, retired_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (profile_id, hook_version)
);
alter table public.authority_hooks enable row level security;
revoke all on public.authority_hooks from anon, authenticated;
grant all on public.authority_hooks to service_role;
create index authority_hooks_status_idx on public.authority_hooks (product, hook_status) where retired_at is null;

create table public.authority_hook_runs (
  run_id text primary key, product text not null, profile_ids uuid[] not null, cursor int not null default 0,
  status text not null default 'running', started_at timestamptz not null default now(), finished_at timestamptz, notes jsonb
);
alter table public.authority_hook_runs enable row level security;
revoke all on public.authority_hook_runs from anon, authenticated;
grant all on public.authority_hook_runs to service_role;