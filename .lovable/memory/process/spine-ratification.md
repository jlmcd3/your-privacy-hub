---
name: Spine ratification process rule
description: How spine/fixed-prose changes are put to the CEO for ratification, for every product
type: preference
---

Standing CEO rule (2026-08-12, all products):

- Ratification review documents for any spine / fixed-prose change are generated
  from the SHIPPED spine bytes, never from a stored `.docx`.
- A ratified prose revision changes fixed prose only: structure (sections, block
  order, block kinds) and the slot inventory must be identical before/after, and
  the slot inventory is asserted in the product's spine test battery.
- Re-pin the spine hash on every ratified change; retain prior hashes in the
  spine file for the audit trail; re-run the statutory pinpoint byte-checks.
- DPIA spine lineage: v3 `cf54ee99…` → v4 `011f9f42…` (2026-08-11) →
  v4.1 `5e538c3c50a0d8098acdffd9067166d92cb343da7f1b117158df9f7d66a4d7b2`
  (CEO-ratified 2026-08-12, PROMPT 8B).
