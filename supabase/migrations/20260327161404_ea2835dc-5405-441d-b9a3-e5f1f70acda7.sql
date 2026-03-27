-- Enable pg_net if not already enabled (required for HTTP calls from cron)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- fetch-newsapi: twice daily at 6 AM and 6 PM UTC
-- 25 queries x 2 runs = 50 requests/day (free tier cap: 100/day)
SELECT cron.schedule(
  'fetch-newsapi-twice-daily',
  '0 6,18 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/fetch-newsapi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.admin_secret_token')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- fetch-court-filings: twice daily, staggered 15 min after fetch-newsapi
SELECT cron.schedule(
  'fetch-court-filings-twice-daily',
  '15 6,18 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/fetch-court-filings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.admin_secret_token')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- fetch-sec-breaches: twice daily, staggered 30 min after fetch-newsapi
SELECT cron.schedule(
  'fetch-sec-breaches-twice-daily',
  '30 6,18 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/fetch-sec-breaches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.admin_secret_token')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- fetch-federal-register: once daily at 7 AM UTC
-- The Federal Register publishes in daily batches; polling more frequently yields no new content
SELECT cron.schedule(
  'fetch-federal-register-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/fetch-federal-register',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.admin_secret_token')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- fetch-congress-bills: once daily at 7:30 AM UTC
-- Congressional bills move slowly; daily polling is sufficient
-- Requires CONGRESS_API_KEY set as a Supabase secret (register free at api.congress.gov)
SELECT cron.schedule(
  'fetch-congress-bills-daily',
  '30 7 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/fetch-congress-bills',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.admin_secret_token')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);