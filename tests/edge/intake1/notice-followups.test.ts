// INTAKE-1 — conditional follow-up questions for the two notice builders and
// their generator wiring.
//
//   1. EU: `automated_decisions_detail` (GDPR Art.13(2)(f) / Art.22)
//   2. US: `vam_appeals_method` (Va. Code § 59.1-577(C) + analogues)
//
// Both are additive and optional: a legacy intake without the key must render
// a BYTE-IDENTICAL notice.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  buildNoticeHtml as buildEuNoticeHtml,
  type FwSel,
} from "../../../supabase/functions/generate-eu-notice/index.ts";

import {
  buildNoticeHtml as buildUsNoticeHtml,
  type StateRow,
} from "../../../supabase/functions/generate-us-notice/index.ts";

import { UNIVERSAL_EU_NOTICE_QUESTIONS } from "../../../src/data/eu-notice-questions/universal-questions.ts";
import { VIRGINIA_MODEL_QUESTIONS } from "../../../src/data/us-notice-questions/virginia-model-questions.ts";

const FW_GDPR: FwSel = {
  framework_code: "EU_GDPR",
  framework_name: "EU GDPR",
  law_citation: "Regulation (EU) 2016/679",
};

const STATE_VA: StateRow = {
  state_code: "VA",
  state_name: "Virginia",
  framework_type: "virginia_model",
};

const EU_BASE: Record<string, unknown> = {
  controller_name: "Acme Ltd",
  controller_email: "privacy@acme.test",
  contact_email: "privacy@acme.test",
  processing_purposes: ["service_delivery"],
  data_categories: ["identifiers"],
  lawful_basis: "contract",
  retention_period: "24 months",
  automated_decisions: "yes",
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

// ---------------------------------------------------------------- shape ----

Deno.test("INTAKE-1: EU follow-up question shape is valid and additive", () => {
  const q = UNIVERSAL_EU_NOTICE_QUESTIONS.find(
    (x) => x.key === "automated_decisions_detail",
  );
  assert(q, "automated_decisions_detail must exist");
  assertEquals(q!.type, "text_long");
  assertEquals(q!.isRequired, false);
  assertEquals(q!.showIf, {
    questionKey: "automated_decisions",
    operator: "equals",
    value: "yes",
  });
  assertStringIncludes(q!.whyWeAsk, "Art.13(2)(f)");

  // Parent untouched.
  const parent = UNIVERSAL_EU_NOTICE_QUESTIONS.find(
    (x) => x.key === "automated_decisions",
  )!;
  assertEquals(
    parent.text,
    "Do you make automated decisions with legal or significant effects on individuals?",
  );
  assertEquals(parent.type, "yes_no_unsure");
  assertEquals(parent.isRequired, true);
  assertEquals(parent.flagIf?.length, 1);
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

// ---------------------------------------------- conditional both ways -----

function shown(q: { showIf?: { questionKey: string; value: unknown } }, answers: Record<string, unknown>) {
  if (!q.showIf) return true;
  return answers[q.showIf.questionKey] === q.showIf.value;
}

Deno.test("INTAKE-1: conditional display, both directions", () => {
  const eu = UNIVERSAL_EU_NOTICE_QUESTIONS.find(
    (x) => x.key === "automated_decisions_detail",
  )!;
  assertEquals(shown(eu, { automated_decisions: "yes" }), true);
  assertEquals(shown(eu, { automated_decisions: "no" }), false);
  assertEquals(shown(eu, {}), false);

  const us = VIRGINIA_MODEL_QUESTIONS.find((x) => x.key === "vam_appeals_method")!;
  assertEquals(shown(us, { vam_appeals_process: "yes" }), true);
  assertEquals(shown(us, { vam_appeals_process: "no" }), false);
});

// -------------------------------------------------- generator wiring ------

Deno.test("INTAKE-1: EU generator renders supplied detail; legacy is byte-identical", () => {
  const legacy = buildEuNoticeHtml({
    fw: FW_GDPR,
    answers: EU_BASE,
    generatedAt: AT,
  });
  const withDetail = buildEuNoticeHtml({
    fw: FW_GDPR,
    answers: {
      ...EU_BASE,
      automated_decisions_detail:
        "A rules engine scores applications on payment history; a low score delays onboarding by up to 48 hours.",
    },
    generatedAt: AT,
  });

  assertStringIncludes(withDetail, "Meaningful information about the logic involved");
  assertStringIncludes(withDetail, "A rules engine scores applications");
  assertStringIncludes(withDetail, "human intervention");

  // Legacy record: no follow-up key at all -> byte-identical to today.
  assert(!legacy.includes("Meaningful information about the logic involved"));
  assertEquals(
    legacy,
    buildEuNoticeHtml({ fw: FW_GDPR, answers: { ...EU_BASE }, generatedAt: AT }),
  );
  // Empty-string answer must also be inert.
  assertEquals(
    buildEuNoticeHtml({
      fw: FW_GDPR,
      answers: { ...EU_BASE, automated_decisions_detail: "  " },
      generatedAt: AT,
    }),
    legacy,
  );
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
