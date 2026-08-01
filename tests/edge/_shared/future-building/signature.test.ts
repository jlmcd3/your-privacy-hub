// F0 scenario-signature — unit tests (deterministic; property test for PI absence).
// Run: deno test supabase/functions/_shared/future-building/signature.test.ts

import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { computeScenarioSignature } from "./signature.ts";

const baseInput = {
  product: "cppa-risk-assessment",
  jurisdictionTags: ["cppa-ca"],
  enums: {
    q_revenue_band: "over_100m",
    q_consumer_band: "gte_1m",
    q18_admt_use: true,
    q_public_authority: false,
  },
  freeText: {
    purpose_description: "Fraud prevention for online payments",
    other_notes: "",
  },
  gateOutcomes: {
    "G.admt.q18": "pass" as const,
    "G.cohort_date": "pass" as const,
  },
};

Deno.test("signature is deterministic across identical inputs", async () => {
  const a = await computeScenarioSignature(baseInput);
  const b = await computeScenarioSignature(baseInput);
  assertEquals(a.hash, b.hash);
  assertEquals(a.hash.length, 64); // SHA-256 hex
});

Deno.test("signature is order-independent for enum + gate maps", async () => {
  const shuffled = {
    ...baseInput,
    enums: {
      q_public_authority: false,
      q18_admt_use: true,
      q_consumer_band: "gte_1m",
      q_revenue_band: "over_100m",
    },
    gateOutcomes: {
      "G.cohort_date": "pass" as const,
      "G.admt.q18": "pass" as const,
    },
  };
  const a = await computeScenarioSignature(baseInput);
  const b = await computeScenarioSignature(shuffled);
  assertEquals(a.hash, b.hash);
});

Deno.test("free-text CONTENT does not affect signature — only presence does", async () => {
  const withDifferentText = {
    ...baseInput,
    freeText: {
      purpose_description: "Something completely different here",
      other_notes: "",
    },
  };
  const a = await computeScenarioSignature(baseInput);
  const b = await computeScenarioSignature(withDifferentText);
  assertEquals(a.hash, b.hash, "content changes must not shift the hash");
});

Deno.test("free-text PRESENCE change DOES shift the signature", async () => {
  const nowPresent = {
    ...baseInput,
    freeText: {
      purpose_description: "Fraud prevention for online payments",
      other_notes: "now this has content",
    },
  };
  const a = await computeScenarioSignature(baseInput);
  const b = await computeScenarioSignature(nowPresent);
  assert(a.hash !== b.hash, "presence-map flip must shift the hash");
});

Deno.test("enum change shifts the signature", async () => {
  const swapped = { ...baseInput, enums: { ...baseInput.enums, q18_admt_use: false } };
  const a = await computeScenarioSignature(baseInput);
  const b = await computeScenarioSignature(swapped);
  assert(a.hash !== b.hash);
});

Deno.test("jurisdiction change shifts the signature", async () => {
  const swapped = { ...baseInput, jurisdictionTags: ["gdpr-eu"] };
  const a = await computeScenarioSignature(baseInput);
  const b = await computeScenarioSignature(swapped);
  assert(a.hash !== b.hash);
});

Deno.test("gate-outcome change shifts the signature", async () => {
  const swapped = {
    ...baseInput,
    gateOutcomes: { ...baseInput.gateOutcomes, "G.admt.q18": "block" as const },
  };
  const a = await computeScenarioSignature(baseInput);
  const b = await computeScenarioSignature(swapped);
  assert(a.hash !== b.hash);
});

Deno.test("PI-shaped keys in enums are REJECTED", async () => {
  await assertRejects(
    () => computeScenarioSignature({
      ...baseInput,
      enums: { ...baseInput.enums, customer_name: "Acme Corp" as unknown as string },
    }),
    Error,
    "PI-shaped key",
  );
});

Deno.test("PI-shaped keys in freeText are REJECTED", async () => {
  await assertRejects(
    () => computeScenarioSignature({
      ...baseInput,
      freeText: { ...baseInput.freeText, contact_email: "a@b.com" },
    }),
    Error,
    "PI-shaped key",
  );
});

// PROPERTY TEST — canonical string never contains any provided free-text content.
Deno.test("PROPERTY: canonical hashed string never contains free-text content", async () => {
  const secrets = [
    "TOP_SECRET_PII_VALUE_XYZ",
    "another_confidential_string_ABCDEFG",
    "SHOULD_NEVER_APPEAR_IN_HASH_INPUT",
  ];
  const input = {
    ...baseInput,
    freeText: {
      purpose_description: secrets[0],
      other_notes: secrets[1],
      description_2: secrets[2],
    },
  };
  const sig = await computeScenarioSignature(input);
  for (const s of secrets) {
    assert(
      !sig.canonical.includes(s),
      `canonical string leaked free-text content: ${s}`,
    );
  }
});
