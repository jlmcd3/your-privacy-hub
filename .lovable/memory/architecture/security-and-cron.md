---
name: Security & Cron
description: RLS policies, view-safety rules, edge function auth, scheduling constraints
type: constraint
---

## View safety rule (SEC-2 / SEC-2-CORRECTION)

**Narrowing views** (a view whose purpose is to hide columns of a sensitive base table — i.e. columns the base table's own RLS would otherwise expose):

- MUST NOT set `security_invoker=true`. Leave the view's default owner-privileges mode.
- MUST NOT add any grant, policy, or role access on the base table for the reader role (anon / authenticated). The view owner (`postgres`) reads the base table on the caller's behalf; the view's own SELECT list + WHERE clause is the only thing the caller ever sees.
- The view itself must be granted `SELECT` only to the reader role; explicitly `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ... FROM anon, authenticated` on the view immediately after `CREATE VIEW`, because the Supabase `public` schema default ACL grants full `arwdDxtm` to those roles on every new relation.
- Reference incident: `public.cppa_fsor_callouts` over `public.cppa_fsor_commentary`. Adding `security_invoker=true` and an anon SELECT policy on the base table exposed all 15 columns of all 1,318 rows via direct REST — RLS cannot restrict columns, only rows.

**Convenience views** (over base tables where the caller already has equivalent access via the base table's own RLS): `security_invoker=true` is appropriate and preferred, so the caller's RLS is enforced.

## Default privilege pattern (systemic, not per-object)

`pg_default_acl` for `public` (roles `postgres` and `supabase_admin`) grants `arwdDxtm` to `anon` and `authenticated` on every new relation. Cannot be altered from the managed migration role (`ERROR 42501: permission denied to change default privileges`). Every migration that creates a new table or view must therefore include explicit `REVOKE`/`GRANT` clauses tuned to the RLS it enables.
