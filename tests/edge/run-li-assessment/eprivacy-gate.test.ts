// L1 PRE-LANDING (doc 62 §5 B5) — unit battery for the ePrivacy
// short-circuit hard gate (eprivacy-gate.ts).
//
// The ratified rule: where Art. 5(3) ePrivacy Directive requires consent
// for the processing, Art. 6(1)(f) cannot substitute for that consent,
// however the balancing test would otherwise resolve — a hard gate on
// factor 11, evaluated independent of the balancing computation.
//
// Coverage: clear trigger present (both bases) / clearly absent /
// indicated-but-unresolved (three routes) / absent field / purity +
// balancing-independence metamorphics / wiring into buildLiaDeliverables /
// the dark ratification flag / degradation-law shape.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildEprivacyShortCircuit,
  EPRIVACY_CAM_ROW_ID,
  LIA_EPRIVACY_GATE_RATIFIED,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/eprivacy-gate.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { LIA_CORPUS_MAP } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-corpus-map.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";

const TERMINAL_INTAKE = {
  processing_description:
    "We set advertising cookies and tracking pixels in visitors' browsers to build interest profiles for targeted advertising across our sites.",
  stated_purpose: "To fund the service through targeted advertising revenue.",
};

const UNSOLICITED_INTAKE = {
  processing_description:
    "We send unsolicited marketing emails to prospects whose contact details were collected from public directories.",
  stated_purpose: "To acquire new business customers.",
};

const CLEARLY_ABSENT_INTAKE = {
  processing_description:
    "CCTV monitoring of warehouse loading bays to protect staff from vehicle collisions, with footage reviewed only after a reported incident.",
  stated_purpose: "Workplace safety and post-incident investigation.",
};

const SOFT_OPTIN_AMBIGUOUS_INTAKE = {
  processing_description:
    "We send marketing emails to our existing customers about products similar to those they have already purchased.",
  stated_purpose: "To generate repeat business from the existing customer base.",
};

const STRICTLY_NECESSARY_INTAKE = {
  processing_description:
    "We use strictly necessary cookies to keep users signed in during a session.",
  stated_purpose: "Session continuity for a service the user has requested.",
};

const CLASS_INDICATED_INTAKE = {
  processing_description:
    "Behavioural advertising segments derived from customers' offline purchase histories.",
  stated_purpose: "Advertising effectiveness.",
};

Deno.test("ePrivacy gate — clear terminal-equipment trigger engages the hard gate", () => {
  const f = buildEprivacyShortCircuit(TERMINAL_INTAKE);
  assertEquals(f.determination, "consent_requirement_engaged");
  assertEquals(f.li_foreclosed_for_covered_processing, true);
  assertEquals(f.trigger_basis, "terminal_equipment_access");
  assertEquals(f.status, "analysed");
  assert(f.trigger_phrases.some((p) => /cookies/i.test(p)), "cookies must be among the trigger phrases");
  assert(f.standard.length > 0, "standard must carry the pinned EDPB excerpt");
  assert(f.application.length > 0);
  assertEquals(f.information_needed, undefined);
});

Deno.test("ePrivacy gate — clear unsolicited-messages trigger engages the hard gate", () => {
  const f = buildEprivacyShortCircuit(UNSOLICITED_INTAKE);
  assertEquals(f.determination, "consent_requirement_engaged");
  assertEquals(f.li_foreclosed_for_covered_processing, true);
  assertEquals(f.trigger_basis, "unsolicited_electronic_messages");
  assertEquals(f.status, "analysed");
});

Deno.test("ePrivacy gate — clearly absent activity determines not_engaged_on_the_record, bound to the record", () => {
  const f = buildEprivacyShortCircuit(CLEARLY_ABSENT_INTAKE);
  assertEquals(f.determination, "not_engaged_on_the_record");
  assertEquals(f.li_foreclosed_for_covered_processing, false);
  assertEquals(f.trigger_basis, "none_recorded");
  assertEquals(f.trigger_phrases, []);
  assertEquals(f.status, "analysed");
  assert(/must be re-run/.test(f.application), "the bound-to-record caveat must be stated");
});

Deno.test("ePrivacy gate — the perfect fixtures carry no ePrivacy indication and stay not_engaged", () => {
  for (const c of LIA_PERFECT_PINNED) {
    const f = buildEprivacyShortCircuit(c.intake);
    assertEquals(f.determination, "not_engaged_on_the_record", c.id);
    assertEquals(f.status, "analysed", c.id);
  }
});

Deno.test("ePrivacy gate — electronic marketing to existing customers is INDICATED, never adjudicated (soft opt-in stays open)", () => {
  const f = buildEprivacyShortCircuit(SOFT_OPTIN_AMBIGUOUS_INTAKE);
  assertEquals(f.determination, "undetermined_on_the_record");
  assertEquals(f.li_foreclosed_for_covered_processing, false);
  assertEquals(f.indication_unresolved, true);
  assertEquals(f.status, "record_insufficient");
  assert(
    typeof f.information_needed === "string" && f.information_needed.length > 0,
    "record_insufficient must carry information_needed",
  );
});

Deno.test("ePrivacy gate — a record invoking strict necessity is INDICATED, never adjudicated", () => {
  const f = buildEprivacyShortCircuit(STRICTLY_NECESSARY_INTAKE);
  assertEquals(f.determination, "undetermined_on_the_record");
  assertEquals(f.li_foreclosed_for_covered_processing, false);
  assertEquals(f.indication_unresolved, true);
  assertEquals(f.status, "record_insufficient");
  assert(f.trigger_phrases.some((p) => /cookies/i.test(p)));
});

Deno.test("ePrivacy gate — an ePrivacy-adjacent use-case class alone is an indication, not an engagement", () => {
  const f = buildEprivacyShortCircuit(CLASS_INDICATED_INTAKE);
  assertEquals(f.determination, "undetermined_on_the_record");
  assertEquals(f.li_foreclosed_for_covered_processing, false);
  assertEquals(f.indication_unresolved, true);
  assertEquals(f.status, "record_insufficient");
});

Deno.test("ePrivacy gate — absent description degrades honestly (the PN-L6 intake gap)", () => {
  const f = buildEprivacyShortCircuit({});
  assertEquals(f.determination, "undetermined_on_the_record");
  assertEquals(f.status, "record_insufficient");
  assertEquals(f.trigger_basis, "none_recorded");
  assert(
    typeof f.information_needed === "string" && f.information_needed.includes("processing_description"),
    "information_needed must name the missing field",
  );
});

Deno.test("ePrivacy gate — pure and total: never throws, deterministic on identical input", () => {
  for (const garbage of [null, undefined, 42, "x", [], { processing_description: 123 }]) {
    const f = buildEprivacyShortCircuit(garbage);
    assert(f.determination.length > 0, `must degrade, not throw, on ${JSON.stringify(garbage)}`);
  }
  assertEquals(
    buildEprivacyShortCircuit(TERMINAL_INTAKE),
    buildEprivacyShortCircuit(TERMINAL_INTAKE),
  );
});

Deno.test("ePrivacy gate — evaluated INDEPENDENT of the balancing inputs (the ratified independence requirement)", () => {
  // Same description, radically different balancing facts: the gate's
  // output must be byte-identical. The rule is a gate, not a weight.
  const bare = buildEprivacyShortCircuit(TERMINAL_INTAKE);
  const withBalancing = buildEprivacyShortCircuit({
    ...TERMINAL_INTAKE,
    balancing_details: {
      reasonable_expectation: "yes",
      potential_harm: "Negligible",
      safeguards: ["Access controls", "Encryption in transit and at rest"],
      opt_out_mechanism: "One-click opt-out in every message and in account settings.",
    },
  });
  assertEquals(bare, withBalancing);
});

Deno.test("ePrivacy gate — wired into buildLiaDeliverables as eprivacy_short_circuit", () => {
  const d = buildLiaDeliverables(TERMINAL_INTAKE);
  assertEquals(d.eprivacy_short_circuit, buildEprivacyShortCircuit(TERMINAL_INTAKE));
});

Deno.test("ePrivacy gate — standard is the CAM row's pinned excerpt, never re-typed", () => {
  const row = LIA_CORPUS_MAP.rows.find((r) => r.id === EPRIVACY_CAM_ROW_ID);
  assert(row, `CAM row ${EPRIVACY_CAM_ROW_ID} must exist`);
  const f = buildEprivacyShortCircuit(TERMINAL_INTAKE);
  assertEquals(f.standard, row!.pinned_excerpt);
  assertEquals(f.corpus_row_id, EPRIVACY_CAM_ROW_ID);
  // The row this gate implements must say so.
  assertEquals(row!.logic_disposition?.kind, "implemented");
});

// L1-B/L3 re-point (2026-08-26, CEO-delegated ratification): the flag is
// TRUE — PN-L6(c)'s prose is ratified — and the gate reaches the document
// through the typed engine's OUTCOME OVERRIDE (three-part-test-typed.ts:
// the determination's why quotes the gate's application, which itself
// carries the rule sentence), deterministic path only. The skeleton
// assembler still never reads the finding directly, which keeps the
// single-writer boundary: the override is the one door.
Deno.test("ePrivacy gate — RATIFIED; the typed engine's override is the only render door", () => {
  assertEquals(LIA_EPRIVACY_GATE_RATIFIED, true);
  const src = Deno.readTextFileSync(
    new URL(
      "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts",
      import.meta.url,
    ),
  );
  assert(
    !src.includes("eprivacy_short_circuit"),
    "the skeleton assembler must not consume the gate directly — the typed engine's determination override is the single render door",
  );
});
