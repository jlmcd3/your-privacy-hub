-- DOC 272 §9 — Product Test storage: three tables for the offline-mirrored
-- admin battery at /admin/product-test (doc 272 §0, §9 "Storage").
--
-- product_test_runs      one row per battery run (page load or offline
--                         `pin-snapshots`/CI invocation): settings picked
--                         (tools, copies, geo), a running progress log
--                         (doc 272 §5), and a summary once the run ends.
-- product_test_documents one row per generated document (a fixture × variant
--                         × copy): the product's own insert/invoke/poll
--                         result plus the grading roll-up (doc 272 §6 —
--                         checks_total/failed and the severity counts that
--                         feed the document-pass and check-pass rates).
-- product_test_checks    one row per check `product-test-grade` ran against
--                         a document (doc 272 §6 families 1-6): pass/fail,
--                         severity, the quoted text and the rule it came
--                         from, plus the failure-triage fields doc 272 §7
--                         defines (status, class, note) so a failed check can
--                         be classified and tracked to "cleared" without a
--                         second table.
--
-- Reads on the page are ordinary client selects (doc 272 §9); writes come
-- only from the admin page and the `product-test-grade` edge function, both
-- running as an authenticated admin or the service role. RLS therefore
-- restricts direct table access to admins; the service role bypasses RLS by
-- default (Supabase's standard behaviour) so the edge functions are
-- unaffected.

create table public.product_test_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid,
  status text not null default 'running',
  settings jsonb not null default '{}',
  log jsonb not null default '[]',
  summary jsonb
);

create table public.product_test_documents (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.product_test_runs(id) on delete cascade,
  tool text not null,
  fixture_id text not null,
  variant_id text not null,
  copy_index int not null default 1,
  source_table text,
  source_row_id text,
  status text not null default 'pending',
  error text,
  document_hash text,
  checks_total int,
  checks_failed int,
  critical int,
  high int,
  editorial int,
  document_pass boolean,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.product_test_checks (
  id bigserial primary key,
  run_id uuid not null references public.product_test_runs(id) on delete cascade,
  document_id uuid not null references public.product_test_documents(id) on delete cascade,
  tool text not null,
  fixture_id text not null,
  variant_id text not null,
  check_id text not null,
  family text not null,
  severity text not null,
  passed boolean not null,
  block_key text,
  quote text,
  expected text,
  actual text,
  rule_ref text,
  status text not null default 'open',
  class text,
  note text,
  created_at timestamptz not null default now()
);

create index product_test_documents_run_id_idx on public.product_test_documents (run_id);
create index product_test_checks_run_id_idx on public.product_test_checks (run_id);
create index product_test_checks_document_id_idx on public.product_test_checks (document_id);
create index product_test_checks_lookup_idx on public.product_test_checks (tool, fixture_id, variant_id, check_id);

alter table public.product_test_runs enable row level security;
alter table public.product_test_documents enable row level security;
alter table public.product_test_checks enable row level security;

grant select, insert, update, delete on public.product_test_runs to authenticated;
grant all on public.product_test_runs to service_role;
create policy "Admins manage product test runs"
  on public.product_test_runs for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

grant select, insert, update, delete on public.product_test_documents to authenticated;
grant all on public.product_test_documents to service_role;
create policy "Admins manage product test documents"
  on public.product_test_documents for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

grant select, insert, update, delete on public.product_test_checks to authenticated;
grant all on public.product_test_checks to service_role;
create policy "Admins manage product test checks"
  on public.product_test_checks for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));
