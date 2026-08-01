// CARRIED-1 — Coverage for supabase/functions/_shared/fsor-anchor-block.ts.
//
// Asserts:
//   (1) renderRow format inside a built block matches the canonical shape
//       [Agency position — FSOR: <citation>, <package>, <page_ref>]: <summary>
//   (2) Empty-spec (no matching rows) path warns and ships an empty block —
//       never throws, never emits a header.
//   (3) Deterministic ordering: given specs in a fixed order, the block
//       returns the rule labels in the same order (spec order preserved).
//   (4) The block's guidance header contains the CARRIED-2 warning against
//       echoing the bracketed anchor format into report prose.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildFsorAnchorBlock, type FsorAnchorSpec } from "../../../supabase/functions/_shared/fsor-anchor-block.ts";

interface StubRow {
  regulation_citation: string;
  page_ref: string | null;
  fsor_package: string | null;
  agency_position_summary: string | null;
}

function makeStubSupabase(rowsByCitation: Record<string, StubRow[]>) {
  return {
    from(_table: string) {
      let citationFilter: string[] = [];
      let ilike: string | null = null;
      const chain: any = {
        select() { return chain; },
        not() { return chain; },
        in(_col: string, vals: string[]) { citationFilter = vals; return chain; },
        ilike(_col: string, pattern: string) { ilike = pattern; return chain; },
        limit(_n: number) {
          const matched: StubRow[] = [];
          for (const c of citationFilter) {
            for (const r of rowsByCitation[c] ?? []) matched.push(r);
          }
          const filtered = ilike
            ? matched.filter((r) =>
                (r.agency_position_summary ?? "").toLowerCase().includes(
                  ilike!.replace(/%/g, "").toLowerCase(),
                ))
            : matched;
          return Promise.resolve({ data: filtered, error: null });
        },
      };
      return chain;
    },
  };
}

Deno.test("fsor-anchor-block: renderRow shape and deterministic ordering", async () => {
  const supabase = makeStubSupabase({
    "11 CCR § 7001(ddd)": [{
      regulation_citation: "11 CCR § 7001(ddd)",
      page_ref: "Appendix, p. 6",
      fsor_package: "ccpa-2025-cyber-risk-admt",
      agency_position_summary: "The Agency clarified that advertising exclusions apply narrowly.",
    }],
    "11 CCR § 7001(e)(1)": [{
      regulation_citation: "11 CCR § 7001(e)(1)",
      page_ref: "Appendix, p. 20",
      fsor_package: "ccpa-2025-cyber-risk-admt",
      agency_position_summary: "The Agency addressed the three-part human-involvement test.",
    }],
  });

  const specs: FsorAnchorSpec[] = [
    { ruleLabel: "Rule 9 advertising exclusion (§ 7001(ddd))", citations: ["11 CCR § 7001(ddd)"], maxRows: 1 },
    { ruleLabel: "Rule 13 human-involvement three-part test (§ 7001(e)(1))", citations: ["11 CCR § 7001(e)(1)"], maxRows: 1 },
  ];

  const block = await buildFsorAnchorBlock(supabase, specs);
  assert(block.length > 0, "expected non-empty block");

  // (1) renderRow shape.
  assertStringIncludes(
    block,
    "[Agency position — FSOR: 11 CCR § 7001(ddd), ccpa-2025-cyber-risk-admt, Appendix, p. 6]: The Agency clarified that advertising exclusions apply narrowly.",
  );

  // (3) Deterministic ordering: advertising label appears before human-involvement.
  const idxAd = block.indexOf("Rule 9 advertising exclusion");
  const idxHum = block.indexOf("Rule 13 human-involvement");
  assert(idxAd >= 0 && idxHum >= 0, "both rule labels must render");
  assert(idxAd < idxHum, "spec order must be preserved (advertising before human-involvement)");

  // (4) CARRIED-2 warning present in header.
  assertStringIncludes(block, "DRAFTING CONTEXT ONLY");
  assertStringIncludes(block, "NEVER echo the bracketed");
});

Deno.test("fsor-anchor-block: empty-spec warn-and-ship path returns empty string", async () => {
  const supabase = makeStubSupabase({}); // no rows anywhere.
  const specs: FsorAnchorSpec[] = [
    { ruleLabel: "Never matches (§ 9999)", citations: ["11 CCR § 9999"], maxRows: 1 },
  ];

  const block = await buildFsorAnchorBlock(supabase, specs);
  assertEquals(block, "", "empty-spec must ship empty block (no header)");
});

Deno.test("fsor-anchor-block: partial-match path emits only rules with rows", async () => {
  const supabase = makeStubSupabase({
    "11 CCR § 7001(ddd)": [{
      regulation_citation: "11 CCR § 7001(ddd)",
      page_ref: "p. 11",
      fsor_package: "ccpa-2025-cyber-risk-admt",
      agency_position_summary: "Behavioural advertising was removed from the significant-decision definition.",
    }],
  });

  const specs: FsorAnchorSpec[] = [
    { ruleLabel: "Rule with rows (§ 7001(ddd))", citations: ["11 CCR § 7001(ddd)"], maxRows: 1 },
    { ruleLabel: "Rule without rows (§ 9999)", citations: ["11 CCR § 9999"], maxRows: 1 },
  ];

  const block = await buildFsorAnchorBlock(supabase, specs);
  assertStringIncludes(block, "Rule with rows");
  assert(!block.includes("Rule without rows"), "unmatched rule must not appear in block");
});
