
-- Helper: fire backfill-ai-summaries asynchronously for a small batch
CREATE OR REPLACE FUNCTION public.fire_backfill_ai_summaries_async(p_batch integer DEFAULT 5)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text;
  v_req_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'ADMIN_SECRET_TOKEN'
  LIMIT 1;

  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/backfill-ai-summaries?batch=' || p_batch::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', coalesce(v_token, '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 540000
  ) INTO v_req_id;

  RETURN v_req_id;
EXCEPTION WHEN OTHERS THEN
  -- Never let trigger failures block ingestion
  RAISE WARNING 'fire_backfill_ai_summaries_async failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Trigger function: fire enrichment when a new unenriched article is inserted
CREATE OR REPLACE FUNCTION public.trigger_enrich_new_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ai_summary IS NULL AND COALESCE(NEW.enrichment_version, 0) = 0 THEN
    PERFORM public.fire_backfill_ai_summaries_async(5);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS updates_enrich_on_insert ON public.updates;
CREATE TRIGGER updates_enrich_on_insert
AFTER INSERT ON public.updates
FOR EACH ROW
EXECUTE FUNCTION public.trigger_enrich_new_update();
