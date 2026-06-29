UPDATE public.tool_improvement_cycles
SET status='failed',
    phase='complete',
    last_error='deliberations never inserted (pre-fix: missing unique constraint on quality_fix_deliberations(run_id,check_id))',
    completed_at=now()
WHERE id IN ('562d5d75-2643-4c29-86bb-a0d66fa1a0d4','c34dddc9-9478-4738-8a37-eaa85dcb1585');