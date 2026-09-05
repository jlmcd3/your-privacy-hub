// IR-F TRANCHE 3 (2026-08-29) — per-state walk gates for Colorado, Florida,
// Washington, Connecticut, Oregon, Illinois, Massachusetts and Virginia,
// each formulation condensed from the statute's own text (see the
// STATE_WALK_GATES registry comment in us-state-duties.ts). This tranche
// gates every state named in the IR intake's US-state jurisdiction enum —
// no ungated named state remains; only the intake's own "Other US State"
// honest-unknown value still falls back to the generic walk.

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

const TRANCHE_3_STATES = [
  "Colorado", "Florida", "Washington", "Connecticut", "Oregon", "Illinois", "Massachusetts", "Virginia",
] as const;

// ── Registry shape (full 11-state set) ──────────────────────────────────────

Deno.test("IR-F3: all 11 named US-state jurisdictions are gated, each verified this session or tranche 2", () => {
  assertEquals(
    Object.keys(STATE_WALK_GATES).sort(),
    ["California", "Colorado", "Connecticut", "Florida", "Illinois", "Massachusetts", "New York", "Oregon", "Texas", "Virginia", "Washington"],
  );
  for (const [state, g] of Object.entries(STATE_WALK_GATES)) {
    assert(g.element_limbs.length >= 2, state);
    // Illinois (ILCS), Washington (RCW), and Oregon (ORS) cite their codes
    // without a "§" symbol — that's their real citation convention, not an
    // omission.
    assert(/§|ILCS|RCW|ORS/.test(g.breach_definition), `${state} breach_definition`);
    assert(/§|ILCS|RCW|ORS/.test(g.encryption_formulation), `${state} encryption_formulation`);
  }
});

Deno.test("IR-F3: verified_on is set for every tranche-3 state", () => {
  for (const state of TRANCHE_3_STATES) {
    assertEquals(STATE_WALK_GATES[state].verified_on, "2026-08-29", state);
  }
});

Deno.test("IR-F3: harm_carveout pattern — CO/FL/WA/CT carry one, OR/IL do not, MA/VA embed the harm element in the breach definition instead", () => {
  for (const state of ["Colorado", "Florida", "Washington", "Connecticut"] as const) {
    assert(STATE_WALK_GATES[state].harm_carveout, state);
  }
  for (const state of ["Oregon", "Illinois", "Massachusetts", "Virginia"] as const) {
    assertEquals(STATE_WALK_GATES[state].harm_carveout, undefined, state);
  }
  // The embedding is stated in prose, not a structured field — guard that
  // the explanatory sentence is actually present for both.
  assertStringIncludes(STATE_WALK_GATES["Massachusetts"].breach_definition, "substantial risk of identity theft or fraud");
  assertStringIncludes(STATE_WALK_GATES["Virginia"].breach_definition, "causes, or is reasonably believed to have caused or will cause, identity theft or other fraud");
});

// ── Per-state resolution ─────────────────────────────────────────────────────

Deno.test("IR-F3: Colorado resolves government IDs and states its own encryption-key rule", () => {
  const text = textFor({ jurisdictions: ["Colorado"] });
  assertStringIncludes(text, "Here is how Colorado's law applies to this incident.");
  assertStringIncludes(text, "§ 6-1-716(1)(g)(I)(A)");
  assertStringIncludes(text, "encryption key");
});

Deno.test("IR-F3: Colorado's financial-account limb requires a name pairing", () => {
  const text = textFor({ jurisdictions: ["Colorado"], dataTypes: ["Financial / payment data"] });
  assertStringIncludes(text, "turns on whether names accompany them");
  assertStringIncludes(text, "§ 6-1-716(1)(g)(I)(C)");
});

Deno.test("IR-F3: Florida's access standard and single combined element limb", () => {
  const text = textFor({ jurisdictions: ["Florida"], dataTypes: ["Names and contact details", "Location data"] });
  assertStringIncludes(text, "Here is how Florida's law applies to this incident.");
  assertStringIncludes(text, "unauthorized access");
  assertStringIncludes(text, "geolocation information");
  assertStringIncludes(text, "§ 501.171(1)(g)1.a");
});

Deno.test("IR-F3: Florida's risk-of-harm exception names the financial-harm standard", () => {
  const text = textFor({ jurisdictions: ["Florida"] });
  assertStringIncludes(text, "will not likely result in identity theft or any other financial harm");
  assertStringIncludes(text, "§ 501.171(4)(c)");
});

Deno.test("IR-F3: Washington resolves biometric data and its own encryption-key provision", () => {
  const text = textFor({ jurisdictions: ["Washington"], dataTypes: ["Names and contact details", "Biometric data"] });
  assertStringIncludes(text, "Here is how Washington's law applies to this incident.");
  assertStringIncludes(text, "RCW 19.255.005(2)(a)(i)(I)");
  assertStringIncludes(text, "RCW 19.255.010(1)");
});

Deno.test("IR-F3: Connecticut's access-or-acquisition standard and geolocation limb", () => {
  const text = textFor({ jurisdictions: ["Connecticut"], dataTypes: ["Names and contact details", "Location data"] });
  assertStringIncludes(text, "Here is how Connecticut's law applies to this incident.");
  assertStringIncludes(text, "unauthorized access to or unauthorized acquisition");
  assertStringIncludes(text, "precise geolocation data");
});

Deno.test("IR-F3: Oregon's inadvertent-acquisition exception and no harm carve-out rendered", () => {
  const text = textFor({ jurisdictions: ["Oregon"] });
  assertStringIncludes(text, "Here is how Oregon's law applies to this incident.");
  assertStringIncludes(text, "inadvertent acquisition");
  assert(!text.includes("harm-threshold carve-out"), "Oregon has no harm_carveout to render");
});

Deno.test("IR-F3: Illinois cites 815 ILCS without a section symbol and resolves biometric data", () => {
  const text = textFor({ jurisdictions: ["Illinois"], dataTypes: ["Names and contact details", "Biometric data"] });
  assertStringIncludes(text, "Here is how Illinois's law applies to this incident.");
  assertStringIncludes(text, "815 ILCS 530/5(1)(F)");
});

Deno.test("IR-F3: Massachusetts resolves only its three named elements and honestly excludes the rest", () => {
  const text = textFor({
    jurisdictions: ["Massachusetts"],
    dataTypes: ["Names and contact details", "Government IDs / SSN", "Biometric data", "Passwords / credentials"],
  });
  assertStringIncludes(text, "Here is how Massachusetts's law applies to this incident.");
  assertStringIncludes(text, "ch. 93H, § 1(a)-(b)");
  assertStringIncludes(text, "Massachusetts has no health, biometric, or online-account-credential limb");
});

Deno.test("IR-F3: Massachusetts states the harm element is built into its breach definition", () => {
  const text = textFor({ jurisdictions: ["Massachusetts"] });
  assertStringIncludes(text, "substantial risk of identity theft or fraud against a resident");
  assertStringIncludes(text, "not a separate carve-out");
});

Deno.test("IR-F3: Virginia's conjunctive access-and-acquisition standard renders", () => {
  const text = textFor({ jurisdictions: ["Virginia"], dataTypes: ["Names and contact details", "Government IDs / SSN"] });
  assertStringIncludes(text, "Here is how Virginia's law applies to this incident.");
  assertStringIncludes(text, "requires BOTH unauthorized access AND unauthorized acquisition");
  assertStringIncludes(text, "§ 18.2-186.6(A)");
});

Deno.test("IR-F3: Virginia excludes biometric and health data from its narrow element list", () => {
  const text = textFor({
    jurisdictions: ["Virginia"],
    dataTypes: ["Names and contact details", "Biometric data", "Health / medical records"],
  });
  // RE-PIN DOC 188 P10 (2026-09-05, batch e38460): the sentence names the
  // RECORDED types that fall outside § 18.2-186.6(A)'s list, not the
  // statute's own catalogue of uncovered types.
  assertStringIncludes(text, "Biometric data and Health / medical records — fall outside § 18.2-186.6(A)'s element list");
  assertStringIncludes(text, "do not, by themselves, constitute personal information under this section");
  assert(!text.includes("passwords or credentials standing alone"), "types not on the record must not be recited as remaining recorded types");
});

Deno.test("IR-F3: a multi-state record renders every recorded state's paragraph once", () => {
  const text = textFor({
    jurisdictions: ["Colorado", "Florida", "Washington", "Connecticut", "Oregon", "Illinois", "Massachusetts", "Virginia"],
  });
  for (const state of TRANCHE_3_STATES) {
    const marker = `Here is how ${state}'s law applies to this incident.`;
    const count = text.split(marker).length - 1;
    assertEquals(count, 1, `${state} paragraph count`);
  }
});
