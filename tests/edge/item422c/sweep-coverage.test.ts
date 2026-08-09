/**
 * ITEM 422-C DEFECT 3 (b) — LINKAGE TEST.
 *
 * Every citation-bearing surface in the ADMT report schema must be in the
 * sweep list. This is the test that would have caught the § 7021(b) escape:
 * `deadline_table` is citation-bearing (subsection + verbatim_quote) and no
 * detector swept it.
 */
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ADMT_REPORT_SCHEMA } from "../../../supabase/functions/run-admt-checker/_local/report-schemas/admt.ts";
import { ADMT_SWEPT_CITATION_SURFACES } from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-citation-range-sweep.ts";

const CITATION_BEARING_KEYS = new Set([
  "citation", "citations", "regulatory_citation", "subsection",
  "provision", "statutory_basis", "authority", "verbatim_quote",
  "element_verbatim", "condition_verbatim", "deadline_basis",
]);

function bearing(keys: readonly string[] | undefined): boolean {
  return !!keys && keys.some((k) => CITATION_BEARING_KEYS.has(k));
}

Deno.test("ITEM 422-C: every citation-bearing schema surface is swept", () => {
  const schema = ADMT_REPORT_SCHEMA as unknown as {
    entries?: Record<string, readonly string[]>;
    objects?: Record<string, readonly string[]>;
  };
  const derived: string[] = [];
  for (const [surface, keys] of Object.entries(schema.entries ?? {})) {
    if (bearing(keys)) derived.push(surface);
  }
  for (const [surface, keys] of Object.entries(schema.objects ?? {})) {
    if (bearing(keys)) derived.push(surface);
  }
  assert(derived.length > 0, "schema exposes citation-bearing surfaces");
  const missing = derived.filter((s) => !ADMT_SWEPT_CITATION_SURFACES.includes(s));
  assert(
    missing.length === 0,
    `citation-bearing surfaces missing from the sweep list: ${missing.join(", ")}`,
  );
});
