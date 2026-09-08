create table public.proposition_inventory (
  prop_id text primary key,
  product text not null,
  field_id text not null,
  label text not null,
  definition text not null,
  positive_examples text[] not null default '{}',
  negative_examples text[] not null default '{}',
  sibling_group text,
  gate_eligible boolean not null default false,
  effect_class text not null check (effect_class in ('persuasive_only','flag_risk','require_condition','verdict_bearing')),
  version int not null default 1,
  drafted_by text, drafted_at timestamptz,
  ratified_by text, ratified_at timestamptz, ledger_ref text,
  retired_at timestamptz, retired_reason text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.proposition_inventory enable row level security;
revoke all on public.proposition_inventory from anon, authenticated;
grant all on public.proposition_inventory to service_role;
create index proposition_inventory_field_idx on public.proposition_inventory (product, field_id) where retired_at is null;

create table public.proposition_decisions (
  decision_id text primary key,
  product text not null,
  field_id text not null,
  input_hash text not null,
  inventory_version text not null,
  prompt_hash text not null,
  schema_hash text not null,
  primary_model text not null,
  second_model text not null,
  primary_raw text not null,
  second_raw text not null,
  readings jsonb not null,
  conformance jsonb,
  created_at timestamptz default now()
);
alter table public.proposition_decisions enable row level security;
revoke all on public.proposition_decisions from anon, authenticated;
grant all on public.proposition_decisions to service_role;
create unique index proposition_decisions_content_key on public.proposition_decisions (product, field_id, input_hash, inventory_version, prompt_hash, schema_hash, primary_model, second_model);

create table public.intake_gate_results (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  assessment_id uuid,
  field_id text not null,
  question_text text not null,
  answer_hash text not null,
  verdict text not null check (verdict in ('conforms','non_conforming')),
  reason_codes text[] not null default '{}',
  other_limb_field text,
  model text not null,
  prompt_hash text not null,
  raw text not null,
  customer_action text check (customer_action in ('revised','stood','pending')),
  created_at timestamptz default now()
);
alter table public.intake_gate_results enable row level security;
revoke all on public.intake_gate_results from anon, authenticated;
grant all on public.intake_gate_results to service_role;
create index intake_gate_results_lookup_idx on public.intake_gate_results (product, field_id, answer_hash, prompt_hash, model);

create table public.intake_readings (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  assessment_id uuid not null,
  field_id text not null,
  question_text text not null,
  answer_hash text not null,
  decision_id text not null references public.proposition_decisions(decision_id),
  prop_id text not null references public.proposition_inventory(prop_id),
  evidence_span text not null,
  disposition text not null check (disposition in ('confirmed','corrected','stood','unconfirmed')),
  disposed_at timestamptz,
  revision_no int not null default 0,
  created_at timestamptz default now()
);
alter table public.intake_readings enable row level security;
revoke all on public.intake_readings from anon, authenticated;
grant all on public.intake_readings to service_role;
create index intake_readings_assessment_idx on public.intake_readings (assessment_id, field_id);
create unique index intake_readings_unique_key on public.intake_readings (assessment_id, field_id, decision_id, prop_id);

alter table public.li_assessments
  add column if not exists intake_hash text,
  add column if not exists readings_state text,
  add column if not exists v3_flags jsonb,
  add column if not exists preview_token text;
create index if not exists li_assessments_preview_token_idx on public.li_assessments (preview_token) where preview_token is not null;