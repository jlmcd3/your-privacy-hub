// B3A5DD01 (quality batch, 2026-08-28) — Governance fix (D1D2B3B8-G4).
//   A partially-evidenced Art. 30(1) element never set information_needed
//   (every other branch in this file does), so its remediation item
//   rendered with NO Action line: "10. Categories of data subjects and of
//   personal data — The record carries: data_categories = ... ." full stop.
//   The missing evidence key(s) are now named specifically.
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildArt30ElementFindings } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";

type Bag = Record<string, unknown>;

Deno.test("D1D2B3B8-G4 — a partially-evidenced element names the missing key in information_needed", () => {
  const findings = buildArt30ElementFindings({
    data_categories: ["Contact details", "Employee records"],
    // special_categories_list intentionally absent
  } as never);
  const el = findings.find((f) => f.key === "art30_c") as unknown as Bag;
  assert(el, "the art30_c finding must exist");
  assert(el.verdict === "partially_satisfied");
  assertStringIncludes(String(el.information_needed ?? ""), "special_categories_list");
  assertStringIncludes(String(el.information_needed ?? ""), "Article 30(1)(c)");
});

Deno.test("D1D2B3B8-G4 — a fully-evidenced element sets no information_needed (unchanged)", () => {
  const findings = buildArt30ElementFindings({
    data_categories: ["Contact details"],
    special_categories_list: ["Health data"],
  } as never);
  const el = findings.find((f) => f.key === "art30_c") as unknown as Bag;
  assert(el.verdict === "satisfied");
  assert(el.information_needed === undefined);
});

Deno.test("D1D2B3B8-G4 — a fully-empty element keeps its existing record_insufficient information_needed (unchanged)", () => {
  const findings = buildArt30ElementFindings({} as never);
  const el = findings.find((f) => f.key === "art30_c") as unknown as Bag;
  assert(el.verdict === "record_insufficient");
  assertStringIncludes(String(el.information_needed ?? ""), "Article 30(1)(c)");
});
