// DOC 137 (2026-09-01) — regression tests for three confirmed DPIA fixes.
//
//   FIX 1  dpoSentence() now consults the same assessment-team fallback
//          (dpoFromPreparedBy) that buildProcessingInventory already uses,
//          so a DPO credited only via the assessment team is named in
//          Section 5's advice sentence rather than reading as a flat,
//          unqualified "not recorded" gap that contradicts Section 0/the
//          Controller table.
//   FIX 2  buildDecision() no longer stamps the single hoisted Art. 36(1)
//          citation onto every branch. Only `consultation_required` cites
//          Art. 36(1); every other branch (draft_incomplete x2,
//          conditionally_approved x3, approved) now cites the Art. 35(1)
//          DPIA-obligation authority instead.
//   FIX 3  The unresolved cross-border-transfer-mechanism appendix sentence
//          now explicitly calls for an owner to be designated, without
//          fabricating a name, role, or deadline the intake never supplied.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { dpoSentence } from "../../_shared/ltp/dpia-skeleton-assemble.ts";
import { buildDecision } from "../../_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../_shared/ltp/dpia-skeleton-assemble.ts";
import type {
  Art36Consultation,
  RiskRegisterEntry,
} from "../../_shared/ltp/dpia-deliverables/types.ts";

type Bag = Record<string, unknown>;

// ── FIX 1 — dpoSentence() credits the assessment-team-named DPO ────────────

Deno.test("FIX 1 — dpoSentence names the DPO credited from the assessment team when dpo_advice/dpo_info are both absent", () => {
  const intake: Bag = {
    dpia_prepared_by: "Donna Dasher — Data Protection Officer (Accountable)",
  };
  const out = dpoSentence(intake);
  assertStringIncludes(out, "Donna Dasher");
  assertStringIncludes(out, "named as Data Protection Officer in the assessment team");
  assertStringIncludes(out, "was specifically sought for this assessment");
  // Must not read as the old flat, unqualified denial once a DPO is credited.
  assert(!out.includes("that the advice of a data protection officer has been obtained"));
});

Deno.test("FIX 1 — dpoSentence keeps the original flat gap when no DPO can be credited by either path", () => {
  const intake: Bag = {};
  const out = dpoSentence(intake);
  assertEquals(out, "The company has not recorded that the advice of a data protection officer has been obtained");
});

Deno.test("FIX 1 — dpoSentence still prefers formal dpo_advice / dpo_info over the assessment-team fallback", () => {
  const withAdvice = dpoSentence({
    dpo_advice: "Retention periods were reviewed and found adequate.",
    dpia_prepared_by: "Donna Dasher — Data Protection Officer (Accountable)",
  });
  assertStringIncludes(withAdvice, "The company has recorded the advice of its data protection officer as follows");
  assert(!withAdvice.includes("was specifically sought for this assessment"));

  const withInfo = dpoSentence({
    dpo_info: "Jane Doe, dpo@example.com",
    dpia_prepared_by: "Donna Dasher — Data Protection Officer (Accountable)",
  });
  assertStringIncludes(withInfo, "The company has recorded its data protection officer as Jane Doe");
});

// ── FIX 2 — buildDecision() no longer reuses Art. 36(1) on every branch ────

const INTAKE = { jurisdictions: ["EU (GDPR)"] };

function art36(
  determination: Art36Consultation["determination"],
): Art36Consultation {
  return {
    determination,
    why: "",
    exposure_note: "",
    separation_repairs: 0,
    driving_risk_ids: [],
    citation: "GDPR Art. 36(1)",
    authority_verbatim: "",
    procedural_note: "",
    procedural_citation: "GDPR Art. 36(3)",
    status: "analysed",
  };
}

function risk(over: Partial<RiskRegisterEntry> & { risk_id: string }): RiskRegisterEntry {
  return {
    risk_label: "Unauthorised access to health records",
    source: "",
    affected_rights: "",
    likelihood: "Possible",
    severity: "Severe",
    inherent_band: "high",
    measures: [],
    residual_band: "moderate",
    citation: "GDPR Art. 35(7)(c)",
    authority_verbatim: "",
    status: "analysed",
    ...over,
  } as RiskRegisterEntry;
}

function deliverables(over: Partial<{
  risk_register: RiskRegisterEntry[];
  art36_consultation: Art36Consultation;
}> = {}) {
  return {
    necessity_findings: [],
    proportionality: [],
    risk_register: over.risk_register ?? [],
    art36_consultation: over.art36_consultation ?? art36("consultation_not_required"),
    legal_basis: [],
  };
}

Deno.test("FIX 2 — consultation_required KEEPS the Art. 36(1) citation", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [risk({ risk_id: "r1", residual_band: "high" })],
      art36_consultation: art36("consultation_required"),
    }),
  );
  assertEquals(d.determination, "consultation_required");
  assertStringIncludes(d.citation, "36(1)");
});

Deno.test("FIX 2 — empty-register draft_incomplete cites Art. 35(1), not Art. 36(1)", () => {
  const d = buildDecision(INTAKE, deliverables());
  assertEquals(d.determination, "draft_incomplete");
  assertStringIncludes(d.citation, "35(1)");
  assert(!d.citation.includes("36(1)"), `expected no Art. 36(1) citation, got: ${d.citation}`);
});

Deno.test("FIX 2 — record-insufficient draft_incomplete cites Art. 35(1), not Art. 36(1)", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [
        risk({
          risk_id: "r1",
          residual_band: "undetermined",
          status: "record_insufficient",
          // deno-lint-ignore no-explicit-any
        } as any),
      ],
    }),
  );
  assertEquals(d.determination, "draft_incomplete");
  assertStringIncludes(d.citation, "35(1)");
  assert(!d.citation.includes("36(1)"));
});

Deno.test("FIX 2 — high-risk conditionally_approved (no Art. 36 trigger) cites Art. 35(1), not Art. 36(1)", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [
        risk({ risk_id: "r1", residual_band: "high", measures: ["Pseudonymisation at ingest"] }),
      ],
    }),
  );
  assertEquals(d.determination, "conditionally_approved");
  assertStringIncludes(d.citation, "35(1)");
  assert(!d.citation.includes("36(1)"));
});

Deno.test("FIX 2 — no-measures-recorded conditionally_approved cites Art. 35(1), not Art. 36(1)", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [risk({ risk_id: "r1", residual_band: "moderate", measures: [] })],
    }),
  );
  assertEquals(d.determination, "conditionally_approved");
  assertStringIncludes(d.citation, "35(1)");
  assert(!d.citation.includes("36(1)"));
});

Deno.test("FIX 2 — approved cites Art. 35(1), not Art. 36(1)", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [risk({ risk_id: "r1", residual_band: "low", measures: ["Access controls"] })],
    }),
  );
  assertEquals(d.determination, "approved");
  assertStringIncludes(d.citation, "35(1)");
  assert(!d.citation.includes("36(1)"));
});

// ── FIX 3 — unresolved transfer mechanism names an open designation ────────

Deno.test("FIX 3 — unresolved transfer mechanism calls for an owner to be designated, without fabricating one", () => {
  const report = {
    decision: { determination: "approved", conditions: [], blockers: [], why: "Nothing is left open.", citation: "GDPR Art. 35(1)" },
    art36_consultation: { determination: "consultation_not_required", why: "" },
    necessity_findings: [],
    proportionality: [],
    risk_register: [
      { risk_id: "r1", risk_label: "Access", risk_class: "design", severity: "Low", source: "x", affected_rights: "y", residual_band: "low", measures: ["Access controls"] },
    ],
    section2_coverage: {
      transfers: [
        { determination: "third_country_no_mechanism", status: "analysed" },
      ],
    },
  };
  const intake = {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    description: "A scoring model applied at intake.",
  };

  const { document } = assembleDpiaSkeletonDocument(report, intake);
  const appendix = document.sections.find((s) => s.id === "table_of_authorities")!;
  const matrix = appendix.paragraphs.find((p) => p.kind === "table")!.table!;
  const row = matrix.rows.find((r) => r[0] === "International transfers");
  assert(row, "International transfers row did not compose");
  assertStringIncludes(row![1], "has not yet been recorded");
  assertStringIncludes(row![1], "will need to designate an owner for resolving this open item");
  // No fabricated name, role, or deadline.
  assert(!/\b\d{4}-\d{2}-\d{2}\b/.test(row![1]), "must not invent a deadline");
});

Deno.test("FIX 3 — the fully-instrumented transfer branch is untouched", () => {
  const report = {
    decision: { determination: "approved", conditions: [], blockers: [], why: "Nothing is left open.", citation: "GDPR Art. 35(1)" },
    art36_consultation: { determination: "consultation_not_required", why: "" },
    necessity_findings: [],
    proportionality: [],
    risk_register: [
      { risk_id: "r1", risk_label: "Access", risk_class: "design", severity: "Low", source: "x", affected_rights: "y", residual_band: "low", measures: ["Access controls"] },
    ],
    section2_coverage: {
      transfers: [
        { determination: "instrument_recorded", status: "analysed" },
      ],
    },
  };
  const intake = {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    description: "A scoring model applied at intake.",
  };

  const { document } = assembleDpiaSkeletonDocument(report, intake);
  const appendix = document.sections.find((s) => s.id === "table_of_authorities")!;
  const matrix = appendix.paragraphs.find((p) => p.kind === "table")!.table!;
  const row = matrix.rows.find((r) => r[0] === "International transfers");
  assert(row, "International transfers row did not compose");
  assertEquals(row![1], "The Company has identified its cross-border transfers, and a transfer mechanism is recorded for each.");
});
