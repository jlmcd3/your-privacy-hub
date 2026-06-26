SET LOCAL session_replication_role = 'replica';
UPDATE public.registration_orders
SET fulfillment_status='failed', updated_at=now()
WHERE fulfillment_status='generating';
SET LOCAL session_replication_role = 'origin';