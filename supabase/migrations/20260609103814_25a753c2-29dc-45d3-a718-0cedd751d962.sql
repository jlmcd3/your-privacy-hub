
-- 1. Collapse any pre-existing duplicate rows (keep oldest).
WITH dups AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id, type, slug ORDER BY created_at, id) AS rn
  FROM public.user_watchlist
)
DELETE FROM public.user_watchlist
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- 2. Enforce uniqueness going forward. Enables ON CONFLICT upserts.
ALTER TABLE public.user_watchlist
  ADD CONSTRAINT user_watchlist_user_type_slug_unique
  UNIQUE (user_id, type, slug);
