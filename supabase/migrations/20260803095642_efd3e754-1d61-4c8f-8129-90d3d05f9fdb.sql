UPDATE public.enforcement_actions
SET refetch_attempts = 3,
    refetch_last_error = 'asset_url',
    refetch_last_attempt_at = now(),
    strat_has_document = false,
    verification_status = 'failed'
WHERE source_url ~* '\.(jpe?g|png|gif|webp|bmp|svg|ico|css|js|mp4|mp3|zip|woff2?|ttf)(\?|#|$)'
  AND coalesce(length(raw_text), 0) < 200;