create table if not exists public.tool_regulatory_update_acknowledgements (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  tool_type         text not null,
  document_id       uuid not null,
  article_id        uuid not null references public.updates(id) on delete cascade,
  article_title     text not null,
  jurisdiction_name text,
  urgency           text not null check (urgency in ('high', 'medium')),
  noted_at          timestamptz not null default now(),
  unique (user_id, tool_type, document_id, article_id)
);

create index if not exists tool_reg_ack_document_idx
  on public.tool_regulatory_update_acknowledgements (tool_type, document_id);

create index if not exists tool_reg_ack_user_idx
  on public.tool_regulatory_update_acknowledgements (user_id, tool_type);

alter table public.tool_regulatory_update_acknowledgements enable row level security;

create policy "Users manage own acknowledgements"
  on public.tool_regulatory_update_acknowledgements
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);