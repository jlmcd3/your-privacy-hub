// PROMPT 8D — VOCABULARY FIDELITY (CEO-ratified 2026-08-12).
//
// The plain-language sweep renames the rendered words, never the vocabulary.
// This battery holds the one property the sweep could have destroyed: the
// INHERENT / RESIDUAL distinction. A row carrying both must render both, as
// "initial risk level" and "remaining risk level", and neither may collapse
// into a bare "risk level". It also holds the retired phrases out of the
// composed DPIA prose.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { composeRiskBody } from "../ltp/dpia-skeleton-assemble.ts";

const REPORT = {
  risk_register: [
    {
      risk_label: "Unauthorised access to clinical records",
      likelihood: "possible",
      severity: "significant",
      inherent_band: "high",
      residual_band: "moderate",
      measures: ["Encryption at rest"],
    },
    {
      risk_label: "Excessive retention",
      likelihood: "unlikely",
      severity: "limited",
      inherent_band: "moderate",
      residual_band: "low",
      measures: [],
    },
  ],
};

const INTAKE = { dpia_approved_by_name: "R. Delacroix" };

Deno.test("the initial/remaining distinction renders distinctly on a row carrying both", () => {
  const body = composeRiskBody(REPORT, {} as never, INTAKE);
  assert(body.includes("an initial risk level of high"), body);
  assert(body.includes("the remaining risk level"), body);
  // Both terms present, and neither collapsed to a bare "risk level".
  assertEquals(/(?<!initial |remaining |the )\brisk level of\b/.test(body), false, body);
});

Deno.test("the re-scoring caveat is preliminary, deployed, and stated once", () => {
  const body = composeRiskBody(REPORT, {} as never, INTAKE);
  assert(
    body.includes(
      "preliminary until R. Delacroix re-scores it against the mitigating measures once they have been deployed",
    ),
    body,
  );
  assertEquals(body.split("re-scores it against").length - 1, 1, body);
  assert(body.includes("on the same preliminary basis"), body);
});

Deno.test("retired phrases cannot return to the composed risk prose", () => {
  const body = composeRiskBody(REPORT, {} as never, INTAKE);
  for (
    const retired of [
      "residual band",
      "inherent band",
      "residual position",
      "as implemented",
      "on the company's answers",
      "on the answers given",
      "answer it",
      "made out",
    ]
  ) {
    assertEquals(body.toLowerCase().includes(retired.toLowerCase()), false, `retired phrase: ${retired}`);
  }
});

Deno.test("measures mitigate the risk; the no-measures branch does not restate itself", () => {
  const body = composeRiskBody(
    {
      risk_register: [{
        risk_label: "Excessive retention",
        likelihood: "possible",
        severity: "limited",
        inherent_band: "moderate",
        residual_band: "undetermined",
        measures: [],
      }],
    },
    {} as never,
    INTAKE,
  );
  assert(body.includes("The company records no measure against it, and the remaining risk level is undetermined."), body);
  assertEquals(body.includes("because the company does not record the measures it applies"), false, body);
});
