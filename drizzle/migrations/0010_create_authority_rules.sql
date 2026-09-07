create table public.authority_rules (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null unique,
  family text not null,
  product text not null,
  profile_id uuid not null references public.authority_relevance_profiles(id),
  supporting_profile_ids uuid[] not null default '{}',
  settledness text not null check (settledness in ('R1','R2','R3')),
  direction text not null check (direction in ('adverse','favorable')),
  instrument_scope text[] not null,
  regulator_scope text,
  bears_on_factor_ids text[] not null,
  bears_on_element text not null check (bears_on_element in ('purpose','necessity','balancing','outcome')),
  trigger jsonb not null,
  effect jsonb not null,
  reason_sentence text not null,
  authority_citation text not null,
  fixture_fires jsonb not null,
  fixture_silent jsonb not null,
  retire_when text not null,
  worksheet_ref text not null,
  ratified_by text, ratified_at timestamptz, ledger_ref text,
  retired_at timestamptz, retired_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint effect_kind_closed check ((effect->>'kind') in ('override_outcome','cap_verdict','require_condition','flag_risk','recognise_interest','route_to_basis','precedent_verdict')),
  constraint direction_matches_kind check (
    (direction = 'adverse' and (effect->>'kind') in ('override_outcome','cap_verdict','require_condition','flag_risk')) or
    (direction = 'favorable' and (effect->>'kind') in ('recognise_interest','route_to_basis','precedent_verdict'))),
  constraint favorable_eligibility check (
    direction = 'adverse'
    or ((effect->>'kind') in ('recognise_interest','route_to_basis') and settledness = 'R1')
    or ((effect->>'kind') = 'precedent_verdict' and ((effect->>'element') <> 'necessity' or settledness in ('R1','R2')))),
  constraint adverse_eligibility check (direction = 'favorable' or (effect->>'kind') <> 'override_outcome' or settledness in ('R1','R2'))
);

revoke all on public.authority_rules from anon, authenticated;
grant all on public.authority_rules to service_role;

alter table public.authority_rules enable row level security;

create index authority_rules_product_idx on public.authority_rules (product, ratified_at) where retired_at is null;