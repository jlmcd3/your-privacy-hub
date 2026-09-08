-- DOC 225 — DDL for the two-leg hook selection (doc 224 §3 / §4.B; 224A §3).
-- Lovable applies (DDL is the contract). Service-role only, like the four
-- doc 217 §3 tables: the browser never reads or writes these.
--
-- Written by classify-propositions `select_hooks`; read by run-li-assessment
-- at generation (lock / let go / supersede by canonical answer hash — doc
-- 224A §3.4) and by the record block. Both tables are content-addressed or
-- keyed so a regeneration with unchanged text makes no model call (doc 224 §1).

-- 1. The content-addressed decision store for hook selection (one row per
--    item = one free-text answer × its candidate hook set; replay reads it).
create table if not exists public.hook_selection_decisions (
  decision_id    text primary key,                 -- sha256(primary|second|prompt|schema|input|candidate_key)
  product        text not null,
  field_id       text not null,
  input_hash     text not null,                    -- sha256({question_text, canonical answer})
  candidate_key  text not null,                    -- sorted "hook_id@version|…"
  prompt_hash    text not null,
  schema_hash    text not null,
  primary_model  text not null,
  second_model   text not null,
  primary_raw    text not null,                    -- the leg's per-item slice, verbatim
  second_raw     text not null,
  readings       jsonb not null,                   -- MergedSelection[] (hook-selection.ts)
  conformance    jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists hook_selection_decisions_field_idx on public.hook_selection_decisions (product, field_id);

-- 2. The per-assessment, per-generation selection rows the ROO reads.
--    status: agreed | disagreed | unsettled_final | superseded (doc 224 §4.B.1)
create table if not exists public.hook_selections (
  id             uuid primary key default gen_random_uuid(),
  product        text not null,
  assessment_id  uuid not null,
  generation_no  integer not null,
  field_id       text not null,
  hook_id        text not null,
  hook_version   integer,
  answer_hash    text not null,                    -- sha256 of the CANONICAL answer (D2)
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

-- 3. Access: service role only (the doc 213 / 217 pattern — the public-schema
--    default ACL would otherwise grant anon/authenticated despite policy-less RLS).
alter table public.hook_selection_decisions enable row level security;
alter table public.hook_selections enable row level security;
revoke all on public.hook_selection_decisions from anon, authenticated;
revoke all on public.hook_selections from anon, authenticated;
grant all on public.hook_selection_decisions to service_role;
grant all on public.hook_selections to service_role;

-- 4. intake_readings: the dispositions change under doc 224 (readings are never
--    disposed by a customer). Existing rows carry the doc 217 values; none are
--    live (the read-back shipped dark), so they are retired in place.
--    VERIFIED 2026-09-08 (information_schema via Lovable): the CHECK constraint
--    `intake_readings_disposition_check` EXISTS with the doc 217 values, so it
--    must be dropped BEFORE the update and re-added after — in this order.
alter table public.intake_readings drop constraint if exists intake_readings_disposition_check;
update public.intake_readings set disposition = 'superseded'
 where disposition in ('confirmed','corrected','stood','unconfirmed');
alter table public.intake_readings add constraint intake_readings_disposition_check
  check (disposition in ('agreed','disagreed','unsettled_final','superseded'));

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. authority_hooks — DOC 222 (hooks contract v2) columns. Additive and
--    nullable: existing v1 rows keep working; the settle gate and the
--    generator's named exclusions refuse to ship a row that lacks them.
--    Written only by generate-corpus-hooks (draft / revise) and by the CEO's
--    stamp pass (appeal_note, verified_as_of).
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.authority_hooks
  add column if not exists material_facts         jsonb,   -- [{atom, materiality_reason, source_span}]
  add column if not exists distinguishing_pairs   jsonb,   -- [{source_fact_span, source_polarity, record_atom, record_polarity, why_material, source_expressly_excludes, exclusion_span, exclusion_paraphrase}]
  add column if not exists recognised_proposition text,    -- conditional sources only (§2.1)
  add column if not exists condition_text         text,    -- conditional sources only (§2.1)
  add column if not exists condition_atoms        text[],  -- record atoms that satisfy the condition; null = legal judgment
  add column if not exists pinpoint               jsonb,   -- {kind, ref, anchor_span} — mandatory before activation (§2.5)
  add column if not exists appeal_note            text,    -- CEO-entered; printed after "under appeal —"
  add column if not exists verified_as_of         date;    -- CEO-entered; REQUIRED for a WP29 source (§2.7)

comment on column public.authority_hooks.pinpoint is 'doc 222 §2.5 — structured pinpoint {kind: paragraph|section|page|recital|heading, ref, anchor_span}; verified against the source text by generate-corpus-hooks/_local/verify.ts';
comment on column public.authority_hooks.verified_as_of is 'doc 222 §2.7 — the date the CEO last verified a WP29 source''s current relevance; a WP29 hook without it is excluded from generation';
