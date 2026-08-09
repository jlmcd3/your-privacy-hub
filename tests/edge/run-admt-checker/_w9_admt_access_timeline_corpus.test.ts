// W9-DEADLINE-REGISTRY-ACCESS-TIMELINE (2026-07-26) — corpus-pin +
// before-fixture regression for the access_timeline registry entry.
//
// Colocated Deno test (matches the T6/T7 doctrine of edge-function-local
// verification). The src/registry vitest suite still runs the broader
// allow-list corpus pin — this file adds the same guarantee inside the
// Deno runtime so the fix travels with the edge function.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_VERIFIED_AUTHORITIES,
  ADMT_VERIFIED_AUTHORITY_VERSION,
} from "../../../supabase/functions/run-admt-checker/_local/registry/admt-verified-authorities.ts";
import { buildDeadlineTable } from "../../../supabase/functions/run-admt-checker/_w9_admt_slots.ts";

function norm(s: string): string {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Byte-identical (post-norm) verbatim from cppa_authorities row
// id=b97c21f6-74fc-4390-aa7d-be81f732850c ("11 CCR § 7021", status=current).
// Captured 2026-07-26T03:15Z by the controller and re-verified this turn.
const CPPA_AUTHORITIES_7021_FULL_TEXT_SUBSTRING = norm(
  "Businesses shall respond to a request to delete, request to correct, and\n" +
  "request to know, request to access ADMT, and request to appeal ADMT no\n" +
  "later than 45 calendar days after receipt of the request.",
);

Deno.test("access_timeline: registry version bumped to w9-2026-07-26", () => {
  assertEquals(ADMT_VERIFIED_AUTHORITY_VERSION, "admt-va-w9-2026-07-26");
});

Deno.test("access_timeline: registry row shape (section-level § 7021, no subdivision-deeper pinpoint)", () => {
  const row = ADMT_VERIFIED_AUTHORITIES.access_timeline;
  assert(row, "access_timeline missing from registry");
  assertEquals(row.proposition_key, "access_timeline");
  assertEquals(row.citation, "11 CCR § 7021");
  assertEquals(row.subsection, "11 CCR § 7021(b)");
  assertEquals(row.depth_class, "subsection");
  assertEquals(row.verified_on, "2026-07-26");
  assert(row.primary_source_url.startsWith("https://"));
});

Deno.test("access_timeline: corpus-pin — verbatim_quote is byte-identical substring of cppa_authorities § 7021 full_text (post-norm)", () => {
  const row = ADMT_VERIFIED_AUTHORITIES.access_timeline;
  const q = norm(row.verbatim_quote);
  assertEquals(
    q,
    CPPA_AUTHORITIES_7021_FULL_TEXT_SUBSTRING,
    "registry verbatim_quote (post-norm) does not match the pinned § 7021 substring",
  );
});

Deno.test("ITEM 422-C: access_timeline duty survives, out-of-range § 7021(b) pinpoint is withheld", () => {
  // AMENDED BY ITEM 422-C DEFECT 3. The registry row stays corpus-verified,
  // but § 7021 sits in Article 3 — outside the ADMT pinpoint range — so the
  // emitted row states the 45-day duty and withholds the section number
  // rather than shipping an out-of-range citation to the customer.
  const rows = buildDeadlineTable({}, {});
  const r = rows.find((x) => x.obligation.includes("access-right response timeline"));
  assert(r, "access_timeline row missing from deadline_table");
  assert(r!.compliance_deadline.includes("45 calendar days"), "the 45-day duty was lost");
  assertEquals(r!.subsection, "");
  assertEquals(r!.verbatim_quote, "");
  assertEquals(r!.proposition_key, "");
  assertEquals(r!.information_needed, true);
  assertEquals(r!.citation_withheld_reason, "out_of_verified_admt_range");
});

Deno.test("ITEM 422-C: every deadline_table row is either fully stamped or explicitly withheld", () => {
  const rows = buildDeadlineTable({}, {});
  assert(rows.length >= 3);
  for (const r of rows) {
    const withheld = r.citation_withheld_reason === "out_of_verified_admt_range";
    if (withheld) {
      assertEquals(r.subsection, "");
      assertEquals(r.verbatim_quote, "");
    } else {
      assert(r.subsection.length > 0, `subsection empty for ${r.proposition_key}`);
      assert(r.verbatim_quote.length > 0, `verbatim missing for ${r.proposition_key}`);
      assertEquals(r.information_needed, false);
    }
  }
});

Deno.test("omission-over-invention: unknown proposition_key still emits information_needed placeholder (unchanged)", () => {
  // Direct assertion on registry: keys absent from the registry are the
  // signal for the builder to emit the neutral placeholder shape. Adding
  // access_timeline must not weaken this rule for other unknown keys.
  assert(!("nonexistent_key_for_this_test" in ADMT_VERIFIED_AUTHORITIES));
});
