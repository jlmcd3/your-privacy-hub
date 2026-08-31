// PROMPT 3 (2026-08-11) — deterministic sign-off decision (dpia_decision_v1).
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDecision } from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";
import type {
  Art36Consultation,
  RiskRegisterEntry,
} from "../../_shared/ltp/dpia-deliverables/types.ts";

const INTAKE = { jurisdictions: ["EU (GDPR)"] };

function art36(
  determination: Art36Consultation["determination"],
  status: Art36Consultation["status"] = "analysed",
  information_needed?: string,
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
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

function risk(
  over: Partial<RiskRegisterEntry> & { risk_id: string },
): RiskRegisterEntry {
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

Deno.test("branch a — consultation_required", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [risk({ risk_id: "r1", residual_band: "high" })],
      art36_consultation: art36("consultation_required"),
    }),
  );
  assertEquals(d.determination, "consultation_required");
  assertEquals(d.rule_id, "dpia_decision_v1");
  assertStringIncludes(d.why, "Article 36(1)");
  assertStringIncludes(d.why, "Unauthorised access to health records");
  assertEquals(d.conditions, []);
  assertEquals(d.blockers, []);
});

// PROMPT 9B re-pin (2026-08-12) — blockers carry the 9A COMPACT LABEL
// (mergeLabeledAsks → renderMergedLabel), not the full ask text.
Deno.test("branch b — draft_incomplete on an undetermined remaining risk level", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [
        risk({
          risk_id: "r1",
          residual_band: "undetermined",
          status: "record_insufficient",
          information_needed: "The measures actually applied against re-identification.",
          ask_class: "ask_risk_measures",
          display_label: "the measures applied against re-identification",
          // deno-lint-ignore no-explicit-any
        } as any),
      ],
    }),
  );
  assertEquals(d.determination, "draft_incomplete");
  assertEquals(d.blockers, ["the measures applied against re-identification"]);
  assertStringIncludes(d.why, "has not been reached");
});


Deno.test("branch c — conditionally_approved; missing measure becomes its own condition", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [
        risk({ risk_id: "r1", residual_band: "high", measures: ["Pseudonymisation at ingest"] }),
        risk({ risk_id: "r2", risk_label: "Excessive retention", residual_band: "high", measures: [] }),
      ],
    }),
  );
  assertEquals(d.determination, "conditionally_approved");
  assertEquals(d.conditions, [
    "Pseudonymisation at ingest",
    "a recorded measure for Excessive retention",
  ]);
  assertStringIncludes(d.why, "conditional on");
});

Deno.test("branch d — approved", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [risk({ risk_id: "r1", residual_band: "low", measures: ["Access controls"] })],
    }),
  );
  assertEquals(d.determination, "approved");
  assertEquals(d.conditions, []);
  // STALE-PIN FIX 2026-08-29: "deemed low or moderate" was the pre-v4.6.2
  // wording; the current approved-branch why (build.ts, v4.6.2 comment:
  // "precise band statement") says "rated Low or Moderate".
  assertStringIncludes(d.why, "rated Low or Moderate");
  // PROMPT 4 rider — ratified closing clause.
  assertStringIncludes(d.why, "no determination this assessment makes is left open");
});

Deno.test("consultation beats draft_incomplete when both hold", () => {
  const d = buildDecision(
    INTAKE,
    deliverables({
      risk_register: [
        risk({ risk_id: "r1", residual_band: "high" }),
        risk({
          risk_id: "r2",
          residual_band: "undetermined",
          status: "record_insufficient",
          information_needed: "Open point.",
        }),
      ],
      art36_consultation: art36("consultation_required"),
    }),
  );
  assertEquals(d.determination, "consultation_required");
  assertEquals(d.blockers, []);
});

// PROMPT 9B re-pin — dedup is now by ask_class + resolved compact label
// (R1/R4); the full ask keeps its gap-table row only.
Deno.test("blockers deduplicate across surfaces", () => {
  const shared = "Record the retention period for the assessed processing.";
  const label = "the retention period applied to the assessed processing";
  const tagged = {
    status: "record_insufficient",
    information_needed: shared,
    ask_class: "ask_retention_period",
    display_label: label,
  };
  const base = deliverables({
    // deno-lint-ignore no-explicit-any
    risk_register: [risk({ risk_id: "r1", residual_band: "undetermined", ...tagged } as any)],
  });
  const d = buildDecision(INTAKE, {
    ...base,
    // deno-lint-ignore no-explicit-any
    necessity_findings: [{ ...tagged } as any],
    // deno-lint-ignore no-explicit-any
    legal_basis: [{ ...tagged } as any],
  });
  assertEquals(d.determination, "draft_incomplete");
  assertEquals(d.blockers, [label]);
});

// PROMPT 9B — the R4 scope suffix reaches the blockers slot.
Deno.test("blockers merge across operations with the R4 scope suffix", () => {
  const label = "the retention period applied to the assessed processing";
  const tagged = (op: string) => ({
    status: "record_insufficient",
    information_needed: "Record the retention period for the assessed processing.",
    ask_class: "ask_retention_period",
    display_label: label,
    scope_op: op,
  });
  const d = buildDecision(INTAKE, {
    ...deliverables({
      // deno-lint-ignore no-explicit-any
      risk_register: [risk({ risk_id: "r1", residual_band: "undetermined", ...tagged("the primary use") } as any)],
    }),
    // deno-lint-ignore no-explicit-any
    necessity_findings: [tagged("the secondary use") as any],
  });
  assertEquals(d.blockers, [`${label} — for both the primary and the secondary use`]);
});


Deno.test("legacy report without `decision` still composes via the fallback", async () => {
  const { assembleDpiaSkeletonDocument } = await import("../../_shared/ltp/dpia-skeleton-assemble.ts");
  assert(typeof assembleDpiaSkeletonDocument === "function");
  const out = assembleDpiaSkeletonDocument(
    {
      section_6_conclusion: { decision: "DRAFT — INCOMPLETE. Retention period outstanding." },
      risk_register: [],
      art36_consultation: { determination: "consultation_not_required" },
    } as Record<string, unknown>,
    { organization_name: "Acme GmbH", processing_activity_name: "Absence triage" } as Record<string, unknown>,
  );
  const text = JSON.stringify(out.document);
  // PROMPT 8D branch 13g: an empty register carries its own sentence.
  assertStringIncludes(text, "no determination on whether the processing may proceed can rest on a register that is empty");
});
