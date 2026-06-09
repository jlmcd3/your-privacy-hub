
-- ============================================================
-- Prompt 2.1 — Stop serving the paid weekly brief to anon
-- ============================================================
DROP POLICY IF EXISTS "Public can read briefs" ON public.weekly_briefs;
DROP POLICY IF EXISTS "Anyone can read weekly briefs" ON public.weekly_briefs;
DROP POLICY IF EXISTS "weekly_briefs_insert_permissive" ON public.weekly_briefs;

-- Premium / admin read access on the base table.
CREATE POLICY "weekly_briefs_select_premium"
  ON public.weekly_briefs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.is_premium = true OR COALESCE(p.is_pro, false) = true)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Public teaser view: only safe-to-leak fields + 320-char preview.
DROP VIEW IF EXISTS public.weekly_briefs_teaser CASCADE;
CREATE VIEW public.weekly_briefs_teaser AS
SELECT
  id,
  week_label,
  headline,
  published_at,
  article_count,
  LEFT(COALESCE(executive_summary, ''), 320) AS teaser
FROM public.weekly_briefs;

-- View intentionally relies on the OWNER's privileges (security_invoker = off
-- is the default) so it can read the base table while RLS blocks anon.
GRANT SELECT ON public.weekly_briefs_teaser TO anon, authenticated;

-- ============================================================
-- Prompt 1.2 — Extend subscription_type constraint to allow Professional
-- (webhook writes 'pro_monthly' / 'pro_annual' that the old CHECK blocked)
-- ============================================================
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_type_check
  CHECK (
    subscription_type IS NULL
    OR subscription_type IN ('monthly','annual','annual_founding','pro_monthly','pro_annual')
  );

-- ============================================================
-- Prompt 1.2 step 6 — Backfill is_pro / clear canceled rows
-- ============================================================
UPDATE public.profiles
SET is_pro = true
WHERE subscription_type IN ('pro_monthly','pro_annual')
  AND COALESCE(is_pro, false) = false;

UPDATE public.profiles
SET subscription_type = NULL, is_pro = false
WHERE is_premium = false
  AND COALESCE(is_pro, false) = false
  AND subscription_type IS NOT NULL;
