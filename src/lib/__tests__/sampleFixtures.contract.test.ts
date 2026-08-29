// ALL-PRODUCTS-TEST — every sample fixture must satisfy its canonical intake
// contract (verbatim enum labels, required-always presence, array shapes).
// This is the golden-data-set guarantee: a fixture that drifts from the form's
// real emitted shape fails HERE, not as a mysteriously low grade downstream.

import { describe, expect, it } from "vitest";
import { contractCheckAll } from "@/lib/sampleFixtureContractCheck";
import { preflightFixtures } from "@/lib/sampleFixturePreflight";

describe("sample fixtures — canonical intake-contract conformance", () => {
  const results = contractCheckAll();

  it("covers every contract-backed product at least once", () => {
    const contractSlugs = results.filter((r) => !r.no_contract).map((r) => r.tool_slug);
    for (const slug of [
      "li_assessment", "dpia", "governance", "cppa_risk", "cppa_cyber",
      "cppa_admt", "biometric", "ir_playbook", "dpa", "registration",
    ]) {
      expect(contractSlugs, `no fixture for ${slug}`).toContain(slug);
    }
  });

  for (const r of results.filter((x) => !x.no_contract)) {
    it(`${r.tool_slug}/${r.variant} conforms to its intake contract`, () => {
      const detail = r.violations
        .map((v) => `${v.key}: ${v.reason}${v.options ? ` (options: ${v.options.slice(0, 6).join(" | ")}${v.options.length > 6 ? " …" : ""})` : ""}`)
        .join("\n");
      expect(r.ok, detail).toBe(true);
    });
  }

  it("shape-level preflight still passes for every fixture (incl. session-shaped)", () => {
    const bad = preflightFixtures().filter((r) => !r.ok);
    expect(
      bad.map((b) => `${b.label}: ${b.issues.map((i) => `${i.key}(${i.problem})`).join(", ")}`).join("\n"),
    ).toBe("");
  });
});
