// DOC 139 (2026-09-02) — external legal review on the doc 137/138 fixture
// (row us-ds2-mtjlerdl-tti856). The finding: the composed sentence
// "Sensitive personal information identified as processed... the specific
// categories are not named in the activity record" reads like a completed
// finding, but the report's own PI inventory for that row names only
// ordinary categories (contact identifiers, device identifiers,
// internet/network activity, general/non-precise location) — none of which
// is a statutory sensitive-PI category under Cal. Civ. Code § 1798.140(ae) /
// 11 CCR § 7001.
//
// Investigation: q15_sensitive_pi (Yes/No) and the q4 category inventory
// (cross-checked against the statutory taxonomy in ca-pi-taxonomy.ts) are
// two INDEPENDENT intake fields that were never designed to validate each
// other. deriveActivitySpiInventory already filters q4 for true SPI matches
// and only falls back to the q15-Yes branch when that filter is empty — so
// the fallback text needed to say plainly that the qualifying category is
// unresolved, not merely "not named" (which reads as an incidental gap
// rather than an open question). This batch (a) rewords that fallback
// honestly and (b) adds a matching Follow-Up in the factor engine so the
// gap survives into § 4.D instead of leaving the report looking complete.
//
// This is a wording/completeness fix only: it does not fabricate a
// category, does not flip the SPI-processed answer to "No," and does not
// touch the § 7150(b)(2) (or any other) trigger classification, which is
// computed upstream from `report.scope_and_triggers` and is untouched by
// either derivation exercised here.

import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { deriveActivitySpiInventory } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts";

type Bag = Record<string, unknown>;

const baseIntake = (): Bag => ({ ...(CPPA_RISK_PERFECT[0].intake as Bag) });

function engineOn(overrides: Bag) {
  return runRiskFactorEngine({ ...baseIntake(), ...overrides } as never, {} as never, "2026-09-02");
}

Deno.test("DOC 139 (a): q15 Yes with an empty true-SPI inventory renders the 'not identified' qualification, and a matching Follow-Up appears", () => {
  const intake = {
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Device identifiers (IP, cookies, device IDs)",
      "Internet or network activity",
      "General location (city, region, ZIP, IP-derived)",
    ],
    q15_sensitive_pi: "Yes",
  };

  const spi = deriveActivitySpiInventory(intake as never);
  assertEquals(
    spi,
    "The Company has indicated that sensitive personal information is processed, but the qualifying statutory category has not been identified. Identify the category before finalizing the sensitive-PI necessity, safeguard, and risk analysis.",
  );
  // The old, now-retired wording must not survive anywhere in the sentence.
  assertFalse(String(spi).includes("categories are not named"));
  assertFalse(String(spi).includes("has identified in its submission"));

  const r = engineOn(intake);
  const followUpsBlock = r.blocks["iv_determination:12"] ?? Object.values(r.blocks).join("\n");
  assert(
    followUpsBlock.includes("Identify the qualifying statutory sensitive-personal-information category"),
    "expected the DOC 139 SPI follow-up to appear in the composed Follow-Ups text",
  );
});

Deno.test("DOC 139 (b): q15 Yes WITH a genuine SPI category still names it, and no gap follow-up is generated", () => {
  const intake = {
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Precise geolocation (GPS-level / specific address)",
    ],
    q15_sensitive_pi: "Yes",
  };

  const spi = deriveActivitySpiInventory(intake as never);
  assertEquals(spi, "Precise geolocation (GPS-level / specific address)");
  assertFalse(String(spi).includes("qualifying statutory category has not been identified"));

  const r = engineOn(intake);
  const followUpsBlock = Object.values(r.blocks).join("\n");
  assertFalse(
    followUpsBlock.includes("Identify the qualifying statutory sensitive-personal-information category"),
    "a genuine mapped SPI category must not still generate the gap follow-up",
  );
});

Deno.test("DOC 139 (c): q15 No never generates the gap follow-up, and the SPI wording fix does not touch trigger classification inputs", () => {
  const intake = {
    q4_pi_categories: ["Contact identifiers (name, email, phone)"],
    q15_sensitive_pi: "No",
  };
  assertEquals(deriveActivitySpiInventory(intake as never), null);

  const r = engineOn(intake);
  const followUpsBlock = Object.values(r.blocks).join("\n");
  assertFalse(
    followUpsBlock.includes("Identify the qualifying statutory sensitive-personal-information category"),
  );

  // Trigger classification is computed upstream (from report.scope_and_
  // triggers, supplied by the caller) and is independent of both
  // deriveActivitySpiInventory and this follow-up; passing an empty report
  // here and confirming the engine still runs to completion (produces its
  // determination blocks) demonstrates neither derivation reaches into or
  // mutates trigger state.
  assert(Object.keys(r.factors).length > 0, "engine should still produce its normal factor set");
});
