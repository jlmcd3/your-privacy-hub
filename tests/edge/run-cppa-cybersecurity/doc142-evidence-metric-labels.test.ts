// DOC 142 (2026-09-02) — Cyber evidence-metric label disambiguation.
//
// External-review item (P2): a policy-only record rendered both "Testable
// evidence identified for 0 of 18 components" (Readiness snapshot,
// buildExecutiveSnapshotRows) and "Components lacking identified evidence:
// 0" (Section 1 record-sufficiency line, purpose_scope_record:10). The two
// measure DIFFERENT things — auditor-testable operating artifacts vs. any
// evidence category identified at all — but the labels read as a flat
// contradiction. The fix names each metric's own concept: "Testable
// operating evidence identified for N of 18 components" and "Components
// with no evidence category identified at all: N", with an explicit
// pointer that testability is assessed separately in Section 2.

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { CYBER_7123_COMPONENTS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";
import type { RenderedSkeletonDocument } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

function flatten(document: RenderedSkeletonDocument): string {
  return document.sections
    .map((s) =>
      [s.title, ...s.paragraphs.map((p) =>
        p.kind === "table" && p.table
          ? [p.table.title ?? "", ...(p.table.rows ?? []).map((r) => r.join(" | "))].join("\n")
          : String(p.text ?? "")
      )].join("\n")
    )
    .join("\n\n");
}

// The Vortex-shaped record: every component assessed, narrated, and backed
// by a policy-only evidence category — so ANY-evidence-identified is 18/18
// while TESTABLE evidence is 0/18. This is exactly the pair the reviewer
// read as contradictory.
function policyOnlyIntake(): Bag {
  return {
    profile: { entity_name: "Vortexish Testing, Inc.", industry: "AI & Machine Learning" },
    controls: CYBER_7123_COMPONENTS.map((c) => ({
      key: c.slug,
      maturity: "Implemented",
      notes: `Documented process covering ${c.label}.`,
      evidence: ["Policy / procedure document"],
    })),
  };
}

const BANNED_PHRASES = [
  "the record shows", "the record reflects", "the record indicates",
  "the record demonstrates", "the record establishes", "on this record",
];

Deno.test("DOC142 — Cyber: the two evidence metrics carry visibly distinct labels on a policy-only record", () => {
  const intake = policyOnlyIntake();
  const d = buildCyberDeliverables(intake);

  // Precondition: the fixture actually produces the confusing pair —
  // 0 testable ("sufficient") components, 0 components with no evidence
  // category at all.
  const sufficient = d.evidence_sufficiency.filter((r) => r.sufficiency === "sufficient").length;
  assert(sufficient === 0, `fixture drift: expected 0 testable components, got ${sufficient}`);

  const out = assembleCyberSkeletonDocumentV4(d as unknown as Bag, intake, "", "2026-09-02");
  const text = flatten(out.document);

  // New snapshot label names the testability concept.
  assert(text.includes("Testable operating evidence identified for 0 of 18 components"),
    "Readiness snapshot must label the metric as TESTABLE OPERATING evidence");

  // New Section 1 label names the any-category concept, plus the pointer.
  assert(text.includes("Components with no evidence category identified at all: 0"),
    "Section 1 must count components with NO evidence category identified at all");
  assert(text.includes("Whether identified evidence is testable is assessed separately in Section 2."),
    "Section 1 must point at the testability metric's separate home");

  // The old ambiguous labels never come back.
  assert(!text.includes("Components lacking identified evidence:"),
    "old ambiguous Section 1 label rendered");
  assert(!/Testable evidence identified for \d+ of 18/.test(text),
    "old ambiguous snapshot label rendered");

  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    assert(!lower.includes(phrase), `banned phrase "${phrase}" rendered`);
  }
});

Deno.test("DOC142 — Cyber: labels stay distinct and truthful when a component genuinely has no evidence category", () => {
  const intake = policyOnlyIntake();
  // First component affirmatively declares no evidence on file.
  (intake.controls as Bag[])[0].evidence = ["None on file"];
  const d = buildCyberDeliverables(intake);
  const out = assembleCyberSkeletonDocumentV4(d as unknown as Bag, intake, "", "2026-09-02");
  const text = flatten(out.document);
  assert(text.includes("Components with no evidence category identified at all: 1"),
    "the no-category count must track the component that identifies no evidence");
  assert(text.includes("Testable operating evidence identified for 0 of 18 components"),
    "the testable metric keeps its own label");
});
