
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  (auth.uid() = id)
  AND (is_premium = (SELECT p.is_premium FROM profiles p WHERE p.id = auth.uid()))
  AND (NOT (stripe_customer_id IS DISTINCT FROM (SELECT p.stripe_customer_id FROM profiles p WHERE p.id = auth.uid())))
  AND (payment_failed = (SELECT p.payment_failed FROM profiles p WHERE p.id = auth.uid()))
  AND (NOT (subscription_end_date IS DISTINCT FROM (SELECT p.subscription_end_date FROM profiles p WHERE p.id = auth.uid())))
  AND (NOT (is_pro IS DISTINCT FROM (SELECT p.is_pro FROM profiles p WHERE p.id = auth.uid())))
  AND (NOT (stripe_price_id IS DISTINCT FROM (SELECT p.stripe_price_id FROM profiles p WHERE p.id = auth.uid())))
);
