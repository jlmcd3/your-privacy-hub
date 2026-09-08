# law-page-audit extension — build plan (doc 228 Part 4) — NOT DEPLOYED

Status: design complete, nothing built live. No migration applied, no edge function
created, no cron entry scheduled. Every item below is deliberately dormant until the
CEO greenlights a phase.

## 0. Design decision
Extend `state_law_update_candidates` with a `content_type` discriminator rather than a
new findings table, so all human review stays on one screen (`/admin/law-updates`).
Findings against the 10 hardcoded narrative `.tsx` pages never enter that table — they
become a branch + pull request only. No auto-apply tier exists in any phase.

## 1. DB objects (to apply only when phase 1 starts)
- `ALTER TABLE public.state_law_update_candidates` adding nullable
  `content_type` (default `state_law_enactment`, check-constrained to
  `directory_entry | comparison_matrix_entry | glossary_term | timeline_entry`),
  `source_page_slug`, `claim_text`, `citation_tier` (`settled|verify|verify-pinpoint`),
  `finding_status` (`unchanged|changed|source_moved|source_gone`), `source_url`,
  `suggested_value jsonb`, `audit_run_id uuid`; plus indexes on
  `(content_type, status)` and `(audit_run_id)`. Existing RLS policy
  "Admins manage candidates" already covers the new columns.
- New `public.content_audit_runs` (run header: content_type, source_page_slug,
  batch_label, skill_version_id, model, findings_count, changed_count, started_at,
  completed_at, error) — RLS: admin SELECT, service_role ALL; explicit GRANTs.
- New `public.content_audit_github_patches` (per-finding PR trail: source_page_slug,
  file_path, claim_text, citation_tier, finding_status, source_url, suggested_value,
  branch, commit_sha/url, pr_number/url, status `pending|pr_opened|merged|dismissed|error`)
  — RLS: admin ALL, service_role ALL; explicit GRANTs.

## 2. Edge functions (three, none created yet)
- `audit-narrative-pages` — one page per request. Admin JWT or
  `x-internal-cron` + service key, copied from `apply-quality-fix`. Reads the page
  source through `ghGet`, asks Claude (law-page-audit skill, pinned version, with
  web_fetch/web_search) for the JSON finding contract, then for each non-`unchanged`
  finding calls `applyPatchToBranch` on branch `content-audit/<slug>-<yyyymmdd>` and
  opens a PR against `main` via a new `ensurePullRequest` helper in
  `_shared/github-apply.ts`. Never commits to `main`, never merges.
- `audit-json-content` — batch of entries per request for directories, the state
  comparison matrix, the glossary and timelines. De-duplicates against pending rows
  exactly like `check-state-privacy-laws`, then inserts findings into
  `state_law_update_candidates` with `status='pending'`.
- `audit-schedule-dispatch` — thin cron fan-out that invokes the two workers per
  due unit of work with `x-internal-cron`.
- Shared `_shared/law-page-audit-skill.ts`: pinned skill version id, system prompt
  (citation tiers + "material change" definition), and the `Finding` type:
  `{ claim_text, citation_tier, status, source_url, suggested_value?, notes? }`.

## 3. Admin UI
Extend `src/pages/AdminLawUpdates.tsx`: widen the `Candidate` type, group by
`content_type`, and render a new `src/components/admin/AuditFindingCard.tsx` for audit
findings (page slug, claim text, tier badge, status badge, current-vs-suggested diff,
source link). Dismiss reuses the existing handler unchanged. Confirm branches: state-law
rows keep the live `state_law_overrides` upsert; audit rows call a new
`apply-content-audit-finding` function that opens a PR instead, with dialog copy that
says so. A read-only list of `content_audit_github_patches` shows open PRs.

## 4. Git route for the 10 hardcoded pages
Reuse `_shared/github-apply.ts` verbatim (`ghGet`, `ghPut`, `applyPatchWithClaude`,
`ensureBranch`, `applyPatchToBranch`), add `ensurePullRequest`. Branch
`content-audit/<slug>-<yyyymmdd>`; commit message
`content-audit(<slug>): <claim>` with skill version and source URL in the body;
PR-only, human merge is the gate. No kill switch table needed — there is no auto tier.

## 5. Cron (to be created inactive)
`audit-narrative-pages-monthly` (`0 6 1 * *`), `audit-json-directories-weekly`
(`0 7 * * 1`), `audit-glossary-quarterly` (`0 6 1 1,4,7,10 *`),
`audit-timelines-monthly` (`0 6 2 * *`) — all posting to `audit-schedule-dispatch`
with an internal-cron header, then immediately `update cron.job set active = false`.
Leave `check-research-freshness`'s existing weekly job untouched; run old and new side
by side for one full cycle before retiring the proxy.
