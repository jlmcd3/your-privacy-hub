// C2 — the Spine v1.1 encode battery (2026-08-26). Pins the v4 assembly:
// section architecture, byte-pinned skeleton conformance, the ITEM-204
// phase-in quote, the v1.1 §6 guardrails as machine checks, determinism,
// and the thin-record degradation rule (record-insufficient, never
// not-ready, absent an affirmatively described deficiency).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleCyberSkeletonDocumentV4,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { CYBER_V4_SKELETON_SECTIONS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/prose/plans/cppa-cyber-v4.spine.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import {
  buildCyberComponentRecommendations,
  buildCyberNextSteps,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { attachCyberCorpus } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-corpus-attach.ts";
import { CPPA_CYBER_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-cyber.ts";

const REPORT_DATE = "2026-08-26";

// A minimal but realistic § 7121(a) excerpt shape for the ITEM-204 block.
const PHASE_IN_EXCERPT = `(a) A business must complete its first cybersecurity audit as follows:
      (1) April 1, 2028, for a business with annual gross revenues over one hundred million dollars;
      (2) April 1, 2029, for a business with annual gross revenues between fifty and one hundred million dollars;
      (3) April 1, 2030, for every other business required to complete a cybersecurity audit.
(b) After the first audit, a business must complete a cybersecurity audit annually.`;

type Bag = Record<string, unknown>;

/** The index.ts deterministic-path wiring, reproduced for the harness:
 * deliverables attached to the report bag, recommendations + S4 staged
 * under _meta.internal. */
function reportFor(intake: Bag): Bag {
  const d = buildCyberDeliverables(intake);
  const s4 = attachCyberCorpus();
  const recommendations = buildCyberComponentRecommendations(
    d.component_coverage,
    d.evidence_sufficiency,
    s4,
  );
  const nextSteps = buildCyberNextSteps(
    recommendations,
    String((intake.profile as Bag | undefined)?.remediation_owner ?? ""),
  );
  return {
    ...d,
    authority_exhibit: { entries: [] },
    _meta: {
      internal: {
        cyber_corpus_s4: s4,
        cyber_recommendations: { recommendations, next_steps: nextSteps },
      },
    },
  };
}

const GOLDEN_INTAKE = CPPA_CYBER_GOLDEN[0].intake as Bag;

function assembleGolden() {
  return assembleCyberSkeletonDocumentV4(reportFor(GOLDEN_INTAKE), GOLDEN_INTAKE, PHASE_IN_EXCERPT, REPORT_DATE);
}

Deno.test("C2 — the v4 section architecture matches the v1.1 spine, in order", () => {
  const sk = assembleGolden();
  assertEquals(
    sk.document.sections.map((sec: { id: string }) => sec.id),
    CYBER_V4_SKELETON_SECTIONS.map((sec) => sec.id),
  );
  assertEquals(sk.document.sections.length, 17);
});

Deno.test("C2 — skeleton conformance: every byte-pinned paragraph renders byte-identically", () => {
  const sk = assembleGolden();
  assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
});

Deno.test("C2 — the reliance notice renders byte-exact", () => {
  const text = skeletonDocumentToText(assembleGolden().document);
  assertStringIncludes(
    text,
    "Reliance notice. This report evaluates audit readiness from information supplied by the Company.",
  );
});

Deno.test("C2 — ITEM-204: all three tiers quoted, the pinned no-cohort sentence present", () => {
  const text = skeletonDocumentToText(assembleGolden().document);
  assertStringIncludes(text, "April 1, 2028");
  assertStringIncludes(text, "April 1, 2029");
  assertStringIncludes(text, "April 1, 2030");
  assertStringIncludes(
    text,
    "The customer, in consultation with qualified legal counsel, determines which tier its revenue places it in",
  );
});

Deno.test("C2 — register scan: banned register and the DRAFT tripwire never reach the document", () => {
  const sk = assembleGolden();
  assertEquals(sk.register_findings, [], JSON.stringify(sk.register_findings));
  const text = skeletonDocumentToText(sk.document);
  assert(!text.includes("DRAFT"), "the internal DRAFT tripwire token reached the document");
  assert(!/on the record as documented/i.test(text), "fleet-banned register reached the document");
});

Deno.test("C2 — v1.1 §6 guardrails: no auditor-examination claims, no per-company applicability claim", () => {
  const text = skeletonDocumentToText(assembleGolden().document).toLowerCase();
  assert(!text.includes("examined by the auditor"), "auditor-examination claim");
  assert(!text.includes("tested by the independent auditor"), "auditor-testing claim");
  assert(!text.includes("legally applicable to every company") || text.includes("should not say"), "context check");
});

Deno.test("C2 — determinism: two assemblies over the same record are byte-identical", () => {
  const a = skeletonDocumentToText(assembleGolden().document);
  const b = skeletonDocumentToText(assembleGolden().document);
  assertEquals(a, b);
});

Deno.test("C2 — the appendices carry all eighteen components", () => {
  const sk = assembleGolden();
  const tables = sk.document.tables ?? [];
  const matrixTable = tables.find((t) => t.surface === "cyber_v4_component_matrix");
  const evidenceTable = tables.find((t) => t.surface === "cyber_v4_evidence_index");
  assertEquals(matrixTable?.rows.length, 18);
  assertEquals(evidenceTable?.rows.length, 18);
});

Deno.test("C2 — all eighteen component modules render, numbered, with a next action each", () => {
  const text = skeletonDocumentToText(assembleGolden().document);
  for (let n = 1; n <= 18; n++) {
    assert(new RegExp(`^${n}\\. `, "m").test(text), `component module ${n} missing`);
  }
  const nextActions = text.match(/Next action: /g) ?? [];
  assertEquals(nextActions.length, 18);
});

Deno.test("C2 — thin record degrades to record-insufficient, never not-ready (guardrail i5)", () => {
  const thin: Bag = { profile: { entity_name: "Thin Co" }, controls: [] };
  const sk = assembleCyberSkeletonDocumentV4(reportFor(thin), thin, PHASE_IN_EXCERPT, REPORT_DATE);
  const text = skeletonDocumentToText(sk.document);
  assertStringIncludes(text, "The record is insufficient for a readiness conclusion");
  assert(
    !text.includes("material items stand between the program and audit readiness"),
    "a thin record must not read as not-ready",
  );
  assertEquals(sk.register_findings, []);
});

Deno.test("C2 — incident guardrail: nothing inferred from the count alone", () => {
  const withIncidents: Bag = {
    profile: { entity_name: "Incident Co", incidents_12mo: "3" },
    controls: [],
  };
  const sk = assembleCyberSkeletonDocumentV4(reportFor(withIncidents), withIncidents, PHASE_IN_EXCERPT, REPORT_DATE);
  const text = skeletonDocumentToText(sk.document);
  assertStringIncludes(text, "nothing is inferred from the count alone");
});

Deno.test("C2 — the cover table carries the assessment identity", () => {
  const sk = assembleGolden();
  const table = (sk.document.tables ?? []).find((t) => t.surface === "cyber_v4_cover");
  assert(table, "cover table missing");
  const flat = table!.rows.flat().join(" | ");
  assertStringIncludes(flat, "CPPA Cybersecurity Audit Readiness Report");
  assertStringIncludes(flat, "11 CCR §§ 7120-7124");
  assertStringIncludes(flat, REPORT_DATE);
});

Deno.test("C2 — the § 7124 attestation block renders (carried v3.3 content)", () => {
  const text = skeletonDocumentToText(assembleGolden().document);
  assertStringIncludes(text, "Submission and Attestation");
});
