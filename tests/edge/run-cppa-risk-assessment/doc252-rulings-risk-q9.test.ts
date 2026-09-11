// DOC 252 §10 item 3 (CEO-ruled 2026-09-11) — Q9 "Yes, but in footer only"
// is credited AT ITS PLACEMENT: the § 3.D table reads "Credited — footer
// placement", the § 3.D sentence points at a Recommendation, and § 4.D
// carries the Recommendation to confirm the § 1798.135(a)(1) clear-and-
// conspicuous standard on the homepage. Not a weak control; the disposition
// input is unchanged (ledger F3).

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleRiskSkeletonDocument } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;
const B1 = "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
function fixture(name: string): Bag {
  return JSON.parse(Deno.readTextFileSync(new URL(`../fixtures/batch13/${name}.json`, import.meta.url))) as Bag;
}
function docText(intake: Bag): string {
  return skeletonDocumentToText(assembleRiskSkeletonDocument({ scope_and_triggers: { narrative: [B1] } } as never, intake as never).document);
}
const RECOMMENDATION =
  "Confirm that the “Do Not Sell or Share My Personal Information” link is clear and conspicuous on the homepage (Cal. Civ. Code § 1798.135(a)(1)); the record places it in the footer only, which is credited on the information provided";
const NOTE = "The opt-out link is credited at its recorded footer placement; confirming that it is clear and conspicuous on the homepage appears among the Recommendations in § 4.D.";

Deno.test("doc252 item 3 — footer-only opt-out: placement label, § 3.D note and the § 4.D Recommendation render; the control is not weak", () => {
  const text = docText({ ...fixture("nestwave"), q9_opt_out: "Yes, but in footer only" });
  assertStringIncludes(text, "Credited — footer placement");
  assertStringIncludes(text, NOTE);
  assertStringIncludes(text, RECOMMENDATION);
  assert(!text.includes("the opt-out mechanism operates without a formal or completed process"), "footer placement is not a weak control");
});

Deno.test("doc252 item 3 — prominent placement is byte-unchanged: plain 'Credited', no note, no Recommendation", () => {
  const text = docText({ ...fixture("nestwave"), q9_opt_out: "Yes, prominently on homepage" });
  assert(!text.includes("Credited — footer placement"), text.slice(0, 200));
  assert(!text.includes(NOTE));
  assert(!text.includes(RECOMMENDATION));
});

Deno.test("doc252 item 3 — 'No' and 'In progress' keep their not-credited treatment", () => {
  const no = docText({ ...fixture("nestwave"), q9_opt_out: "No" });
  assertStringIncludes(no, "Not credited — absent");
  assert(!no.includes(RECOMMENDATION));
  const pending = docText({ ...fixture("nestwave"), q9_opt_out: "In progress" });
  assertStringIncludes(pending, "Not credited — in progress");
  assert(!pending.includes(RECOMMENDATION));
});
