// Acceptance tests for the consolidated GDPR registry (Part A).
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  EU_SUPERVISORY_AUTHORITIES,
  renderGdprCitationBlock,
  resolveArticle6Examples,
  resolveSupervisoryAuthorityName,
} from "../../../supabase/functions/_shared/dpia-jurisdiction-registry.ts";

Deno.test("Germany private-sector Bavaria → BayLDA (never BfDI)", () => {
  const name = resolveSupervisoryAuthorityName("DE", { sector: "private", land: "Bavaria" });
  assertStringIncludes(name, "BayLDA");
  assert(!name.includes("BfDI"));
});

Deno.test("Germany federal-public → BfDI", () => {
  const name = resolveSupervisoryAuthorityName("DE", { sector: "federal-public" });
  assertStringIncludes(name, "BfDI");
});

Deno.test("Netherlands → AP (not UODO)", () => {
  const name = resolveSupervisoryAuthorityName("NL");
  assertStringIncludes(name, "AP");
  assert(!name.includes("UODO"));
});

Deno.test("Article 6 examples — EU GDPR has no Article 6(11)", () => {
  const eu = resolveArticle6Examples("gdpr");
  assertStringIncludes(eu.directMarketing, "Recital 47");
  assertStringIncludes(eu.intraGroup, "Recital 48");
  assertStringIncludes(eu.networkSecurity, "Recital 49");
  for (const v of Object.values(eu)) assert(!v.includes("Article 6(11)"));
});

Deno.test("Article 6 examples — UK GDPR uses Article 6(11), recognised-LI is 6(1)(ea)", () => {
  const uk = resolveArticle6Examples("uk_gdpr");
  assertStringIncludes(uk.directMarketing, "Article 6(11)");
  assertStringIncludes(uk.recognisedLI, "Article 6(1)(ea)");
  assertStringIncludes(uk.recognisedLI, "Annex 1");
});

Deno.test("renderGdprCitationBlock includes regime, SAs, and the German Land caveat", () => {
  const txt = renderGdprCitationBlock({ regime: "gdpr", jurisdictions: ["FR", "NL", "DE"] });
  assertStringIncludes(txt, "RESOLVED GDPR CITATIONS");
  assertStringIncludes(txt, "FR: CNIL");
  assertStringIncludes(txt, "NL: AP");
  assertStringIncludes(txt, "never the BfDI");
  assertStringIncludes(txt, "Recital 47");
});

Deno.test("EU_SUPERVISORY_AUTHORITIES sanity: BE is GBA/APD (never APE), NL is AP (never UODO)", () => {
  assertStringIncludes(EU_SUPERVISORY_AUTHORITIES.BE, "GBA");
  assert(!EU_SUPERVISORY_AUTHORITIES.BE.includes("APE"));
  assert(!EU_SUPERVISORY_AUTHORITIES.NL.includes("UODO"));
  assertEquals(EU_SUPERVISORY_AUTHORITIES.GB, "ICO");
});
