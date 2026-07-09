-- WEBHOOK-1 cleanup: remove the partial sandbox entitlement row created before the race-heal fix.
-- Scope is intentionally narrow: single row, sandbox only, and only if it is still in the
-- partial state (subscription_type IS NULL AND stripe_subscription_id IS NULL) so this
-- migration cannot accidentally clobber a healed row.
DELETE FROM public.user_entitlements
WHERE user_id = '02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122'
  AND environment = 'sandbox'
  AND subscription_type IS NULL
  AND stripe_subscription_id IS NULL;