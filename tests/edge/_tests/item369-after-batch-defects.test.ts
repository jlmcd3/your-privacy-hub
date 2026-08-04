// ITEM 369 — WAVE-1 AFTER-BATCH DEFECTS. Regression locks for the three
// code-side defects fixed in this dispatch. Each test restates the observed
// defect, so a future change that reintroduces it fails here.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyFrameSubstitution } from "../../../supabase/functions/_shared/prose/frame-substitution.ts";
import {
  countDpiaBoilerplate,
  INFO_NEEDED_LITERAL,
  NEUTRAL_DOWNGRADE_LITERAL,
} from "../../../supabase/functions/run-dpia-framework/_dpia_boilerplate_cap.ts";
import { DPIA_FRAMES } from "../../../library/prose/load.ts";
import { runFormatChecksGeneric } from "../../../supabase/functions/_shared/grader/format-checks.ts";
import { extractProseFromReport } from "../../../supabase/functions/_shared/advisory-voice.ts";
import { REPORT_DISCLAIMER } from "../../../supabase/functions/_shared/report-disclaimer.ts";
import {
  dpoRegimeLabel,
} from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";

function e6Failures(text: string) {
  return runFormatChecksGeneric(text).filter((f) =>
    f.check_id.includes("e6") && !f.passed
  );
}

// ---------------------------------------------------------------- DEFECT 1

Deno.test("defect 1 — frame substitution clears every gate literal", () => {
  const report: Record<string, unknown> = {
    section_0_overview: { assessment_team: INFO_NEEDED_LITERAL, scope: INFO_NEEDED_LITERAL },
    section_1_description: { processing: INFO_NEEDED_LITERAL },
    section_5_interested_parties: { consultation: INFO_NEEDED_LITERAL },
    section_6_conclusion: {
      validation_approval: INFO_NEEDED_LITERAL,
      outcome: NEUTRAL_DOWNGRADE_LITERAL,
    },
    executive_summary: NEUTRAL_DOWNGRADE_LITERAL,
  };
  const before = countDpiaBoilerplate(report);
  assertEquals(before.info_needed + before.neutral_downgrade, 7);

  const counters = applyFrameSubstitution(report, {
    product: "dpia",
    frameSet: DPIA_FRAMES,
    values: {
      "org_context.company_name": "Northwind Health Ltd",
      "dpia_metadata.document_name": "Northwind Telehealth DPIA",
    },
  });

  assertEquals(counters.crashed, false);
  assertEquals(counters.literals_remaining, 0);
  const after = countDpiaBoilerplate(report);
  assertEquals(after.info_needed, 0);
  assertEquals(after.neutral_downgrade, 0);
});

Deno.test("defect 1 — substituted atoms carry no span sentinels or source paths", () => {
  const report: Record<string, unknown> = {
    section_0_overview: { assessment_team: INFO_NEEDED_LITERAL },
  };
  applyFrameSubstitution(report, {
    product: "dpia",
    frameSet: DPIA_FRAMES,
    values: { "org_context.company_name": "Northwind Health Ltd" },
  });
  const text = JSON.stringify(report);
  assertEquals(/[\uE000\uE001\uE002]/.test(text), false, "span sentinel leaked");
  assertEquals(text.includes("org_context.company_name"), false, "source path leaked");
  assert(text.includes("Northwind Health Ltd"), "record value lost");
});

Deno.test("defect 1 — substitution is deterministic", () => {
  const make = () => ({
    a: INFO_NEEDED_LITERAL, b: INFO_NEEDED_LITERAL, c: NEUTRAL_DOWNGRADE_LITERAL,
  }) as Record<string, unknown>;
  const r1 = make(); const r2 = make();
  const o = { product: "dpia" as const, frameSet: DPIA_FRAMES, values: {} };
  applyFrameSubstitution(r1, o);
  applyFrameSubstitution(r2, o);
  assertEquals(JSON.stringify(r1), JSON.stringify(r2));
});

// ---------------------------------------------------------------- DEFECT 2

Deno.test("defect 2 — sanctioned LIA Annex-1 reservation clears e6", () => {
  const annex =
    "The specific conditions in Annex 1 are outside this tool's current corpus and are not assessed here; whether any Annex 1 condition is met is reserved to qualified legal counsel.";
  assertEquals(e6Failures(annex).length, 0);
});

Deno.test("defect 2 — universal disclaimer clears e6", () => {
  assertEquals(e6Failures(REPORT_DISCLAIMER).length, 0);
});

Deno.test("defect 2 — a genuine model-authored referral still fails e6", () => {
  const referral =
    "The organisation should consult legal counsel before relying on this basis.";
  assertEquals(e6Failures(referral).length, 1);
});

Deno.test("defect 2 — short structured fields are not scanned as prose", () => {
  const prose = extractProseFromReport({
    jurisdiction: "uk",
    exception_qualifies: "permitted_with_safeguards",
    citation: "UK GDPR Art. 22C(2)",
    narrative: "The record documents a twenty-four month retention period for renewals.",
  });
  assertEquals(prose.includes("uk"), false);
  assertEquals(prose.includes("permitted_with_safeguards"), false);
  assert(prose.includes("twenty-four month retention"));
});

// ---------------------------------------------------------------- DEFECT 3

Deno.test("defect 3 — DPO citation is scoped to the regime actually engaged", () => {
  assertEquals(
    dpoRegimeLabel({ organization_country: "UK", markets_served: ["UK"] } as never),
    "UK GDPR",
  );
  assertEquals(
    dpoRegimeLabel({ organization_country: "UK", markets_served: ["UK", "EU"] } as never),
    "GDPR",
  );
  assertEquals(dpoRegimeLabel({ markets_served: ["EU"] } as never), "GDPR");
});
