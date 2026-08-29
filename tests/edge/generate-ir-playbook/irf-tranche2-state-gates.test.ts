// IR-F TRANCHE 2 (2026-08-29) — per-state walk gates for California, Texas
// and New York, each formulation condensed from the statute's own text
// fetched fresh from the state's official code publisher (see the
// STATE_WALK_GATES registry comment in us-state-duties.ts). The walk now
// resolves the data-element and safe-harbour gates PER STATE for gated
// states; ungated states keep tranche 1's generic walk only.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { STATE_WALK_GATES } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/us-state-duties.ts";

type Bag = Record<string, unknown>;

function mk(over: Bag = {}): Bag {
  return {
    organizationName: "Cobalt Retail Inc",
    discoveryDateTime: "2026-08-20T10:00",
    cause: "Phishing / credential compromise",
    dataTypes: ["Names and contact details", "Government IDs / SSN"],
    affectedCount: "100–1,000",
    jurisdictions: ["California"],
    contained: "Yes",
    organisationType: "Company",
    ...over,
  };
}

function textFor(over: Bag = {}): string {
  const intake = mk(over);
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  return JSON.stringify(assembleIRSkeletonDocument(report, intake));
}

// ── Registry shape ──────────────────────────────────────────────────────────

Deno.test("IR-F2: exactly CA/TX/NY are gated this tranche, each verified and citing its own code", () => {
  assertEquals(Object.keys(STATE_WALK_GATES).sort(), ["California", "New York", "Texas"]);
  for (const [state, g] of Object.entries(STATE_WALK_GATES)) {
    assertEquals(g.verified_on, "2026-08-29", state);
    assert(g.element_limbs.length >= 3, state);
    assert(g.breach_definition.includes("§"), state);
    assert(g.encryption_formulation.includes("§"), state);
  }
  // Only NY carries a statutory harm carve-out among the three.
  assert(STATE_WALK_GATES["New York"].harm_carveout);
  assertEquals(STATE_WALK_GATES["California"].harm_carveout, undefined);
  assertEquals(STATE_WALK_GATES["Texas"].harm_carveout, undefined);
});

Deno.test("IR-F2: every limb's intake_types are exact members of the IR DATA_TYPES enum", async () => {
  const { IR_DATA_TYPES } = await import(
    "../../../supabase/functions/_shared/intake-contracts/ir-playbook.ts"
  );
  const valid = new Set<string>(IR_DATA_TYPES as readonly string[]);
  for (const g of Object.values(STATE_WALK_GATES)) {
    for (const limb of g.element_limbs) {
      for (const t of limb.intake_types) assert(valid.has(t), t);
    }
  }
});

// ── Per-state resolution ────────────────────────────────────────────────────

Deno.test("IR-F2: names + government IDs engage California's name-plus-element limb outright", () => {
  const text = textFor();
  assertStringIncludes(text, "California, walked.");
  assertStringIncludes(text, "the following fall within the statute's covered elements: Government IDs / SSN");
  assertStringIncludes(text, "§ 1798.82(h)(1)(A)–(B)");
  assert(!text.includes("turns on whether names accompany them"));
});

Deno.test("IR-F2: government IDs WITHOUT names resolve to the name-combination conditional", () => {
  const text = textFor({ dataTypes: ["Government IDs / SSN"] });
  assertStringIncludes(text, "only in combination with the individual's name");
  assertStringIncludes(text, "turns on whether names accompany them");
});

Deno.test("IR-F2: credentials engage California's (h)(2) limb with no name condition", () => {
  const text = textFor({ dataTypes: ["Passwords / credentials"] });
  assertStringIncludes(text, "§ 1798.82(h)(2)");
  assertStringIncludes(text, "fall within the statute's covered elements: Passwords / credentials");
});

Deno.test("IR-F2: Texas resolves biometric and credentials as honest negatives", () => {
  const text = textFor({ jurisdictions: ["Texas"], dataTypes: ["Biometric data", "Passwords / credentials"] });
  assertStringIncludes(text, "Texas, walked.");
  assertStringIncludes(text, "carries no standalone biometric or online-credential limb");
  assertStringIncludes(text, "no notification duty is established under it");
});

Deno.test("IR-F2: Texas's health limb needs no name combination", () => {
  const text = textFor({ jurisdictions: ["Texas"], dataTypes: ["Health / medical records"] });
  assertStringIncludes(text, "§ 521.002(a)(2)(B)");
  assert(!text.includes("turns on whether names accompany them"));
});

Deno.test("IR-F2: New York states the access-alone breach character and the harm carve-out", () => {
  const text = textFor({ jurisdictions: ["New York"] });
  assertStringIncludes(text, "New York, walked.");
  assertStringIncludes(text, "access alone can suffice");
  assertStringIncludes(text, "harm-threshold carve-out, which the response team assesses and documents");
  assertStringIncludes(text, "§ 899-aa(2)(a)");
});

Deno.test("IR-F2: compromised keys defeat the encrypted state in every gated state's formulation", () => {
  const text = textFor({
    jurisdictions: ["California", "Texas", "New York"],
    encryptionStatus: "All affected data encrypted / rendered unintelligible",
    encryptionKeyStatus: "Keys compromised or possibly compromised",
  });
  const hits = text.split("the encrypted state does not avoid the duty under this formulation").length - 1;
  assertEquals(hits, 3);
});

Deno.test("IR-F2: full encryption with safe keys supports the per-state position, conditionally", () => {
  const text = textFor({
    encryptionStatus: "All affected data encrypted / rendered unintelligible",
    encryptionKeyStatus: "Keys not compromised",
  });
  assertStringIncludes(text, "supports the position that the duty is not triggered under this formulation, subject to the encryption meeting the statute's own standard");
});

Deno.test("IR-F2: an ungated state keeps the generic walk only", () => {
  const text = textFor({ jurisdictions: ["Colorado"] });
  assertStringIncludes(text, "walked through four gates");
  assert(!text.includes(", walked."), "no per-state walked paragraph for an ungated state");
});

Deno.test("IR-F2: the breach-definition seam is sentence-cased", () => {
  const text = textFor();
  assertStringIncludes(text, "California, walked. The duty runs to a resident");
});
