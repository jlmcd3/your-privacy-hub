// "Other" data-category Art. 9 guard (CEO-ratified 2026-08-26 batch ruling).
// Pins the ratified scope: the guard fires ONLY in the pure-bypass state
// ("Other" selected + no enum special category + no Art. 9(2) condition
// recorded + free text mentioning a special-category class), emits the
// ratified open-item formula verbatim, and NEVER asserts Art. 9 applies.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  art9OtherLexiconHit,
  buildProcessingInventory,
  buildSection2Coverage,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";

const RATIFIED_FORMULA =
  "the described data may constitute special-category data; confirm and identify an Art. 9(2) condition";

function intakeWith(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    organization_name: "Test Org Ltd",
    jurisdictions: ["EU (GDPR)"],
    data_categories: ["Other"],
    article_9_condition: "",
    description: "We process staff records for scheduling.",
    ...overrides,
  };
}

function guardRows(intake: Record<string, unknown>) {
  const inv = buildProcessingInventory(intake);
  return buildSection2Coverage(intake, { processing_inventory: inv })
    .special_category_conditions.filter((r) => r.item === "Other");
}

Deno.test("bypass state + genetic-data free text: the guard fires with the ratified formula", () => {
  const rows = guardRows(intakeWith({
    description: "We collect genetic test results from applicants for wellness scoring.",
  }));
  assertEquals(rows.length, 1);
  assertEquals(rows[0].status, "record_insufficient");
  assertEquals(rows[0].information_needed, RATIFIED_FORMULA);
  assertEquals(rows[0].ask_class, "ask_art9_other_category");
  assertStringIncludes(rows[0].justification, "may constitute special-category data");
  // Never an assertion that Art. 9 applies: no condition label is invented.
  assertEquals(rows[0].condition_label, "");
});

Deno.test("innocuous free text: no guard row", () => {
  assertEquals(guardRows(intakeWith({ description: "We schedule shifts for retail staff." })).length, 0);
});

Deno.test("Art. 9(2) condition already recorded: guard suppressed", () => {
  const rows = guardRows(intakeWith({
    description: "We collect genetic test results.",
    article_9_condition: "Explicit consent (Art. 9(2)(a))",
  }));
  assertEquals(rows.length, 0);
});

Deno.test("enum special category selected: the existing ask covers it, guard suppressed", () => {
  const inv = buildProcessingInventory(intakeWith({
    data_categories: ["Other", "Health or medical data"],
    description: "We collect genetic test results.",
  }));
  const rows = buildSection2Coverage(
    intakeWith({
      data_categories: ["Other", "Health or medical data"],
      description: "We collect genetic test results.",
    }),
    { processing_inventory: inv },
  ).special_category_conditions;
  // The enum item's own ask fires; no separate "Other" guard row.
  assert(rows.some((r) => r.item === "Health or medical data"));
  assertEquals(rows.filter((r) => r.item === "Other").length, 0);
});

Deno.test('"Other" not selected: free text alone never fires the guard', () => {
  assertEquals(
    guardRows(intakeWith({
      data_categories: ["Contact details"],
      description: "We collect genetic test results.",
    })).length,
    0,
  );
});

Deno.test("guard row reaches the gap ledger through the existing s2c harvest", async () => {
  const { buildGapLedger } = await import(
    "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts"
  );
  const intake = intakeWith({
    description: "We infer sexual orientation from browsing history.",
  });
  const inv = buildProcessingInventory(intake);
  const s2c = buildSection2Coverage(intake, { processing_inventory: inv });
  // The ledger builder iterates every finding family; empty arrays and a
  // minimal decision are honest here — only the s2c harvest is under test.
  const ledger = buildGapLedger(intake, {
    necessity_findings: [],
    proportionality: [],
    risk_register: [],
    art36_consultation: { required: false } as never,
    legal_basis: [],
    decision: { blockers: [] } as never,
    processing_inventory: inv,
    section2_coverage: s2c,
  } as Parameters<typeof buildGapLedger>[1]);
  assert(
    ledger.some((e) => (e as { dimensions?: string }).dimensions === RATIFIED_FORMULA),
    JSON.stringify(ledger.map((e) => (e as { dimensions?: string }).dimensions)),
  );
});

Deno.test("lexicon: each Art. 9(1) class detects; word boundaries hold", () => {
  assertEquals(art9OtherLexiconHit({ description: "records of trade union membership" }), "trade-union membership");
  assertEquals(art9OtherLexiconHit({ description: "patients' clinical notes" }), "data concerning health");
  assertEquals(art9OtherLexiconHit({ description: "fingerprint templates" }), "biometric data");
  assertEquals(art9OtherLexiconHit({ description: "political opinions of members" }), "political opinions");
  // "unionized codebase" must not trip trade-union; "ethical review" must not trip ethnic.
  assertEquals(art9OtherLexiconHit({ description: "a unionized codebase under ethical review" }), null);
  assertEquals(art9OtherLexiconHit({}), null);
});
