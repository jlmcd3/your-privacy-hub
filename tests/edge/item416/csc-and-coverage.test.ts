// ITEM 416 LEG C — IR CSC + COVERAGE COMPLETION.
//
// Identities:
//   item416 linkage every prose-gold absence phrasing is detected
//   item416 designed absence phrasings are never absence
//   item416 i1 repairs a section still asking for a recorded fact
//   item416 i2 repairs a false absence on a backed section
//   item416 silent record leaves the honest absence byte-identical
//   item416 authority leaves are never rewritten
//   item416 coverage zero orphans on the perfect fixture
//   item416 coverage names permanent orphans instead of counting them
//   item416 coverage flags a supplied fact with no surface
//   item416 gate counts an unrepaired i2 as a false absence

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachIrCsc,
  IR_AUTHORITY_LEAF_KEYS,
  IR_LABEL_ABSENCE_RE,
  irCarriesAbsence,
  runIrCsc,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-csc.ts";
import {
  IR_ABSENCE_LABEL_PHRASINGS,
  IR_DESIGNED_ABSENCE_EXEMPTIONS,
  STANDING_TO_COMPLETE,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-prose-gold.ts";
import {
  IR_PERMANENT_ORPHAN_KEYS,
  runCoverageMatrix,
} from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { FALSE_ABSENCE_CHECK_IDS } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { IR_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/ir-perfect.ts";
import { buildStandingPlaybook } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts";

const PERFECT = IR_PERFECT[0].intake as Record<string, unknown>;

function perfectReport(): Record<string, unknown> {
  return {
    standing_playbook: buildStandingPlaybook(PERFECT, undefined as never),
    playbook_text:
      "The organisation discovered the incident on the recorded date and the response proceeds from the standing arrangements below.",
    sa_notification_determination: {
      decision: "notify",
      reason:
        "The recorded cause and the recorded number of affected data subjects put this incident above the Article 33(1) threshold.",
    },
    notification_duties: {
      regimes: [
        "United Kingdom — ICO notification within 72 hours of awareness.",
        "Ireland — DPC notification within 72 hours of awareness.",
      ],
    },
    art34_exemption_analysis: {
      decision: "no_exemption",
      reason:
        "The recorded encryption status and the recorded containment state do not carry the Article 34(3)(a) exemption.",
    },
    content_owner_mapping: {
      art33_3_a:
        "The recorded approximate numbers of data subjects and records, the processor position and the awareness confirmation are stated here.",
    },
  };
}

Deno.test("item416 linkage every prose-gold absence phrasing is detected", () => {
  for (const phrase of IR_ABSENCE_LABEL_PHRASINGS) {
    assert(
      irCarriesAbsence(phrase, []) !== null || IR_LABEL_ABSENCE_RE.test(phrase),
      `prose-gold phrasing escaped the CSC detector: ${phrase}`,
    );
  }
});

Deno.test("item416 designed absence phrasings are never absence", () => {
  assert(IR_DESIGNED_ABSENCE_EXEMPTIONS.length > 0);
  assertEquals(irCarriesAbsence(STANDING_TO_COMPLETE, []), null);
  assertEquals(irCarriesAbsence("Privilege protocol not recorded.", []), null);
});

Deno.test("item416 i1 repairs a section still asking for a recorded fact", () => {
  const report = perfectReport();
  const sp = report.standing_playbook as Record<string, unknown>;
  const sections = sp.sections as Record<string, unknown>[];
  const target = sections.find((s) => s.id === "activation_criteria")!;
  target.information_needed = "The organisation should state its activation triggers.";

  const t = runIrCsc(report, { intake: PERFECT });
  const i1 = t.violations.filter((v) => v.check_id === "i1_section_ask_vs_record");
  assert(i1.length >= 1, "expected an i1 violation on the re-opened ask");
  assert(i1.every((v) => v.repaired));
  const after = (report.standing_playbook as Record<string, unknown>).sections as Record<
    string,
    unknown
  >[];
  const fixed = after.find((s) => s.id === "activation_criteria")!;
  assertEquals(String(fixed.information_needed ?? "").trim(), "");
});

Deno.test("item416 i2 repairs a false absence on a backed section", () => {
  const report = perfectReport();
  const sections = (report.standing_playbook as Record<string, unknown>)
    .sections as Record<string, unknown>[];
  const target = sections.find((s) => s.id === "response_team")!;
  target.body = "The organisation has not yet recorded what it requires here.";

  const t = runIrCsc(report, { intake: PERFECT });
  const i2 = t.violations.find((v) => v.check_id === "i2_absence_claim_vs_record");
  assert(i2, "expected an i2 violation on the relabelled section");
  assertEquals(i2!.repaired, true);
  const after = (report.standing_playbook as Record<string, unknown>).sections as Record<
    string,
    unknown
  >[];
  const fixed = after.find((s) => s.id === "response_team")!;
  assertEquals(
    JSON.stringify(fixed).includes("has not yet recorded what it requires"),
    false,
  );
});

Deno.test("item416 silent record leaves the honest absence byte-identical", () => {
  const silent = { organizationName: "Northgate Labs" };
  const report: Record<string, unknown> = {
    standing_playbook: buildStandingPlaybook(silent, undefined as never),
  };
  const before = JSON.stringify(report.standing_playbook);
  const t = runIrCsc(report, { intake: silent });
  assertEquals(t.violations.filter((v) => v.repaired).length, 0);
  assertEquals(JSON.stringify(report.standing_playbook), before);
});

Deno.test("item416 authority leaves are never rewritten", () => {
  assert(IR_AUTHORITY_LEAF_KEYS.size > 0);
  const report = perfectReport();
  const authority = "The provision does not state a shorter period.";
  (report.standing_playbook as Record<string, unknown>).authority_note = authority;
  runIrCsc(report, { intake: PERFECT });
  assertEquals(
    (report.standing_playbook as Record<string, unknown>).authority_note,
    authority,
  );
});

Deno.test("item416 coverage zero orphans on the perfect fixture", () => {
  const t = runCoverageMatrix("ir-playbook", perfectReport(), PERFECT);
  assertEquals(t.crashed, false);
  assertEquals(
    t.orphans.map((o) => `${o.type}@${o.path}`),
    [],
  );
  assert(t.counts.links_checked > 0);
});

Deno.test("item416 coverage names permanent orphans instead of counting them", () => {
  assert(IR_PERMANENT_ORPHAN_KEYS.includes("discoveryDateTime"));
  const report = perfectReport();
  delete report.playbook_text;
  const t = runCoverageMatrix("ir-playbook", report, PERFECT);
  const permanent = t.permanent_orphans ?? [];
  assert(permanent.length > 0, "expected the narrative-only facts to be named");
  assert(permanent.every((o) => o.path === "playbook_text"));
  assertEquals(t.counts.orphans, t.orphans.length);
  assertEquals(
    t.orphans.some((o) => o.detail.includes("discoveryDateTime")),
    false,
  );
});

Deno.test("item416 coverage flags a supplied fact with no surface", () => {
  const report = perfectReport();
  delete report.art34_exemption_analysis;
  const t = runCoverageMatrix("ir-playbook", report, PERFECT);
  const hit = t.orphans.find((o) => o.path === "art34_exemption_analysis");
  assert(hit, "expected an orphan where the exemption analysis is missing");
  assertEquals(hit!.type, "supplied_fact_with_no_emission_path");
});

Deno.test("item416 gate counts an unrepaired i2 as a false absence", () => {
  assertEquals(FALSE_ABSENCE_CHECK_IDS["ir-playbook"], ["i2_absence_claim_vs_record"]);
  const report = perfectReport();
  const t = runIrCsc(report, { intake: PERFECT });
  attachIrCsc(report, t);
  const internal = ((report._meta as Record<string, unknown>).internal) as Record<
    string,
    unknown
  >;
  assertEquals((internal.ir_csc as Record<string, unknown>).crashed, false);
});
