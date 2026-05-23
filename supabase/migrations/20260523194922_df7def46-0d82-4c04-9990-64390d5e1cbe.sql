CREATE POLICY "Users can delete own unpaid orders without filings"
ON public.registration_orders
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND COALESCE(payment_status, '') <> 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.registration_filings f WHERE f.order_id = registration_orders.id
  )
);