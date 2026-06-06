
-- ============================================================
-- EUP Monday pipeline + daily backbone — canonical schedule
-- Strategy: cron.alter_job() preserves existing command bodies
-- (keeping the working auth pattern per job), cron.schedule() is
-- only used for the 4 NEW jobs.
-- Fully idempotent — safe to re-run.
-- ============================================================

-- ── DAILY BACKBONE — reschedule existing jobs ───────────────
-- Skip Monday on the three sources that get dedicated Monday feeders.

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  -- ingest-gdprhub-daily → 02:00 Sun + Tue–Sat
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'ingest-gdprhub-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '0 2 * * 0,2-6'); END IF;

  -- ingest-cms-tracker-daily → 02:30 Sun + Tue–Sat
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'ingest-cms-tracker-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '30 2 * * 0,2-6'); END IF;

  -- ingest-legislation-daily → 03:00 Sun + Tue–Sat (was 06:00 every day — fired AFTER brief)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'ingest-legislation-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '0 3 * * 0,2-6'); END IF;

  -- ingest-gov-enforcement-daily → 03:30 Sun + Tue–Sat (Mon handled by weekly)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'ingest-gov-enforcement-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '30 3 * * 0,2-6'); END IF;

  -- fetch-federal-register-daily → 04:30 every day (was 05:00 — cleared the 05:00 jam)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'fetch-federal-register-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '30 4 * * *'); END IF;

  -- fetch-congress-bills-daily → 04:45 every day (was 05:30)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'fetch-congress-bills-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '45 4 * * *'); END IF;

  -- tag-updates-law-slug-daily → 06:00 Sun + Tue–Sat (was 04:00 — ran BEFORE ingestion)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'tag-updates-law-slug-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '0 6 * * 0,2-6'); END IF;

  -- process-li-updates-daily → 06:15 Sun + Tue–Sat (was 06:30 every day; Mon = weekly)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'process-li-updates-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '15 6 * * 0,2-6'); END IF;
END $$;

-- ── MONDAY WEEKLY JOBS — reschedule existing ───────────────

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  -- 02:00 Mon — gov-enforcement (worst case ~75 min, finishes by ~03:15)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'ingest-gov-enforcement-weekly';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '0 2 * * 1'); END IF;

  -- 03:30 Mon — LI tracker (was 05:15)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'process-li-updates-weekly';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '30 3 * * 1'); END IF;

  -- 04:00 Mon — enrich enforcement (was 06:15, raced gov-enf)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'enrich-enforcement-monday';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '0 4 * * 1'); END IF;

  -- 05:00 Mon — primary-source batch fetch (was 05:45)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'batch-fetch-primary-sources-monday';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '0 5 * * 1'); END IF;

  -- 07:00 Mon — public weekly brief (was 06:00)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'cron-generate-public-weekly-brief';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '0 7 * * 1'); END IF;

  -- 07:45 Mon — horizon intelligence (was 06:00 — collision fixed)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'generate-horizon-intelligence-weekly';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '45 7 * * 1'); END IF;

  -- 08:30 Mon — monitor jurisdictions (was 07:00)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'monitor-jurisdictions-weekly-aiact';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '30 8 * * 1'); END IF;

  -- 09:30 Mon — custom Pro briefs (was 07:30)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'cron-generate-custom-brief';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '30 9 * * 1'); END IF;

  -- 11:00 Mon — regulatory drift (was 09:00)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'regulatory-drift-detect-weekly';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '0 11 * * 1'); END IF;

  -- 11:30 Mon — RoPA refresh reminders (was 10:00)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'ropa-refresh-reminders-weekly';
  IF v_jobid IS NOT NULL THEN PERFORM cron.alter_job(job_id := v_jobid, schedule := '30 11 * * 1'); END IF;
END $$;

-- ── NEW MONDAY-ONLY FEEDER JOBS ─────────────────────────────

-- 01:00 Mon — CMS Tracker (verify_jwt=false → vault-bearer ADMIN_SECRET_TOKEN)
DO $$ BEGIN PERFORM cron.unschedule('ingest-cms-tracker-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'ingest-cms-tracker-weekly',
  '0 1 * * 1',
  $job$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/ingest-cms-tracker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $job$
);

-- 01:15 Mon — GDPRHub (verify_jwt=false → vault-bearer)
DO $$ BEGIN PERFORM cron.unschedule('ingest-gdprhub-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'ingest-gdprhub-weekly',
  '15 1 * * 1',
  $job$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/ingest-gdprhub',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1
      )
    ),
    body := '{"max": 50}'::jsonb,
    timeout_milliseconds := 1800000
  ) AS request_id;
  $job$
);

-- 01:30 Mon — Legislation All (verify_jwt=true default → anon JWT via apikey)
DO $$ BEGIN PERFORM cron.unschedule('ingest-legislation-all-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'ingest-legislation-all-weekly',
  '30 1 * * 1',
  $job$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/ingest-legislation-all',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a3NidHJlbHB6aGJ5ZXV0emdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY3NTYsImV4cCI6MjA4ODc3Mjc1Nn0.GdklrUDyQ5g3xPw1qpxGFGJc2ICfwynP2nVegnDNZMs"}'::jsonb,
    body := jsonb_build_object('trigger', 'cron-weekly'),
    timeout_milliseconds := 1200000
  ) AS request_id;
  $job$
);

-- 06:00 Mon — tag-updates-law-slug Monday pass (catches weekend backlog;
-- weekday daily is now also at 06:00 but on Sun + Tue–Sat, so no overlap)
DO $$ BEGIN PERFORM cron.unschedule('tag-updates-law-slug-monday'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'tag-updates-law-slug-monday',
  '0 6 * * 1',
  $job$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/tag-updates-law-slug',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a3NidHJlbHB6aGJ5ZXV0emdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY3NTYsImV4cCI6MjA4ODc3Mjc1Nn0.GdklrUDyQ5g3xPw1qpxGFGJc2ICfwynP2nVegnDNZMs"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $job$
);

-- ── ADMIN HELPER: cron schedule + last ingestion run ──────
-- Joins cron.job to the most-recent ingestion_runs row per job by
-- stripping the -daily / -weekly / -monday / -hourly / -monthly suffix
-- (and a few common variations) so admins can see schedule + last
-- run health in one query.
CREATE OR REPLACE FUNCTION public.get_cron_jobs_with_last_run()
RETURNS TABLE(
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  command_preview text,
  last_run_at timestamptz,
  last_status text,
  last_duration_ms integer,
  last_fetched integer,
  last_inserted integer,
  last_skipped integer,
  last_error text,
  failures_7d bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  WITH base AS (
    SELECT
      j.jobid,
      j.jobname,
      j.schedule,
      j.active,
      substring(j.command, 1, 200) AS command_preview,
      regexp_replace(
        j.jobname,
        '-(daily|weekly|weekly-[a-z0-9]+|monday|monthly|hourly|hourly-safety|business|evening|quiet|twice-daily|every-15m)$',
        ''
      ) AS base_name
    FROM cron.job j
  ),
  latest AS (
    SELECT DISTINCT ON (job_name)
      job_name,
      COALESCE(completed_at, finished_at, run_at) AS last_run_at,
      status,
      duration_ms,
      fetched,
      inserted,
      skipped,
      error_message
    FROM public.ingestion_runs
    WHERE job_name IS NOT NULL
    ORDER BY job_name, COALESCE(completed_at, finished_at, run_at) DESC
  ),
  fails AS (
    SELECT job_name, count(*) AS n
    FROM public.ingestion_runs
    WHERE status IN ('error','failed','partial')
      AND COALESCE(completed_at, finished_at, run_at) > now() - interval '7 days'
    GROUP BY job_name
  )
  SELECT
    b.jobid,
    b.jobname,
    b.schedule,
    b.active,
    b.command_preview,
    l.last_run_at,
    l.status,
    l.duration_ms,
    l.fetched,
    l.inserted,
    l.skipped,
    l.error_message,
    COALESCE(f.n, 0) AS failures_7d
  FROM base b
  LEFT JOIN latest l ON l.job_name = b.base_name
  LEFT JOIN fails  f ON f.job_name = b.base_name
  ORDER BY b.jobname;
$$;

REVOKE ALL ON FUNCTION public.get_cron_jobs_with_last_run() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_jobs_with_last_run() TO authenticated, service_role;
