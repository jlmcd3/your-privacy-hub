// INTAKE-1 — US notice builder: `vam_appeals_method` conditional follow-up
// (Va. Code § 59.1-577(C) and state analogues). Additive and optional: a
// legacy intake without the key must render a BYTE-IDENTICAL notice.
//
// Lives in its own file because each notice function's index.ts calls
// Deno.serve at module scope; importing two of them in one test module binds
// the same port twice.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  buildNoticeHtml as buildUsNoticeHtml,
  type StateRow,
} from "../../../supabase/functions/generate-us-notice/index.ts";

import { VIRGINIA_MODEL_QUESTIONS } from "../../../src/data/us-notice-questions/virginia-model-questions.ts";

const STATE_VA: StateRow = {
  state_code: "VA",
  state_name: "Virginia",
  framework_type: "virginia_model",
};

const US_BASE: Record<string, unknown> = {
  business_name: "Acme Inc",
  business_description: "We sell widgets.",
  contact_email: "privacy@acme.test",
  data_categories: ["identifiers"],
  collection_purposes: ["service_delivery"],
  third_party_sharing: "no",
  sale_or_sharing: "no",
  retention_general: "24 months",
  vam_appeals_process: "yes",
};

const AT = "2026-08-08T00:00:00.000Z";

function shown(q: { showIf?: { questionKey: string; value: unknown } }, answers: Record<string, unknown>) {
  if (!q.showIf) return true;
  return answers[q.showIf.questionKey] === q.showIf.value;
}

Deno.test("INTAKE-1: conditional display, both directions (US)", () => {
  const us = VIRGINIA_MODEL_QUESTIONS.find((x) => x.key === "vam_appeals_method")!;
  assertEquals(shown(us, { vam_appeals_process: "yes" }), true);
  assertEquals(shown(us, { vam_appeals_process: "no" }), false);
  assertEquals(shown(us, {}), false);
});

Deno.test("INTAKE-1: US follow-up question shape mirrors the parent jurisdictions", () => {
  const parent = VIRGINIA_MODEL_QUESTIONS.find(
    (x) => x.key === "vam_appeals_process",
  )!;
  const q = VIRGINIA_MODEL_QUESTIONS.find((x) => x.key === "vam_appeals_method");
  assert(q, "vam_appeals_method must exist");
  assertEquals(q!.type, "text_long");
  assertEquals(q!.isRequired, false);
  assertEquals(q!.jurisdictionOnly, parent.jurisdictionOnly);
  assertEquals(q!.jurisdictionOnly, ["US_VA", "US_CO", "US_CT", "US_TX"]);
  assertEquals(q!.showIf, {
    questionKey: "vam_appeals_process",
    operator: "equals",
    value: "yes",
  });
  assertStringIncludes(q!.whyWeAsk, "59.1-577(C)");

  // Parent untouched.
  assertEquals(parent.type, "yes_no");
  assertEquals(parent.isRequired, true);
  assertEquals(parent.flagIf?.[0].value, "no");
});

Deno.test("INTAKE-1: US generator renders appeals method with AG sentence; legacy is byte-identical", () => {
  const legacy = buildUsNoticeHtml(STATE_VA, US_BASE, AT);
  const withMethod = buildUsNoticeHtml(
    STATE_VA,
    {
      ...US_BASE,
      vam_appeals_method:
        "Email privacy@acme.test with the subject line 'Appeal'; we reply in writing within 60 days.",
    },
    AT,
  );

  assertStringIncludes(withMethod, "How to submit an appeal");
  assertStringIncludes(withMethod, "subject line &#39;Appeal&#39;");
  assertStringIncludes(
    withMethod,
    "you may contact the Virginia Attorney General to submit a complaint.",
  );

  assert(!legacy.includes("How to submit an appeal"));
  assertEquals(legacy, buildUsNoticeHtml(STATE_VA, { ...US_BASE }, AT));
  assertEquals(
    buildUsNoticeHtml(STATE_VA, { ...US_BASE, vam_appeals_method: "" }, AT),
    legacy,
  );
});
