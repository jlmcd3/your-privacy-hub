// DOC 275 §15 items 1, 2, 4 (CEO-approved 2026-09-19) — spine v4.14 adds
// three identification sentences: Section 1's controller-contact sentence
// ({controllerContact}), Section 1's prepared-by sentence ({dpiaTeam}), and
// Section 5's own-words safeguards sentence ({safeguardsOther}, a NEW slot).
// Each follows the spine's no-padding law: a null slot drops the whole
// sentence, never a placeholder or an empty quote.
//
// Render chain: the same offline, deterministic call sequence production
// uses (tests/edge/product-test/render/dispatcher.ts's renderDpia) —
// attachDpiaDeliverables then assembleDpiaSkeletonDocument — over the pinned
// DPIA_PERFECT golden (tests/edge/ptest/determinism.test.ts's sibling
// pattern for the CPPA engines; tests/edge/run-dpia-framework/doc171-
// syllabus-record-dpia.test.ts is the DPIA precedent for this exact chain).
//
// NOT RUN as part of this change — do not execute with `deno test`.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/dpia.ts";
import { attachDpiaDeliverables } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));

const FIXTURE = DPIA_PERFECT.find((g) => g.id === "dpia-perfect-eu-complete")!;
const INTAKE = () => clone(FIXTURE.intake);

function renderText(intake: Bag): string {
  const report: Bag = {};
  attachDpiaDeliverables(report, intake, { unitsMinimal: false });
  const result = assembleDpiaSkeletonDocument(report, intake, {
    obligation_sentences: [],
    adequacy_sentences: [],
  });
  return skeletonDocumentToText(result.document);
}

Deno.test("doc275 — the contact sentence renders with the fixture's controller_contact", () => {
  const intake = INTAKE();
  const text = renderText(intake);
  const contact = String(intake.controller_contact);
  assertStringIncludes(text, `The controller's contact for this assessment is ${contact}.`);
});

Deno.test("doc275 — the prepared-by sentence renders, quoted and attributed to the Company", () => {
  const intake = INTAKE();
  const text = renderText(intake);
  assertStringIncludes(text, "The company records that this assessment was prepared by “");
  // The team roster's lead entry, so the fixture's actual dpia_team value
  // (not a placeholder) reached the sentence.
  assertStringIncludes(text, "A. Okonjo, Privacy Counsel (lead drafter)");
});

Deno.test("doc275 — the other-safeguards sentence renders when safeguards_other is set", () => {
  const intake = INTAKE();
  const text = renderText(intake);
  assertStringIncludes(
    text,
    "The company also describes these safeguards in its own words: “",
  );
  assertStringIncludes(
    text,
    "the two named physician accounts are the only access route to diagnosis categories",
  );
});

Deno.test("doc275 — the other-safeguards sentence is absent (no-padding law) when safeguards_other is removed", () => {
  const intake = INTAKE();
  delete (intake as Record<string, unknown>).safeguards_other;
  const text = renderText(intake);
  assert(
    !text.includes("The company also describes these safeguards in its own words"),
    "the sentence must be dropped entirely, not printed with an empty quote",
  );
});

Deno.test("doc275 — no unresolved {slot} token and no literal 'undefined' anywhere in the rendered document", () => {
  const intake = INTAKE();
  const text = renderText(intake);
  assert(!text.includes("{"), "an unresolved slot brace leaked into the document");
  assert(!/\bundefined\b/.test(text), "the literal word 'undefined' leaked into the document");
});

Deno.test("doc275 — the same three assertions hold on the pinned UK-complete fixture too", () => {
  const uk = clone(DPIA_PERFECT.find((g) => g.id.startsWith("dpia-perfect-uk"))!.intake);
  const text = renderText(uk);
  assertStringIncludes(text, `The controller's contact for this assessment is ${String(uk.controller_contact)}.`);
  assertStringIncludes(text, "The company records that this assessment was prepared by “");
  assertStringIncludes(text, "The company also describes these safeguards in its own words: “");
  assert(!text.includes("{"));
  assert(!/\bundefined\b/.test(text));
});
