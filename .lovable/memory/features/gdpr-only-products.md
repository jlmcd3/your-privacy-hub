---
name: GDPR-only products (Governance, DPIA, Registration)
description: Governance, DPIA, and Registration are GDPR-only — US companies must never get datasets, prompts, or jobs for them
type: feature
---
CEO ruling (2026-08-31): Governance, DPIA, and Registration are GDPR-only products. US companies must NEVER run them.

Enforcement points (all must stay consistent):
- `src/lib/sampleDataPackages.ts`: `GDPR_ONLY_SLUGS = ["governance", "dpia", "registration"]` → US datasets use only non-GDPR profiles.
- `supabase/functions/start-stress-batch/index.ts`: `ALL_TOOLS` marks governance/registration/dpia (plus lia/ropa/eu-notice) as `geo: "eu"` — job creation is geo-gated there.
- `supabase/functions/generate-stress-fixtures/index.ts`: Claude Call A prompt only requests `governance` and `registration` payloads when `geo === "eu"`; DPIA/LIA/RoPA/EU-notice live in the EU-only Call B prompt.

**Why:** US companies are out of scope for GDPR products; running them produces intake-gate rejections and misleading scores.
**How to apply:** Any new fixture generator, prompt, batch path, or tool registry must gate these three slugs to EU/UK geos.
