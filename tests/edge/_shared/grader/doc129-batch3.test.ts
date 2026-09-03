// DOC 129 (Batch 3 A-Team ruling, 2026-09-01) — regression guards for the
// grader-surface rebuild (§1), the deterministic pre-grader QA (§2), and the
// product fixes verified REAL at HEAD (LIA-A/C/E, IR-1/2, CY-1, GOV timing,
// RISK explain-why + fixture, DPA slot sanitisation, US-notice grounding).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildGraderPayload,
  extractCustomerDocument,
} from "../../../../supabase/functions/_shared/grader/payload.ts";
import { runDeterministicQa } from "../../../../supabase/functions/grade-single-assessment/_local/grader/deterministic-qa.ts";
import {
  buildPublicAuthorityExclusion,
  buildReasonableExpectations,
} from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { buildDataSubjectCommunicationDetermination } from "../../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { fillSlots } from "../../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import { runRiskFactorEngine } from "../../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";

// ── §1 — grader payload: customer document first ─────────────────────────

const SKELETON_REPORT = {
  skeleton_document: {
    title: "Registration Assessment",
    subtitle: "Prepared for Acme",
    sections: [{
      id: "s1",
      title: "Section I",
      paragraphs: [
        { kind: "skeleton", text: "The customer-facing analysis paragraph." },
        { kind: "table", text: "", table: { title: "T", columns: ["A", "B"], rows: [["x", "y"]] } },
      ],
    }],
  },
  registration_required_basis: "hidden internal contradiction field",
  obligations_summary: { dpo_condition: "Conditional on BDSG §38" },
};

Deno.test("doc129 §1.2 — a skeleton report leads with the CUSTOMER DOCUMENT; hidden fields land in labeled evidence", () => {
  const p = buildGraderPayload("cppa-risk", SKELETON_REPORT, 30_000, { customerDocFirst: true });
  const docIdx = p.text.indexOf("--- CUSTOMER DOCUMENT");
  const evIdx = p.text.indexOf("--- STRUCTURED EVIDENCE");
  assert(docIdx >= 0, "customer document header missing");
  assert(evIdx > docIdx, "evidence section missing or precedes the document");
  const docSection = p.text.slice(docIdx, evIdx);
  assert(docSection.includes("The customer-facing analysis paragraph."));
  assert(docSection.includes("x | y"), "table cells missing from flattened document");
  assert(!docSection.includes("hidden internal contradiction field"), "hidden field leaked into the customer section");
  assert(p.text.slice(evIdx).includes("registration_required_basis"), "hidden field missing from evidence");
  assert(p.text.slice(evIdx).includes("NOT customer-visible copy"), "evidence label missing its instruction");
});

Deno.test("doc129 §1.2 — a legacy-shaped record keeps the pre-existing body-first behavior", () => {
  const legacy = { executive_summary: "legacy body", overall_status: "ok", extra: "rest" };
  const p = buildGraderPayload("cppa-risk", legacy, 30_000, { customerDocFirst: true });
  assert(p.text.includes("--- DOCUMENT BODY ---"), "legacy body header missing");
  assert(!p.text.includes("--- CUSTOMER DOCUMENT"), "legacy record wrongly took the customer-document path");
  assert(p.text.indexOf("legacy body") < p.text.indexOf("rest"));
});

Deno.test("doc129 §1.2 — null family (registration/session shapes) uses the customer-document path", () => {
  const p = buildGraderPayload(null, { document_text: "x".repeat(300) + " final notice text" }, 30_000, { customerDocFirst: true });
  assert(p.text.includes("--- CUSTOMER DOCUMENT"), "document_text not treated as the customer document");
});

Deno.test("doc129 §1.5 — the DPA calibration note rides the payload", () => {
  const p = buildGraderPayload("dpa", { document_text: "y".repeat(300) }, 30_000, { customerDocFirst: true });
  assert(p.text.includes("CALIBRATION (DPA)"), "DPA calibration note missing");
});

Deno.test("doc129 §1.2 — the budget protects the customer document ahead of the evidence", () => {
  const report = {
    skeleton_document: SKELETON_REPORT.skeleton_document,
    bulk: "z".repeat(50_000),
  };
  const p = buildGraderPayload("cppa-risk", report, 2_000, { customerDocFirst: true });
  assert(p.truncated);
  assert(p.text.includes("The customer-facing analysis paragraph."), "customer document lost to evidence truncation");
});

// ── §2 — deterministic pre-grader QA ─────────────────────────────────────

Deno.test("doc129 §2 — the vocabulary lint and raw-token detector fire; a clean document passes", () => {
  const dirty = {
    skeleton_document: {
      title: "T",
      sections: [{
        id: "s",
        title: "S",
        paragraphs: [{
          kind: "skeleton",
          text: "The intake shows record insufficient state. What would settle it is encryptionStatus and encryption_key_status.",
        }],
      }],
    },
  };
  const findings = runDeterministicQa(dirty);
  const ids = findings.map((f) => f.check_id);
  assert(ids.includes("deterministic_vocab_intake"));
  assert(ids.includes("deterministic_vocab_record_insufficient"));
  assert(ids.includes("deterministic_raw_field_token"));
  assert(findings.every((f) => f.classification === "customer_visible_defect"));

  const clean = {
    skeleton_document: {
      title: "T",
      sections: [{
        id: "s",
        title: "S",
        paragraphs: [{ kind: "skeleton", text: "Based on the information supplied by the Company, the duty is satisfied." }],
      }],
    },
  };
  assertEquals(runDeterministicQa(clean).length, 0);
});

Deno.test("doc129 §2 item 1 — a cover/body disposition mismatch is proved deterministically", () => {
  const doc = (bodyLabel: string) => ({
    skeleton_document: {
      title: "T",
      sections: [{
        id: "s",
        title: "S",
        paragraphs: [
          { kind: "table", text: "", table: { columns: ["D", "R"], rows: [["Assessment disposition", "Do Not Proceed"]] } },
          { kind: "generated", text: `In this report's executive result, that determination is stated as "${bodyLabel}."` },
        ],
      }],
    },
  });
  const bad = runDeterministicQa(doc("Proceed"));
  assert(bad.some((f) => f.check_id === "deterministic_disposition_mismatch"), "mismatch not detected");
  const good = runDeterministicQa(doc("Do Not Proceed"));
  assert(!good.some((f) => f.check_id === "deterministic_disposition_mismatch"));
});

// ── LIA ──────────────────────────────────────────────────────────────────

Deno.test("doc129 LIA-A — a populated reasonable_expectation_detail is consumed, never asked for", () => {
  const r = buildReasonableExpectations({
    relationship_type: "Employees",
    processing_description: "Wearable-derived physiological monitoring underground",
    data_categories: ["Health data"],
    balancing_details: {
      reasonable_expectation: "Partly",
      reasonable_expectation_detail:
        "Workers reasonably expect proportionate safety monitoring underground, but not continuous physiological monitoring without notice; the works-council consultation closes that gap.",
    },
  });
  assertEquals(r.verdict, "partly_expected");
  assert(r.status !== "record_insufficient", "detail-backed factor still marked insufficient");
  assert(!r.application.includes("without supplying the fact"), "asks for a fact already supplied");
  assert(r.application.includes("Workers reasonably expect proportionate safety monitoring"), "detail not quoted");
});

Deno.test("doc129 LIA-A — no detail keeps the pre-existing insufficient branch", () => {
  const r = buildReasonableExpectations({
    balancing_details: { reasonable_expectation: "Partly" },
  });
  assertEquals(r.verdict, "undetermined_on_the_record");
  assertEquals(r.status, "record_insufficient");
});

Deno.test("doc129 LIA-C — the unanswered public-authority gate acknowledges the recorded entity and explains the ask", () => {
  const r = buildPublicAuthorityExclusion({
    organization_name: "Glacier Creek Mining Corporation",
    sector: "Mining and resource extraction",
    purpose_details: {},
  });
  assertEquals(r.determination, "undetermined_on_the_record");
  assert(r.application.includes("Glacier Creek Mining Corporation"), "recorded entity not acknowledged");
  assert(r.application.includes("legal character"), "why-explicit-confirmation explanation missing");
  assert(r.application.includes("record-completion"), "ask not framed as record completion");
});

Deno.test("doc129 LIA-E — the advocacy framing is retired from every renderable display block", async () => {
  // The map's citation_source provenance strings quote the ORIGINAL ratified
  // bearing as an audit record — only the `display` blocks are renderable
  // customer-facing text, so the check runs over those.
  const { LIA_CORPUS_MAP } = await import("../../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-corpus-map.ts"
  );
  const displays = JSON.stringify(
    LIA_CORPUS_MAP,
    // curation_note and citation_source are never-rendered audit records
    // preserving the original ratification bytes.
    (key, value) => (key === "citation_source" || key === "curation_note") ? undefined : value,
  );
  assert(!displays.includes("The largest verified rejection"), "advocacy framing survived in a display block");
  assert(displays.includes("cannot support the processing"), "neutral replacement missing");
});

// ── IR ───────────────────────────────────────────────────────────────────

Deno.test("doc129 IR-1 — the Art. 34 information ask carries no raw schema tokens", () => {
  const d = buildDataSubjectCommunicationDetermination({}, "notification_required", false);
  const needed = String((d as { information_needed?: string }).information_needed ?? "");
  assert(needed.length > 0, "ask missing");
  assert(!/[a-z]+[A-Z]/.test(needed), `raw token in ask: ${needed}`);
});

Deno.test("doc129 IR-2 — Art. 33(2) prose no longer says the processor notice starts the controller clock", async () => {
  const src = await Deno.readTextFile("supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts");
  assert(!src.includes("is what ordinarily starts it"), "old Art. 33(2) framing survived");
  assert(src.includes("however that awareness arises"), "corrected framing missing");
});

// ── Cyber ────────────────────────────────────────────────────────────────

Deno.test("doc129 CY-1 — the program-readiness all-clear is gated on the Section-2 readiness conclusion", async () => {
  const src = await Deno.readTextFile("supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts");
  assert(
    src.includes(`overallReadiness === "ready"`),
    "all-clear conclusion not gated on the readiness determination",
  );
  assert(
    src.includes("cannot yet be described as prepared for the independent audit") &&
      src.includes("auditor-engagement record above all"),
    "open-readiness conclusion branch missing",
  );
  assert(
    src.includes(`conclusion === "record_insufficient" && priority_actions.length === 0`),
    "priority-actions none-identified gate missing",
  );
});

// ── Governance ───────────────────────────────────────────────────────────

Deno.test("doc129 GOV — the register note separates priority from the portfolio target date", async () => {
  const src = await Deno.readTextFile("supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts");
  assert(src.includes("recorded portfolio defaults"), "portfolio-defaults label missing");
  assert(src.includes("higher-priority items should complete ahead of it"), "priority/target separation missing");
});

// ── CPPA Risk ────────────────────────────────────────────────────────────

Deno.test("doc129 RISK — an uncredited ledger explains WHY when a general safeguard description exists", () => {
  const r = runRiskFactorEngine(
    {
      processing_status: "Ongoing",
      impact_intake: { safeguards: "Opt-out honoured; GPC support; encryption in transit and at rest" },
      a5_harm_pathways: [{
        harm: "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
        likelihood: "Possible",
        severity: "Significant",
        data_involved: "Credentials",
      }],
    } as never,
    {} as never,
    "2026-09-01",
  );
  const exec = r.tables["executive_summary:6"];
  assert(exec?.note?.includes("which is why no credit appears"), "exec ledger why-none note missing");
  assert(
    (r.blocks["iv_determination:2"] ?? "").includes("crediting requires a safeguard recorded against this specific risk"),
    "§ 4.A why-none sentence missing",
  );
});

Deno.test("doc129 RISK fixture — the us-ds4 sample records per-risk a6_safeguards", async () => {
  const src = await Deno.readTextFile("src/lib/sampleFixtures.ts");
  assert(src.includes("a6_safeguards"), "fixture still has no per-risk safeguard rows");
  assert(src.includes(`safeguard_status: "Implemented and tested"`), "tested safeguard row missing");
  assert(src.includes(`safeguard_status: "Implemented, not tested"`), "untested safeguard row missing");
});

// ── DPA ──────────────────────────────────────────────────────────────────

Deno.test("doc129 DPA — inline slot values are sanitised at substitution", () => {
  const clause = `1.2 The Controller wishes to engage the Processor to provide {services} (the "Services") and, in the course.`;
  const out = fillSlots(clause, { services: "workforce management software for employees." });
  assert(out.includes(`employees (the "Services") and,`), `broken punctuation survived: ${out}`);
  assert(!out.includes("  "), "doubled spaces survived");
  // A slot that legitimately ends the sentence keeps its stop; abbreviations keep theirs.
  assertEquals(fillSlots("Provided by {name}", { name: "Acme Ltd." }), "Provided by Acme Ltd.");
  assert(fillSlots("Engage {p} to act", { p: "Acme Inc." }).includes("Acme Inc. to act"));
});

// ── US notice ────────────────────────────────────────────────────────────

Deno.test("doc129 US-notice — invented disclosure practices are removed from the template", async () => {
  const src = await Deno.readTextFile("supabase/functions/generate-us-notice/_local/render.ts");
  assert(!src.includes("payment processing"), "invented payment-processing function survived");
  assert(!src.includes("Professional advisers"), "invented professional-advisers category survived");
  assert(!src.includes("such as cloud hosting and analytics"), "invented provider examples survived");
  assert(
    src.includes("for the business purposes described in this notice: ${escapeHtml(purposes"),
    "3c does not ground its purposes in the intake",
  );
});
