
-- 1. article_image_pool: restrict public SELECT to approved images only
DROP POLICY IF EXISTS "Public read image pool" ON public.article_image_pool;
CREATE POLICY "Public read approved image pool"
ON public.article_image_pool
FOR SELECT
TO public
USING (approval_status = 'approved');

-- 2. registration_assessments: revoke client SELECT on shareable_token
REVOKE SELECT (shareable_token) ON public.registration_assessments FROM anon, authenticated;

-- 3. registration_orders: restrict client UPDATE to non-payment columns
REVOKE UPDATE ON public.registration_orders FROM authenticated;
GRANT UPDATE (
  renewal_reminders_enabled,
  renewal_reminder_email,
  delivery_email,
  updated_at
) ON public.registration_orders TO authenticated;
