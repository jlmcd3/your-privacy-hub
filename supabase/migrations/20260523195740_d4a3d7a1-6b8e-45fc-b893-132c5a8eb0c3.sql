DROP POLICY IF EXISTS "Users can delete own unpaid orders without filings" ON public.registration_orders;

CREATE POLICY "Users can delete own orders"
ON public.registration_orders
FOR DELETE
TO authenticated
USING (user_id = auth.uid());