// PROMPT 1 2026-08-11 — quote-aware truncation + risk-scoring attribution.
// Deterministic string/template behaviour in the DPIA skeleton assembler.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  composeNecessityBody,
  composeRiskBody,
  firstSentencesQuoteAware,
} from "../ltp/dpia-skeleton-assemble.ts";

const QUOTED_WHY =
  'The company records the purpose as "We collect the badge scan. We match it to the roster. ' +
  'We retain it for 30 days." The recorded safeguards therefore answer the necessity question ' +
  "on this record.";

Deno.test("quote-aware: periods inside a quoted span are not sentence boundaries", () => {
  const out = firstSentencesQuoteAware(QUOTED_WHY, 2);
  assert(out.includes("We retain it for 30 days."), out);
  assert(out.includes("The recorded safeguards therefore answer the necessity question"), out);
});

Deno.test("quote-aware: curly quotes behave the same", () => {
  const text = "It says \u201COne. Two. Three.\u201D That settles it. A third sentence follows.";
  const out = firstSentencesQuoteAware(text, 1);
  assert(out.includes("Three.\u201D"), out);
  assert(out.includes("That settles it."), out);
  assert(!out.includes("A third sentence"), out);
});

// PROMPT 9I.1 item 7 (CEO-ratified 2026-08-16) — every Section 3 customer
// quote is CLAUSE-BOUNDED, so the embedded three-sentence quote is bounded to
// its first clause. The property these two tests protect — the conclusion
// after the quote survives truncation — is unchanged and still asserted.
Deno.test("necessity body keeps the conclusion after a 3-period embedded quote", () => {
  const body = composeNecessityBody({ necessity_findings: [{ why: QUOTED_WHY }] });
  assert(body.includes('"We collect the badge scan"'), body);
  assert(!body.includes("We retain it for 30 days."), body);
  assert(
    body.includes("The recorded safeguards therefore answer the necessity question"),
    body,
  );
});

Deno.test("proportionality body keeps the conclusion after a 3-period embedded quote", () => {
  const body = composeNecessityBody({ proportionality: [{ why: QUOTED_WHY }] });
  assert(body.includes('"We collect the badge scan"'), body);
  assert(!body.includes("We retain it for 30 days."), body);
  assert(body.includes("necessity question"), body);
});

Deno.test("risk body attributes scoring to the assessment, not the customer", () => {
  const body = composeRiskBody(
    {
      risk_register: [
        {
          risk_label: "Unauthorised access to badge records",
          likelihood: "possible",
          severity: "significant",
          inherent_band: "medium",
        },
      ],
    },
    {} as never,
  );
  // Ruling 2026-08-12: the 8A ratified template is authoritative. This test
  // protects the ATTRIBUTION PROPERTY (scoring belongs to the assessment, never
  // the customer), not any one superseded sentence.
  assert(body.includes("under this assessment's pre-set risk taxonomy"), body);
  assert(body.includes("possible"), body);
  assert(body.includes("significant"), body);
  assertEquals(body.includes("company's answers put likelihood"), false);
  assertEquals(/\bthe company (?:puts|rates|scores|places) (?:likelihood|severity)\b/i.test(body), false);
  assertEquals(/\bthe company's answers (?:put|rate|score|place)\b/i.test(body), false);
});
