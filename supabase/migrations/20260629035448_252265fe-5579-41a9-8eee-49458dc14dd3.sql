UPDATE tool_improvement_cycles
SET status='failed', phase='complete',
    last_error='Stuck polling deliberations (5 checks, only 4 actionable proposals/deliberations). Fixed in code: phaseRerunning now targets registry_proposals count instead of quality_check_results.',
    completed_at=now(), updated_at=now()
WHERE id='94a2ec97-9b74-442f-bffa-b7d89390f4f5';

UPDATE quality_runs SET status='failed', completed_at=now(),
  error='Companion cycle 94a2ec97 marked failed (deliberation count-mismatch bug, now fixed).'
WHERE id='bc5791b3-b420-443e-a406-98529ddd4e1d';