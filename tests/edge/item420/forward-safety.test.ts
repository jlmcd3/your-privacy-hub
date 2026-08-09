/**
 * ITEM 420 — FORWARD-SAFETY PROOF.
 *
 * A synthetic document whose `priority_actions` are TYPED ACTION RECORDS is
 * rendered through the customer PDF path. Asserts the failure mode this item
 * exists to prevent: nothing is dropped, the pinpoint appears once, the owner
 * appears once, and no markdown survives.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  coerceActionList,
  coerceActionListText,
  formatActionHeadline,
  isActionRecord,
  sortByRank,
} from "../../../supabase/functions/_shared/report-contracts/action-record.ts";
import { coerceNarrativeList } from "../../../supabase/functions/_shared/report-contracts/cppa-risk-shape.ts";
import { renderPriorityActionsSectionHtml } from "../../../supabase/functions/generate-report-pdf/_local/priority-actions-html.ts";

const TYPED = {
  priority_actions: [
    {
      action: "**Record a reasoned initiation decision** for the loyalty-analytics processing",
      severity: "high",
      deadline: "December 31, 2027",
      deadline_basis: "11 CCR § 7155(b)",
      statutory_basis: "11 CCR § 7152(a)(7)",
      owner_role: "Chief Compliance Officer",
      reserved_to: null,
      rank: 2,
    },
    {
      action: "1) Confirm the adequacy of the stated processing purpose",
      statutory_basis: "11 CCR § 7152(a)(1)",
      reserved_to: "qualified legal counsel",
      rank: 1,
    },
    {
      action: "Document safeguard sufficiency under 11 CCR § 7152(a)(6)",
      statutory_basis: "11 CCR § 7152(a)(6)",
      owner_role: "Chief Compliance Officer",
    },
  ],
};

Deno.test("ITEM 420 forward-safety: typed records are NOT dropped (the coerceNarrativeList failure mode)", () => {
  // The legacy helper maps non-strings to "" and filters them — proving why
  // this item exists. Its behaviour is deliberately unchanged.
  assertEquals(coerceNarrativeList(TYPED.priority_actions), undefined);

  const items = coerceActionList(TYPED.priority_actions);
  assert(items, "coerceActionList must return items");
  assertEquals(items!.length, 3, "no element may be dropped");
  for (const it of items!) assert(isActionRecord(it.record));
});

Deno.test("ITEM 420 forward-safety: pinpoint once, owner once, sentence case, no markdown", () => {
  for (const rec of TYPED.priority_actions) {
    const h = formatActionHeadline(rec as never);
    assert(!/\*\*|__|`/.test(h), `markdown survived: ${h}`);
    assertEquals(h[0], h[0].toUpperCase(), `not sentence case: ${h}`);
    assert(!/^\s*\d+[.)]/.test(h), `list numbering survived: ${h}`);

    if (rec.statutory_basis) {
      const n = h.split(rec.statutory_basis).length - 1;
      assertEquals(n, 1, `pinpoint appears ${n}x: ${h}`);
    }
    const owner = (rec as { reserved_to?: string | null }).reserved_to ||
      (rec as { owner_role?: string }).owner_role;
    if (owner) {
      const n = h.split(owner).length - 1;
      assertEquals(n, 1, `owner appears ${n}x: ${h}`);
    }
  }
});

Deno.test("ITEM 420 forward-safety: pinpoint already inline is not repeated", () => {
  const h = formatActionHeadline({
    action: "Document safeguard sufficiency under 11 CCR § 7152(a)(6)",
    statutory_basis: "11 CCR § 7152(a)(6)",
  });
  assertEquals(h.split("11 CCR § 7152(a)(6)").length - 1, 1);
});

Deno.test("ITEM 420 forward-safety: PDF section renders every typed record", () => {
  const html = renderPriorityActionsSectionHtml(TYPED);
  assertEquals(html.split('<div class="card">').length - 1, 3);
  assert(html.includes("Record a reasoned initiation decision"));
  assert(html.includes("Reserved to: qualified legal counsel."));
  assert(!html.includes("**"));
});

Deno.test("ITEM 420: mixed string/record arrays keep both", () => {
  const out = coerceActionListText([
    "A legacy string action.",
    { action: "A typed action", statutory_basis: "§ 7152(a)(1)" },
    "  ",
    42,
    null,
  ]);
  assertEquals(out, ["A legacy string action.", "A typed action. Statutory basis: § 7152(a)(1)."]);
});

Deno.test("ITEM 420: rank sort ascending, unranked sink last, stable", () => {
  const sorted = sortByRank([{ rank: 2, id: "b" }, { id: "x" }, { rank: 1, id: "a" }, { id: "y" }]);
  assertEquals(sorted.map((s) => s.id), ["a", "b", "x", "y"]);
});
