// A-TEAM DELTA (batch 3397176d, 2026-08-31) — factor-presence.ts's harm-code
// detection read ONLY the detailed `a5_harm_pathways` structured list,
// never the simpler `impact_intake.harmTypes` multi-enum -- both are
// contract-declared, legitimate ways to answer the same § 7152(a)(5)
// question (cppa-risk-assessment.ts lines 543 vs 585). An intake answered
// via the multi-select showed every negative-impact factor as absent
// regardless of what was actually selected, producing a report that
// "systematically ignores substantive intake evidence" (the exact grader
// finding this locks against, cppa_risk · Orion AdTech LLC).

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { detectFactorPresence } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/factor-presence.ts";

Deno.test("harmTypes multi-select alone evidences the matching neg.* factors", () => {
  const intake = {
    impact_intake: {
      harmTypes: [
        "Unauthorised access, destruction, use, modification, or disclosure",
        "Economic harm",
      ],
    },
  };
  assertEquals(detectFactorPresence("neg.a.unauthorized_access", intake).present, true);
  assertEquals(detectFactorPresence("neg.e.economic_harms", intake).present, true);
  // Not selected -> stays absent (omission over invention).
  assertEquals(detectFactorPresence("neg.b.discrimination", intake).present, false);
  assertEquals(detectFactorPresence("neg.h.psychological_harms", intake).present, false);
});

Deno.test("harmTypes and a5_harm_pathways both contributing: ledger_refs names both sources", () => {
  const intake = {
    a5_harm_pathways: [{ harm: "(A) Unauthorized access" }],
    impact_intake: { harmTypes: ["Unauthorised access, destruction, use, modification, or disclosure"] },
  };
  const p = detectFactorPresence("neg.a.unauthorized_access", intake);
  assertEquals(p.present, true);
  assertEquals(p.ledger_refs.includes("L.a5_harm_pathways"), true);
  assertEquals(p.ledger_refs.includes("L.impact_intake.harmTypes"), true);
});

Deno.test("a5_harm_pathways alone still works unchanged (no regression on the existing path)", () => {
  const intake = { a5_harm_pathways: [{ harm: "(D) Coercion" }] };
  const p = detectFactorPresence("neg.d.coercion_dark_patterns", intake);
  assertEquals(p.present, true);
  assertEquals(p.ledger_refs, ["L.a5_harm_pathways"]);
});

Deno.test("neither source present -> absent, never invented", () => {
  const p = detectFactorPresence("neg.f.physical_harms", {});
  assertEquals(p.present, false);
  assertEquals(p.ledger_refs, []);
});

Deno.test("'Loss of availability of personal information' has no A-H counterpart and grants nothing", () => {
  const intake = { impact_intake: { harmTypes: ["Loss of availability of personal information"] } };
  for (const id of ["neg.a.unauthorized_access", "neg.b.discrimination", "neg.c.impaired_control"]) {
    assertEquals(detectFactorPresence(id, intake).present, false);
  }
});
