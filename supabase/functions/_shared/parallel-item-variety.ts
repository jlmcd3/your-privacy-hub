// SO-FT FIX 6 (2026-08-11) — PARALLEL-ITEM VARIETY RULE.
//
// Across multiple so-final-test batches the same defect recurred in four
// products: where a prompt asks for parallel analysis over a set of similar
// items (beneficiary classes, remediation duties, standing-preparedness
// domains, lawfulness limbs), the model filled ONE template sentence and
// swapped the noun. The result reads as boilerplate and carries no
// item-specific reasoning.
//
// This block is injected into the system prompt of every product that
// produces such parallel sets. It constrains register and reasoning, not
// scope: every required item is still produced in full.

export const PARALLEL_ITEM_VARIETY_RULE = `PARALLEL-ITEM VARIETY RULE — where this report analyses several similar items in parallel (beneficiary classes, remediation or not-met duties, standing-preparedness domains, lawfulness limbs, control families, risk rows carrying narrative reasoning), each item's analysis MUST be reasoned independently from that item's own specific facts. Concretely:
  - Do NOT reuse one template sentence across items with only the subject noun swapped. Two items whose sentences differ only in a proper noun or a category name is a defect.
  - Vary sentence structure, opening, and length across items. Where one item opens with the determination, another may open with the operative fact or the constraint; do not run the same clause order down the whole set.
  - Anchor each item in the facts that are specific to it — the particular data, actor, deadline, control, or record entry that makes that item different from its neighbours. A sentence that would be equally true of every item in the set is boilerplate and must be rewritten or routed to information_needed.
  - Where two items genuinely share a determination, say so once and state plainly what distinguishes their treatment, rather than restating the shared sentence twice.
This rule constrains register only. It never reduces coverage: every item required by the schema is still analysed in full.`;
