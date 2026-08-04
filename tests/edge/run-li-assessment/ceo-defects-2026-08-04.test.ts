// CEO defects (run 33e79a31 / doc 4d610d79) — LIA regression tests.
//
// 1. storage-limitation cross-read against the golden fixture that carries
//    balancing_details.duration.
// 2. Annex 1 corpus-pending sentence matches the sanctioned counsel register.
// 3. Universal disclaimer is exempt from the grader's e6 scan; a genuine
//    model-authored counsel referral still flags.
// 4. Enum tokens no longer enter the prose scan surface.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  enforceStorageLimitationCrossRead,
  retentionOnRecord,
} from "../../../supabase/functions/run-li-assessment/_lia_storage_limitation.ts";
import { ANNEX_1_RESERVED_NOTE } from "../../../supabase/functions/_shared/ltp/lia-deliverables/elements.ts";
import { SANCTIONED_COUNSEL_REGISTER } from "../../../supabase/functions/_shared/emit-gate.ts";
import { runFormatChecksGeneric } from "../../../supabase/functions/_shared/grader/format-checks.ts";
import { REPORT_DISCLAIMER } from "../../../supabase/functions/_shared/report-disclaimer.ts";
import { extractProseFromReport } from "../../../supabase/functions/_shared/advisory-voice.ts";
import { LIA_GOLDEN } from "../../../supabase/functions/_shared/golden/lia.ts";

const OFFENDING =
  "No retention period or deletion trigger is stated for either data category, leaving the storage-limitation requirement under Article 5(1)(e) UK GDPR undocumented.";

function goldenWithDuration() {
  const f = (LIA_GOLDEN as any[]).find(
    (x) => typeof x?.intake?.balancing_details?.duration === "string" &&
      x.intake.balancing_details.duration.trim(),
  );
  assert(f, "no golden LIA fixture carries balancing_details.duration");
  return f;
}

Deno.test("golden fixture carrying duration: storage-limitation passage never claims retention is undocumented", () => {
  const f = goldenWithDuration();
  const retention = retentionOnRecord(f.intake);
  assert(retention.length > 0, "duration not read off the record");

  const report: any = {
    necessity_test: {
      analysis:
        "The processing is the least intrusive route available on the alternatives stated. " +
        OFFENDING +
        " Pseudonymisation is applied to the behavioural stream.",
      risk_factors: ["retention period not stated for the behavioural category"],
      open_questions: ["What is the deletion trigger?"],
    },
  };

  const res = enforceStorageLimitationCrossRead(report, f.intake);
  assert(res.changed, "guard did not engage on a record that states retention");

  const analysis: string = report.necessity_test.analysis;
  assert(
    !/undocumented/i.test(analysis),
    "storage-limitation passage still claims the requirement is undocumented:\n" + analysis,
  );
  assert(
    !/no retention period or deletion trigger is stated/i.test(analysis),
    "false absence claim survived:\n" + analysis,
  );
  assertStringIncludes(analysis, retention);
  assertEquals(
    report.necessity_test.risk_factors.filter((r: string) => /retention period not stated/i.test(r)).length,
    0,
  );
});

Deno.test("record without retention: existing degradation stands untouched", () => {
  const report: any = { necessity_test: { analysis: OFFENDING } };
  const res = enforceStorageLimitationCrossRead(report, { balancing_details: {} });
  assertEquals(res.changed, false);
  assertEquals(report.necessity_test.analysis, OFFENDING);
});

Deno.test("Annex 1 corpus-pending sentence matches a sanctioned counsel pattern", () => {
  const matched = (SANCTIONED_COUNSEL_REGISTER as readonly RegExp[]).some((re) =>
    re.test(ANNEX_1_RESERVED_NOTE)
  );
  assert(matched, "ANNEX_1_RESERVED_NOTE is not sanctioned:\n" + ANNEX_1_RESERVED_NOTE);
  assert(!/reserved to review by qualified counsel/i.test(ANNEX_1_RESERVED_NOTE));
});

Deno.test("universal disclaimer is exempt from e6; model-authored referral still flags", () => {
  const clean = runFormatChecksGeneric(
    "The record states the retention applied to this processing. " + REPORT_DISCLAIMER,
  ).filter((f) => f.check_id.startsWith("e6") && !f.passed);
  assertEquals(clean.length, 0, JSON.stringify(clean, null, 2));

  const dirty = runFormatChecksGeneric(
    "The organisation should consult legal counsel before relying on this basis.",
  ).filter((f) => f.check_id.startsWith("e6") && !f.passed);
  assert(dirty.length > 0, "genuine counsel referral no longer flags — e6 was weakened");
});

Deno.test("prose scan surface excludes structured enum tokens", () => {
  const prose = extractProseFromReport({
    verdict: "permitted_with_safeguards",
    status: "record_insufficient",
    analysis: "The record states a thirteen-month retention for event-level data.",
  });
  assert(!prose.includes("permitted_with_safeguards"), prose);
  assert(!prose.includes("record_insufficient"), prose);
  assertStringIncludes(prose, "thirteen-month retention");
});
