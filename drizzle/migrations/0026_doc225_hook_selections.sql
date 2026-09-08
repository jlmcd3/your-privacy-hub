create table if not exists public.hook_selection_decisions (
  decision_id    text primary key,
  product        text not null,
  field_id       text not null,
  input_hash     text not null,
  candidate_key  text not null,
  prompt_hash    text not null,
  schema_hash    text not null,
  primary_model  text not null,
  second_model   text not null,
  primary_raw    text not null,
  second_raw     text not null,
  readings       jsonb not null,
  conformance    jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists hook_selection_decisions_field_idx on public.hook_selection_decisions (product, field_id);

create table if not exists public.hook_selections (
  id             uuid primary key default gen_random_uuid(),
  product        text not null,
  assessment_id  uuid not null,
  generation_no  integer not null,
  field_id       text not null,
  hook_id        text not null,
  hook_version   integer,
  answer_hash    text not null,
  decision_id    text not null references public.hook_selection_decisions (decision_id),
  agreement      text not null check (agreement in ('same','different','unknown')),
  matched_atom   text,
  evidence_span  text,
  legs_disagreed boolean not null default false,
  status         text not null check (status in ('agreed','disagreed','unsettled_final','superseded')),
  source         text not null check (source in ('store','model','cap')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (assessment_id, generation_no, field_id, hook_id)
);
create index if not exists hook_selections_assessment_status_idx on public.hook_selections (assessment_id, status);

alter table public.hook_selection_decisions enable row level security;
alter table public.hook_selections enable row level security;
revoke all on public.hook_selection_decisions from anon, authenticated;
revoke all on public.hook_selections from anon, authenticated;
grant all on public.hook_selection_decisions to service_role;
grant all on public.hook_selections to service_role;

alter table public.intake_readings drop constraint if exists intake_readings_disposition_check;
update public.intake_readings set disposition = 'superseded'
 where disposition in ('confirmed','corrected','stood','unconfirmed');
alter table public.intake_readings add constraint intake_readings_disposition_check
  check (disposition in ('agreed','disagreed','unsettled_final','superseded'));

alter table public.authority_hooks
  add column if not exists material_facts         jsonb,
  add column if not exists distinguishing_pairs   jsonb,
  add column if not exists recognised_proposition text,
  add column if not exists condition_text         text,
  add column if not exists condition_atoms        text[],
  add column if not exists pinpoint               jsonb,
  add column if not exists appeal_note            text,
  add column if not exists verified_as_of         date;

comment on column public.authority_hooks.pinpoint is 'doc 222 §2.5 — structured pinpoint {kind: paragraph|section|page|recital|heading, ref, anchor_span}; verified against the source text by generate-corpus-hooks/_local/verify.ts';
comment on column public.authority_hooks.verified_as_of is 'doc 222 §2.7 — the date the CEO last verified a WP29 source''s current relevance; a WP29 hook without it is excluded from generation';