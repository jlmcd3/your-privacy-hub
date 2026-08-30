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

  // PANEL BIO-1 (2026-08-30): the biometric fixture's scenario narrates a
  // model BIPA program, but the invoke body used to carry only the five
  // legacy enum fields — so the published sample answered "not supplied"
  // for the release, retention schedule, and vendor DPA its own scenario
  // describes. Guard the practice facts against being trimmed back out.
  it("the biometric fixture supplies the practice facts its scenario narrates", async () => {
    const { SAMPLE_FIXTURES } = await import("@/lib/sampleFixtures");
    const bio = SAMPLE_FIXTURES.find((f) => f.tool_slug === "biometric");
    expect(bio, "no biometric fixture").toBeTruthy();
    const body = (bio!.fixture.invoke_body_extras ?? {}) as Record<string, unknown>;
    expect(body.consent_artifact_type).toBe("Standalone written release signed before collection");
    expect(String(body.release_artifact_description ?? "")).toContain("Standalone written BIPA release");
    expect(String(body.retention_schedule_text ?? "")).toContain("whichever occurs first");
    expect(body.retention_policy_public).toBe("Yes");
    expect(String(body.disclosure_recipients ?? "")).toContain("BIPA-compliant data processing agreement");
    expect(body.notice_before_collection).toBe("Written notice given before collection");
  });
});
