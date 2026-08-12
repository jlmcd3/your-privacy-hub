// PROMPT 8H — harness batteries for the structured item-shape contract render
// (item 1a), the fixture-lint enforcement (item 1b), and the broadened
// DPO-advice consultation matcher (item 2).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderContractPrompt } from "../../../supabase/functions/run-quality-batch/_local/intake-contracts/render.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import {
  lintDpiaStructuredShapes,
  lintFixtureForTool,
} from "../../../supabase/functions/run-quality-batch/_local/quality/fixture-lint.ts";
import { dpoRecommendsConsultation } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

// ---------- item 1(a): the contract render states the exact record keys ----

Deno.test("8H 1a — dpia contract prompt pins alternatives_considered keys", () => {
  const p = renderContractPrompt(dpiaFrameworkContract);
  assert(p.includes("array of records with EXACTLY these keys"));
  assert(p.includes("processing_operation (text)"));
  assert(p.includes("rejection_reason (narrative)"));
  assert(p.includes("NEVER emit reason_rejected"));
});

Deno.test("8H 1a — dpia contract prompt pins transfer_flows keys", () => {
  const p = renderContractPrompt(dpiaFrameworkContract);
  assert(p.includes("destination_country (text, ISO-2"));
  assert(p.includes("transfer_mechanism (text)"));
  assert(p.includes("recipient (text)"));
});

// ---------- item 1(b): drift fails validation --------------------------------

Deno.test("8H 1b — drifted alternatives_considered item is rejected", () => {
  const hit = lintDpiaStructuredShapes({
    alternatives_considered: [{ alternative: "Aggregate reporting", reason_rejected: "Insufficient" }],
  });
  assert(hit, "expected a lint hit");
  assert(hit!.reason.includes("rejection_reason"));
});

Deno.test("8H 1b — conforming alternatives_considered item passes", () => {
  assertEquals(
    lintDpiaStructuredShapes({
      alternatives_considered: [{
        processing_operation: "Behavioural scoring",
        alternative: "Aggregate reporting",
        rejection_reason: "Aggregate reporting cannot support per-account decisions.",
      }],
    }),
    null,
  );
});

Deno.test("8H 1b — transfer_flows item without destination_country is rejected", () => {
  const hit = lintDpiaStructuredShapes({
    transfer_flows: [{ recipient: "Acme Inc", transfer_mechanism: "SCCs" }],
  });
  assert(hit, "expected a lint hit");
  assert(hit!.reason.includes("destination_country"));
});

Deno.test("8H 1b — empty transfer_flows array is a substantive answer", () => {
  assertEquals(lintDpiaStructuredShapes({ transfer_flows: [] }), null);
});

Deno.test("8H 1b — shape screen applies to dpia only", () => {
  const drifted = { alternatives_considered: [{ alternative: "x", reason_rejected: "y" }] };
  assert(lintFixtureForTool("dpia", drifted));
  assertEquals(lintFixtureForTool("lia", drifted), null);
});

// ---------- item 2: DPO-advice matcher --------------------------------------

Deno.test("8H 2 — named authority (run #182 doc 4 verbatim class) matches", () => {
  assert(dpoRecommendsConsultation(
    "The DPO recommended prior consultation with the Autoriteit Persoonsgegevens (AP) before deployment.",
  ));
  assert(dpoRecommendsConsultation("The DPO advised that the CNIL be consulted before go-live."));
  assert(dpoRecommendsConsultation("The DPO advised escalation to the Garante."));
  assert(dpoRecommendsConsultation("The DPO recommended an Article 36 consultation."));
});

Deno.test("8H 2 — advice with no consultation recommendation is false", () => {
  assertEquals(
    dpoRecommendsConsultation(
      "The DPO reviewed the assessment and considered the measures adequate; no further steps were recommended.",
    ),
    false,
  );
  assertEquals(dpoRecommendsConsultation(""), false);
});

Deno.test("8H 2 — internal consultation of the DPO is false", () => {
  assertEquals(dpoRecommendsConsultation("The project team consulted the DPO during design."), false);
});
