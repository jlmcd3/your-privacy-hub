-- ── Unschedule all existing jobs ──────────────────────────────────────────
DO $$
DECLARE
  job_names TEXT[] := ARRAY[
    'fetch-updates-every-4h',
    'fetch-newsapi-twice-daily',
    'fetch-court-filings-twice-daily',
    'fetch-sec-breaches-twice-daily',
    'fetch-federal-register-daily',
    'fetch-congress-bills-daily',
    'generate-horizon-intelligence-weekly',
    'generate-weekly-brief-monday',
    'generate-custom-brief-monday',
    'cron-generate-weekly-brief',
    'cron-generate-custom-brief',
    'send-weekly-brief-monday'
  ];
  jn TEXT;
BEGIN
  FOREACH jn IN ARRAY job_names LOOP
    BEGIN
      PERFORM cron.unschedule(jn);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- ── RSS ingestion: 2,6,10,14,18,22 ───────────────────────────────────────
SELECT cron.schedule(
  'fetch-updates-every-4h',
  '0 2,6,10,14,18,22 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/fetch-updates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── NewsAPI: 5:17 am/pm ──────────────────────────────────────────────────
SELECT cron.schedule(
  'fetch-newsapi-twice-daily',
  '17 5,17 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/fetch-newsapi',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Court filings: 5:15 am/pm ────────────────────────────────────────────
SELECT cron.schedule(
  'fetch-court-filings-twice-daily',
  '15 5,17 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/fetch-court-filings',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── SEC breaches: 5:30 am/pm ─────────────────────────────────────────────
SELECT cron.schedule(
  'fetch-sec-breaches-twice-daily',
  '30 5,17 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/fetch-sec-breaches',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Federal Register: 5:00 am ────────────────────────────────────────────
SELECT cron.schedule(
  'fetch-federal-register-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/fetch-federal-register',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Congress bills: 5:30 am ──────────────────────────────────────────────
SELECT cron.schedule(
  'fetch-congress-bills-daily',
  '30 5 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/fetch-congress-bills',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Horizon intelligence: Monday 6:00 am ─────────────────────────────────
SELECT cron.schedule(
  'generate-horizon-intelligence-weekly',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url  := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/generate-horizon-intelligence',
    body := jsonb_build_object(
      'admin_token',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    )
  ) AS request_id;
  $$
);

-- ── Weekly brief: Monday 6:30 am ─────────────────────────────────────────
SELECT cron.schedule(
  'cron-generate-weekly-brief',
  '30 6 * * 1',
  $cron$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/cron-generate-briefs?target=weekly',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 540000
  ) AS request_id;
  $cron$
);

-- ── Custom brief: Monday 7:30 am ─────────────────────────────────────────
SELECT cron.schedule(
  'cron-generate-custom-brief',
  '30 7 * * 1',
  $cron$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/cron-generate-briefs?target=custom',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 540000
  ) AS request_id;
  $cron$
);

-- ── Send brief: Monday 8:00 am (NEW) ─────────────────────────────────────
SELECT cron.schedule(
  'send-weekly-brief-monday',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/send-weekly-brief',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);