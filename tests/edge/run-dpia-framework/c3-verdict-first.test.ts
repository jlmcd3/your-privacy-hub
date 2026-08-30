// BATCH 19b (Wave C3 — doc 113 Part D, doc 109 DPIA item 1, doc 111 D2).
// The DPIA Executive Summary becomes verdict-first:
//   S4.1 exec blocks reorder [generated, skeleton]; both hash bases
//        re-pinned per the spine's own convention (recompute pinned here).
//   S4.2 the statutory frame is ≤80 words; the Art. 35(3) enumeration
//        retired; the WP248 sentence lives verbatim in the Appendix A intro.
//   S4.3 the grounded decision statement OPENS the body as the
//        "Determination." chunk — its sentence bytes unchanged.
//   S4.4 the open points render as the Rule-4 "— " list (≤3 preview cap).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DPIA_SKELETON_CONTENT_HASH,
  DPIA_SKELETON_SECTIONS,
  DPIA_SKELETON_VERSION,
  DPIA_SPINE_HASH,
  serializeDpiaSpine,
} from "../../../supabase/functions/_shared/prose/plans/dpia.spine.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const INTAKE: Bag = {
  organization_name: "Acme Health GmbH",
  processing_activity_name: "Patient triage analytics",
  description: "Automated triage scoring of patient intake forms",
  reasons_to_conduct: ["large_scale_special_category"],
};

const sha = async (t: string) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.test("C3/S4.1: both v4.7 hash bases recompute to the shipped pins", async () => {
  const basis1 = DPIA_SKELETON_SECTIONS
    .flatMap((s) => s.blocks.filter((b) => b.kind === "skeleton").map((b) => b.text))
    .join("\n");
  assertEquals(await sha(basis1), DPIA_SKELETON_CONTENT_HASH);
  assertEquals(await sha(serializeDpiaSpine()), DPIA_SPINE_HASH);
  assertEquals(DPIA_SKELETON_VERSION, "dpia-v4.7-2026-08-30");
});

Deno.test("C3/S4.2: the exec statutory frame is under eighty words and WP248 lives in Appendix A", () => {
  const exec = DPIA_SKELETON_SECTIONS.find((s) => s.id === "executive_summary")!;
  assertEquals(exec.blocks.map((b) => b.kind), ["generated", "skeleton"]);
  const frame = exec.blocks[1].text;
  // The statutory portion (before the slotted company sentences).
  const statutory = frame.split("{organizationName}")[0];
  const words = statutory.split(/\s+/).filter(Boolean).length;
  assert(words <= 80, `statutory frame is ${words} words`);
  assertStringIncludes(statutory, "Article 35(3) identifies the cases in which one is required in particular");
  assert(!frame.includes("WP248"), "WP248 must not remain in the exec frame");
  const appendixIntro = DPIA_SKELETON_SECTIONS
    .flatMap((s) => s.blocks)
    .find((b) => b.text.includes("factor-by-factor audit trail"))!;
  assertStringIncludes(
    appendixIntro.text,
    "The EDPB-endorsed WP248 rev.01 criteria and applicable supervisory-authority lists may identify additional processing likely to present high risk.",
  );
});

Deno.test("C3/S4.3: the determination opens the executive body, bytes intact after the label", () => {
  const report: Bag = {
    determination: "draft_incomplete",
    risk_register: [],
    information_needed: [
      { field: "retention", dimensions: "the retention period applied to triage scores", enables: "the retention analysis" },
    ],
  };
  const out = assembleDpiaSkeletonDocument(report, INTAKE);
  const exec = out.document.sections.find((s) => s.id === "executive_summary")!;
  const body = exec.paragraphs[0].text;
  assert(
    body.startsWith("Determination. "),
    "the executive body must open with the Determination chunk",
  );
  // RULING 3.2 — the ratified sentence's bytes are unchanged after the label.
  assertStringIncludes(
    body,
    "Determination. This assessment reviews no risks, because the company has recorded none and none is otherwise identified here; no determination on whether the processing may proceed can rest on a register that is empty.",
  );
  // The statutory frame now closes the section.
  const last = exec.paragraphs[exec.paragraphs.length - 1];
  assertStringIncludes(last.text, "Article 35(1) of the General Data Protection Regulation");
});

Deno.test("C3/S4.4: multiple open points render as the dash list under the byte-unchanged lead", () => {
  const report: Bag = {
    determination: "draft_incomplete",
    risk_register: [],
    information_needed: [
      { field: "a", dimensions: "the retention period applied to triage scores", enables: "the retention analysis" },
      { field: "b", dimensions: "the Article 46 instrument relied on for the processor", enables: "the transfer determination" },
      { field: "c", dimensions: "the name and contact details of the data protection officer", enables: "" },
      { field: "d", dimensions: "the categories of recipients in the third country", enables: "" },
    ],
  };
  const text = skeletonDocumentToText(assembleDpiaSkeletonDocument(report, INTAKE).document);
  assertStringIncludes(text, "four points are still open; each is listed in the gap table and raised again where it bears on a determination. The first three are:");
  assertEquals(text.split("\n— ").length - 1, 3, "the preview cap stays at three bullets");
  assertStringIncludes(text, "\n— the retention period applied to triage scores — which completes the retention analysis");
});
