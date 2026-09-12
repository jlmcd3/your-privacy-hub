// BATCH a77240e3 (2026-09-12) — ChatGPT's "Report Prose Review v5" plus
// Claude's independent code check agreed on one real IR Playbook defect
// (IR5-04). IR5-01/IR5-02 were checked and found already remediated
// (doc 256's lead-authority note; California's own § 1798.82 gate already
// exists in STATE_WALK_GATES). IR5-03 targets the CEO-redlined four-gate
// sentences (2026-08-29 ratification) and was deliberately left untouched.
//
// IR5-04 — "The company has not named the processor" stated the gap and
// stopped, unlike every sibling gap in this document (the SA-determination
// dataTypes/encryption asks), which pair the gap with an immediate
// follow-up sentence.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { buildSaNotificationDetermination } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";

type Bag = Record<string, unknown>;

function baseIntake(over: Bag = {}): Bag {
  return {
    organizationName: "Velorix Digital Services Ltd", organisationType: "SaaS platform", discoveryDateTime: "2026-09-01T10:00",
    cause: "Ransomware or malware", dataTypes: ["Passwords / credentials"], affectedCount: "1,000–10,000",
    jurisdictions: ["EU/EEA", "United Kingdom"], contained: "Yes",
    ...over,
  };
}

function renderText(intake: Bag): string {
  const sa = buildSaNotificationDetermination(intake, "eu");
  const report: Bag = { sa_notification_determination: sa, ds_communication_determination: {} };
  return skeletonDocumentToText(assembleIRSkeletonDocument(report, intake).document);
}

Deno.test("IR5-04 — a named-but-unresolved processor gets an immediate follow-up sentence, not just the bare gap", () => {
  const text = renderText(baseIntake({ processorInvolved: true }));
  assertStringIncludes(text, "The company has not named the processor.");
  assertStringIncludes(text, "The immediate follow-up is to confirm the processor's name and role");
});

Deno.test("IR5-04 — a named processor keeps its own sentence, not the gap-plus-follow-up (no regression)", () => {
  const text = renderText(baseIntake({ processorInvolved: true, processorName: "CloudOps GmbH" }));
  assertStringIncludes(text, "The company has identified the processor as CloudOps GmbH");
  assert(!text.includes("The immediate follow-up is to confirm the processor's name"));
});

Deno.test("IR5-04 — no processor involved renders no processor section at all (no regression)", () => {
  const text = renderText(baseIntake({ processorInvolved: false }));
  assert(!text.includes("has not named the processor"));
});
