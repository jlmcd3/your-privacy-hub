// Product Test run 6001444d (2026-09-19) — two LIA fixes.
//
// 1. On a record whose interest statement (or interest type, or alternatives
//    rationale) is missing, the open-determination sentence named what would
//    establish the element by its internal field path ("What would establish
//    it: purpose_details.interest_statement — the interest pursued …"): three
//    critical raw-key leaks and six L-ENUM hits. The customer-facing sentence
//    now carries the plain-English item only; the machine-readable
//    information_needed keeps its path anchor.
// 2. The Table of Authorities' iff-cited filter matched the full form
//    ("Article 5(1)(c) GDPR") and its bare pinpoint, never the abbreviated
//    house form the typed deliverables use ("GDPR Art. 5(1)(c)"), so a body
//    citation of the Article 5 principles went unlisted.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PANEL_LIA } from "../../../src/lib/ptestPanels/lia.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { renderLiaToa } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
// The panel fixture the run graded (thin-one variants of p01).
const FRAUD = PANEL_LIA.find((g) => g.id === "lia-p01-bank-transaction-fraud-se")!;

const RAW_PATH_AFTER_COLON = /What would establish (?:it|them): [a-z_]+\.[a-z_]+/;

Deno.test("run 6001444d — a missing interest statement is named in plain words, never by its field path", () => {
  const intake = clone(FRAUD.intake);
  delete (intake.purpose_details as Bag).interest_statement;
  const text = JSON.stringify(buildLiaDeliverables(intake));
  assertStringIncludes(text, "What would establish");
  assert(!RAW_PATH_AFTER_COLON.test(text), text.match(/What would establish[^"]{0,160}/)?.[0]);
  // The record's own ask, capitalised, with the field path gone.
  assertStringIncludes(text, "What would establish it: The interest itself, stated specifically enough");
  // The machine-readable ask keeps its anchor.
  assertStringIncludes(text, "purpose_details.interest_statement — the interest");
});

Deno.test("run 6001444d — a missing alternatives rationale is named in plain words too", () => {
  const intake = clone(FRAUD.intake);
  const nd = intake.necessity_details as Bag | undefined;
  if (nd) delete nd.alternatives_rationale;
  delete intake.alternatives_considered;
  const text = JSON.stringify(buildLiaDeliverables(intake));
  assert(!RAW_PATH_AFTER_COLON.test(text), text.match(/What would establish[^"]{0,160}/)?.[0]);
});

Deno.test("run 6001444d — the Table of Authorities lists an Article 5 principle the body cites in the abbreviated form", () => {
  const toa = renderLiaToa(["Article 6(1)(f) GDPR", "Article 5(1)(c) GDPR", "Article 5(2) GDPR"],
    "The standard is GDPR Art. 5(1)(c): adequate, relevant and limited. Article 6(1)(f) supplies the basis.");
  assertStringIncludes(toa, "Article 5(1)(c) GDPR");
  assertStringIncludes(toa, "Article 6(1)(f) GDPR");
  assert(!toa.includes("Article 5(2) GDPR"), "an uncited candidate stays out");
  assertEquals(renderLiaToa(["Article 5(1)(b) GDPR"], "No citation here."), "");
});
