-- Rotate vault ADMIN_SECRET_TOKEN to match the freshly generated value that
-- is also being written to the Edge Function env via update_secret in the
-- same window. This resolves the vault-vs-env drift that has been 401'ing
-- the Track 3 orchestrator (and silently breaking Horizon + Weekly Brief).
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'ADMIN_SECRET_TOKEN'),
  'Etsdv_YMJdcmv4L63fzMOQfT5brvkX4ELZk1dbke7ZDtPzS1RXx5sXR-9-cBds5H',
  'ADMIN_SECRET_TOKEN'
);