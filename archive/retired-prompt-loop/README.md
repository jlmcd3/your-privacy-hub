# Retired: model-era prompt loop (archived 2026-09-03)

`improve-prompt` and `validate-fix` were the biometric-only, model-era prompt
improvement loop (Claude proposes one prompt edit → held-out A/B against
`_shared/golden/biometric.ts`). Both are retired: the functions are archived
here (not deployed, not built, not imported), and the two admin surfaces that
invoked them were removed:

- `/admin/quality-loop` — "Improve prompt (golden)" button + `improveGolden`
- `/admin/quality-augmentation` — "Validate on holdout" button + `runValidateFix`

They were the last consumers of `supabase/functions/_shared/golden/` outside
`quality-batch-orchestrator`, which is why retiring them let the golden fixture
tree move into `quality-batch-orchestrator/_local/golden/`. If either is ever
revived it must carry its own copy of the fixtures it needs.
