// S-D2 / S-D4 / S-D6 / S-D7 (doc 80, 2026-08-27) — the DPA groundwork
// batch: the structured TOMs intake, the anchors registry, the DPO/EU-rep
// representations rule, and the Art. 28(2) authorisation-model toggle.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DPA_TOMS_TAXONOMY,
  renderTomsBlock,
  resolveTomsSelection,
} from "../../../supabase/functions/generate-dpa/_local/registry/dpa-toms-taxonomy.ts";
import {
  DPA_US_ANCHORS_LAST_VERIFIED,
  US_STATE_CITATION_ANCHORS,
} from "../../../supabase/functions/generate-dpa/_local/registry/dpa-us-citation-anchors.ts";

const INDEX_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/generate-dpa/index.ts", import.meta.url),
);

Deno.test("S-D2 — renderTomsBlock carries selected labels + details verbatim; empty input renders nothing", () => {
  const block = renderTomsBlock(["encryption_at_rest", "mfa"], "AES-256 with quarterly key rotation");
  assertStringIncludes(block, "CUSTOMER-SUPPLIED TECHNICAL AND ORGANISATIONAL MEASURES");
  assertStringIncludes(block, "Encryption of personal data at rest");
  assertStringIncludes(block, "Multi-factor authentication");
  assertStringIncludes(block, "AES-256 with quarterly key rotation");
  assertEquals(renderTomsBlock([], ""), "");
  assertEquals(renderTomsBlock(undefined, undefined), "");
});

Deno.test("S-D2 — unknown TOMs ids are dropped, never invented", () => {
  assertEquals(resolveTomsSelection(["mfa", "made_up_id"]).map((t) => t.id), ["mfa"]);
});

Deno.test("S-D2 — the prompt binds customer TOMs as the operative baseline", () => {
  assertStringIncludes(INDEX_SRC, "CUSTOMER-SUPPLIED TOMs GOVERN");
  assertStringIncludes(INDEX_SRC, "renderTomsBlock(body.securityMeasuresSelected");
});

Deno.test("S-D4 — the verified anchors live in the registry with a verification stamp; index consumes the same constant", () => {
  assertEquals(DPA_US_ANCHORS_LAST_VERIFIED, "2026-07");
  assertStringIncludes(US_STATE_CITATION_ANCHORS, "VERIFIED US-STATE CITATION ANCHORS");
  assertStringIncludes(US_STATE_CITATION_ANCHORS, "CONNECTICUT (CTDPA");
  assertStringIncludes(US_STATE_CITATION_ANCHORS, "CALIFORNIA BREACH SEQUENCING");
  // index.ts imports the registry and no longer declares the literal inline.
  assertStringIncludes(INDEX_SRC, 'from "./_local/registry/dpa-us-citation-anchors.ts"');
  assert(!INDEX_SRC.includes("const US_STATE_CITATION_ANCHORS = `"), "inline anchors literal must be gone");
});

Deno.test("S-D6 — the DPO/EU-rep where-required representations rule is present and never asserts appointment as fact", () => {
  assertStringIncludes(INDEX_SRC, "10a. DPO AND REPRESENTATIVE REPRESENTATIONS");
  assertStringIncludes(INDEX_SRC, "never assert as a fact that a DPO or representative IS appointed");
});

Deno.test("S-D7 — rule 9 branches on the record's authorisation model, defaulting to the standing general regime", () => {
  assertStringIncludes(INDEX_SRC, 'body.subprocessorAuthorizationModel === "specific"');
  assertStringIncludes(INDEX_SRC, "prior specific written authorisation obtained before the engagement commences");
  assertStringIncludes(INDEX_SRC, "The record selects (or defaults to) GENERAL authorisation");
});

Deno.test("S-D2 — taxonomy ids are unique and the UI mirror is byte-identical", async () => {
  const ids = DPA_TOMS_TAXONOMY.map((t) => t.id);
  assertEquals(new Set(ids).size, ids.length);
  const uiSrc = Deno.readTextFileSync(new URL("../../../src/data/dpa-toms-taxonomy.ts", import.meta.url));
  for (const t of DPA_TOMS_TAXONOMY) {
    assertStringIncludes(uiSrc, `{ id: "${t.id}", label: "${t.label}" }`);
  }
});
