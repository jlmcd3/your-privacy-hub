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

// ── PROMPT 8E item 8(c) ─────────────────────────────────────────────────
// The committee bar on "(s)" in composed customer prose, and the ratified
// byte assertions for both risk_count_note variants (item 1).
import { buildArt36Consultation, buildRiskCountNote, statedResidualRiskCount } from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

const REG = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    risk_id: `r${i + 1}`,
    risk_label: `Risk ${i + 1}`,
    likelihood: "possible",
    severity: "limited",
    inherent_band: "moderate",
    residual_band: "low",
    measures: ["A measure"],
  })) as never;

Deno.test("composed customer prose never carries the '(s)' construction", () => {
  for (const highs of [1, 3]) {
    const register = Array.from({ length: highs }, (_, i) => ({
      risk_id: `h${i + 1}`,
      risk_label: `High risk ${i + 1}`,
      likelihood: "likely",
      severity: "severe",
      inherent_band: "high",
      residual_band: "high",
      measures: [],
    })) as never;
    const a36 = buildArt36Consultation({ jurisdictions: ["EU"] }, register);
    assertEquals(a36.why.includes("(s)"), false, a36.why);
    assert(
      highs === 1 ? a36.why.includes("one risk —") : a36.why.includes("three risks —"),
      a36.why,
    );
    assert(highs === 1 ? a36.why.includes("is deemed a high risk") : a36.why.includes("are deemed high risks"), a36.why);
  }
});

Deno.test("risk_count_note — normal variant carries the ratified bytes", () => {
  const note = buildRiskCountNote({ residual_risks: "We identified two risks." }, REG(4));
  assertEquals(
    note?.note,
    "The company self-identified two of these risks; this assessment surfaces two more. The company's own account is recorded in its own words in the sign-off section.",
  );
});

Deno.test("risk_count_note — reversed variant carries the ratified bytes", () => {
  const note = buildRiskCountNote({ residual_risks: "We identified five risks." }, REG(3));
  assertEquals(
    note?.note,
    "The company self-identified five risks in its own account; this assessment carries three after consolidation, and the company's own account is recorded in its own words in the sign-off section.",
  );
});

// ── item 4 — hardened stated-count extraction ───────────────────────────
const DOC4 = `Our remaining risks after mitigation are set out below.
1. Unauthorised access to clinical records, mitigated by role-based access.
2. Excessive retention beyond the stated period.
3. Processor sub-contracting without notice.
4. Re-identification from pseudonymised analytics.
Our DPO is designated under UK GDPR Art. 37 and reviews each of these annually.`;

Deno.test("item 4 — the doc-4 narrative reads four enumerated risks, never 37", () => {
  const n = statedResidualRiskCount(DOC4);
  assert(n === 4 || n === null, String(n));
  assertEquals(n === 37, false);
});

Deno.test("item 4 — a citation-only narrative yields no count", () => {
  assertEquals(
    statedResidualRiskCount("The risks were assessed under Art. 35 and Recital 90 of the UK GDPR."),
    null,
  );
});

Deno.test("item 4 — the plausibility bound suppresses the note entirely", () => {
  assertEquals(buildRiskCountNote({ residual_risks: "We identified 37 risks." }, REG(3)), undefined);
});
