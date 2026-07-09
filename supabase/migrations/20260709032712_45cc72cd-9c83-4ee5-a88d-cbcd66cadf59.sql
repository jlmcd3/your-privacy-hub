-- FEEDART-2 backfill: return the one legacy 'eup-tile' row to NULL so the
-- render-time signal-glyph fallback (ArticleFallbackImage v3) takes over.
-- Verified inventory (2026-07-09): exactly 1 row carries image_source='eup-tile'
--   id=c3950470-c652-4079-9c64-f8808e9edb2a  (G7 2026 CNIL roundtable)
-- No external URLs matching '%logo%' / '%placeholder%' are touched.
UPDATE public.updates
SET image_url = NULL, image_source = NULL
WHERE image_source = 'eup-tile'
   OR image_url ILIKE '%article-images/eup-tile/%';