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
// DOC 258 (2026-09-11, CEO on doc 257A item 7): the footer option is a
// homepage placement and is credited in full — no note pointing at a
// Recommendation, no Recommendation; the § 3.D sentence states the statute's
// test. The app/device settings option is credited the same way.
const FOOTER_SENTENCE = "The record places the “Do Not Sell or Share My Personal Information” link in the site footer, which is a placement on the homepage; Cal. Civ. Code § 1798.135(a)(1) requires a clear and conspicuous link on the homepage and prescribes no position on it.";
const APP_SENTENCE = "The record places the “Do Not Sell or Share My Personal Information” link in the settings area of an app or device without a homepage, where a consumer reasonably expects to find administrative tools; Cal. Civ. Code § 1798.135(a)(1) is applied to that placement.";
const RECOMMENDATION =
  "Confirm that the “Do Not Sell or Share My Personal Information” link is clear and conspicuous on the homepage (Cal. Civ. Code § 1798.135(a)(1)); the record places it in the footer only, which is credited on the information provided";
const NOTE = "The opt-out link is credited at its recorded footer placement; confirming that it is clear and conspicuous on the homepage appears among the Recommendations in § 4.D.";

Deno.test("doc258 item 7 — footer-only opt-out: credited in full as a homepage placement; no note, no Recommendation; the control is not weak", () => {
  const text = docText({ ...fixture("nestwave"), q9_opt_out: "Yes, but in footer only" });
  assert(!text.includes("Credited — footer placement"), "the placement label is retired");
  assertStringIncludes(text, FOOTER_SENTENCE);
  assert(!text.includes(NOTE));
  assert(!text.includes(RECOMMENDATION));
  assert(!text.includes("the opt-out mechanism operates without a formal or completed process"), "footer placement is not a weak control");
});

Deno.test("doc258 item 7 — the app/device settings option is credited with its placement sentence", () => {
  const text = docText({ ...fixture("nestwave"), q9_opt_out: "Yes — in the settings area of our app, smart TV or other device without a homepage" });
  assertStringIncludes(text, APP_SENTENCE);
  assert(!text.includes(RECOMMENDATION));
  assertStringIncludes(text, "Yes — in the settings area of our app, smart TV or other device without a homepage | Credited");
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
