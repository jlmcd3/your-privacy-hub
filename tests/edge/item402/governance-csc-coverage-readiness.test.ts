// ITEM 402 LEG C — GOVERNANCE CSC + COVERAGE + TYPED READINESS.
//
// Identities:
//   item402 linkage every governance absence phrasing is detected
//   item402 linkage resolved labels are never absence
//   item402 csc g2 repairs a backed surface from the record register
//   item402 csc leaves determination outcomes byte-identical
//   item402 csc honest absence on a silent record is byte-preserved
//   item402 csc g1 flags a domain finding the record answers
//   item402 csc g3 removes absence prose from an authority field
//   item402 csc fail-open on a hostile report
//   item402 false-absence id is wired to the gate
//   item402 coverage zero orphans on the live-parity perfect record
//   item402 coverage reports an honest orphan on an unanchored action
//   item402 coverage never infers anchorage from word overlap
//   item402 readiness rule earns each band
//   item402 readiness a satisfied headline cannot outrank an adverse sibling
//   item402 readiness one consumer path: line restates the typed record
//   item402 readiness legacy persisted document renders byte-identically
//   item402 watchlist carries the mined classes and W-COPYEDIT verbatim

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachGovernanceCsc,
  governanceCarriesAbsence,
  GOVERNANCE_CSC_SURFACES,
  GOVERNANCE_LABEL_ABSENCE_RE,
  runGovernanceCsc,
} from "../../../supabase/functions/_shared/ltp/governance-csc.ts";
import { GOVERNANCE_ABSENCE_LABEL_PHRASINGS } from "../../../supabase/functions/_shared/ltp/governance-prose-gold.ts";
import { FALSE_ABSENCE_CHECK_IDS } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { runCoverageMatrix } from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import {
  deriveReadinessDetermination,
  readinessLine,
  readinessLineForRender,
} from "../../../supabase/functions/_shared/ltp/governance-readiness.ts";
import { GOVERNANCE_PERFECT } from "../../../supabase/functions/_shared/golden/governance-perfect.ts";
import {
  GOVERNANCE_CRITIC_WATCHLIST,
  GOVERNANCE_WATCH_CLASSES,
} from "../../../archive/unwired/_shared/ltp/governance-refinement-config.ts";
import { LIA_CRITIC_WATCHLIST } from "../../../supabase/functions/_shared/ltp/lia-refinement-config.ts";

const PERFECT = GOVERNANCE_PERFECT[0].intake as Record<string, unknown>;

// ---------------------------------------------------------------------------
// the item396 linkage
// ---------------------------------------------------------------------------

Deno.test("item402 linkage every governance absence phrasing is detected", () => {
  assert(GOVERNANCE_ABSENCE_LABEL_PHRASINGS.length > 0);
  for (const phrase of GOVERNANCE_ABSENCE_LABEL_PHRASINGS) {
    assert(
      governanceCarriesAbsence(phrase, []),
      `prose-gold phrasing escaped the CSC detector: ${phrase}`,
    );
    assert(GOVERNANCE_LABEL_ABSENCE_RE.test(phrase), phrase);
  }
});

Deno.test("item402 linkage resolved labels are never absence", () => {
  for (
    const label of [
      "Accountability evidenced",
      "Accountability partly evidenced",
      "The record states the designation position as \"Yes, formal DPO\".",
    ]
  ) {
    assertEquals(governanceCarriesAbsence(label, []), null, label);
  }
});

// ---------------------------------------------------------------------------
// CSC
// ---------------------------------------------------------------------------

function absenceReport(): Record<string, unknown> {
  return {
    dpo_determination: {
      verdict: "record_insufficient",
      citation: "GDPR Art. 37(1)",
      reasoning: "The record does not state whether a data protection officer is designated.",
    },
    transfer_analysis: {
      verdict: "record_insufficient",
      reasoning: "We could not verify this item from the information provided; it is listed under information needed.",
    },
  };
}

Deno.test("item402 csc g2 repairs a backed surface from the record register", () => {
  const report = absenceReport();
  const t = runGovernanceCsc(report, { intake: PERFECT });
  const g2 = t.violations.filter((v) => v.check_id === "g2_absence_claim_vs_record");
  assertEquals(g2.length, 2);
  assert(g2.every((v) => v.repaired), JSON.stringify(g2));
  const dpo = report.dpo_determination as Record<string, any>;
  assert(String(dpo.record_states).includes("Yes, formal DPO"), String(dpo.record_states));
  assertEquals(dpo.record_backed, true);
  const tr = report.transfer_analysis as Record<string, any>;
  assert(String(tr.record_states).includes("Standard Contractual Clauses"), String(tr.record_states));
});

Deno.test("item402 csc leaves determination outcomes byte-identical", () => {
  const report = absenceReport();
  runGovernanceCsc(report, { intake: PERFECT });
  assertEquals((report.dpo_determination as any).verdict, "record_insufficient");
  assertEquals((report.dpo_determination as any).citation, "GDPR Art. 37(1)");
  assertEquals((report.transfer_analysis as any).verdict, "record_insufficient");
});

Deno.test("item402 csc honest absence on a silent record is byte-preserved", () => {
  const report = absenceReport();
  const before = JSON.stringify(report);
  const t = runGovernanceCsc(report, { intake: { organization_name: "Aldergate" } });
  assertEquals(t.violations.filter((v) => v.check_id === "g2_absence_claim_vs_record").length, 0);
  assertEquals(JSON.stringify(report), before);
});

Deno.test("item402 csc g1 flags a domain finding the record answers", () => {
  const report: Record<string, unknown> = {
    domain_findings: {
      training: {
        severity: "High",
        gap_description: "The record does not state whether staff receive privacy training.",
      },
    },
  };
  const t = runGovernanceCsc(report, { intake: PERFECT });
  const g1 = t.violations.filter((v) => v.check_id === "g1_domain_finding_vs_record");
  assertEquals(g1.length, 1);
  assertEquals(g1[0].path, "domain_findings.training.gap_description");
  assertEquals(g1[0].repaired, false);
  // and the other direction: a record that is silent on training earns nothing.
  const quiet: Record<string, unknown> = JSON.parse(JSON.stringify(report));
  const t2 = runGovernanceCsc(quiet, { intake: { sector: "Healthcare/Life Sciences" } });
  assertEquals(t2.violations.filter((v) => v.check_id === "g1_domain_finding_vs_record").length, 0);
});

Deno.test("item402 csc g3 removes absence prose from an authority field", () => {
  const report: Record<string, unknown> = {
    domain_element_findings: [
      {
        element: "Training",
        standard: "The record does not state the applicable standard.",
        finding: "Training is documented.",
      },
    ],
  };
  const t = runGovernanceCsc(report, { intake: PERFECT });
  const g3 = t.violations.find((v) => v.check_id === "g3_authority_field_hygiene");
  assert(g3, "expected an authority-field violation");
  assertEquals(g3!.repaired, true);
  assertEquals("standard" in (report.domain_element_findings as any[])[0], false);
});

Deno.test("item402 csc fail-open on a hostile report", () => {
  const cyclic: Record<string, unknown> = { domain_findings: {} };
  (cyclic as any).self = cyclic;
  const t = runGovernanceCsc(cyclic, { intake: PERFECT });
  assertEquals(typeof t.crashed, "boolean");
  const target: Record<string, unknown> = {};
  attachGovernanceCsc(target, t);
  assertEquals((target as any)._meta.internal.governance_csc.version, t.version);
});

Deno.test("item402 false-absence id is wired to the gate", () => {
  assertEquals(FALSE_ABSENCE_CHECK_IDS.governance, ["g2_absence_claim_vs_record"]);
  assert(GOVERNANCE_CSC_SURFACES.length >= 5);
});

// ---------------------------------------------------------------------------
// coverage
// ---------------------------------------------------------------------------

/** A live-parity report: the surfaces the pipeline fills, with real substance. */
function perfectParityReport(): Record<string, unknown> {
  const long = (s: string) => `${s} The record supplies the underlying facts and the finding reflects them in full.`;
  return {
    executive_summary: long(
      "Aldergate Occupational Health Services Ltd operates in the EU and the United Kingdom and processes health data.",
    ),
    organisation_profile: { sector: "Healthcare/Life Sciences", jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"] },
    dpo_determination: { verdict: "satisfied", reasoning: long("A formal DPO is designated and named in the record.") },
    domain_findings: {
      training: { current_state: long("Formal onboarding and an annual refresh are documented, and AI tools are covered.") },
      vendor_terms: { current_state: long("Every named vendor has an Article 28 basis with a recorded date.") },
    },
    transfer_analysis: { verdict: "satisfied", reasoning: long("US-based tools are covered by EU Standard Contractual Clauses.") },
    art30_element_findings: [{ element: "Retention", finding: long("Retention periods are recorded with their statutory basis.") }],
    dpia_scope: { finding: long("Multiple DPIAs are completed and all AI and high-risk tools are assessed.") },
    remediation_plan: [
      {
        action: "Complete the annual measures review.",
        owner: "the named Data Protection Officer",
        anchor_keys: ["remediation_default_owner", "remediation_default_target_date"],
      },
    ],
    information_needed: [],
  };
}

Deno.test("item402 coverage zero orphans on the live-parity perfect record", () => {
  const t = runCoverageMatrix("governance", perfectParityReport(), PERFECT);
  assertEquals(t.crashed, false);
  assertEquals(t.orphans, []);
  assert(t.counts.links_checked >= 8, `links_checked=${t.counts.links_checked}`);
});

Deno.test("item402 coverage reports an honest orphan on an unanchored action", () => {
  const report = perfectParityReport();
  (report.remediation_plan as any[]).push({
    action: "Adopt a biometric-retention schedule.",
    anchor_keys: ["biometric_retention"],
  });
  const t = runCoverageMatrix("governance", report, PERFECT);
  assertEquals(t.orphans.length, 1);
  assertEquals(t.orphans[0].type, "action_without_record_anchor");
});

Deno.test("item402 coverage never infers anchorage from word overlap", () => {
  const report = perfectParityReport();
  (report.remediation_plan as any[]).push({ action: "Adopt a biometric-retention schedule." });
  const t = runCoverageMatrix("governance", report, PERFECT);
  assertEquals(t.orphans, []); // undeclared anchorage is silence, never an orphan
});

// ---------------------------------------------------------------------------
// the typed readiness determination
// ---------------------------------------------------------------------------

const band = (verdict: string, extra: Record<string, unknown> = {}) =>
  deriveReadinessDetermination({ accountability_determination: { verdict }, ...extra });

Deno.test("item402 readiness rule earns each band", () => {
  assertEquals(band("satisfied")?.rating, "Evidenced");
  assertEquals(band("partially_satisfied")?.rating, "Partly evidenced");
  assertEquals(band("not_satisfied")?.rating, "Not evidenced");
  assertEquals(band("record_insufficient")?.rating, "Not determinable");
  assertEquals(band("not_applicable")?.rating, "Not engaged");
  // A record that earns no band gets none — no rating is ever invented.
  assertEquals(deriveReadinessDetermination({}), null);
  assertEquals(band("something_else"), null);
});

Deno.test("item402 readiness a satisfied headline cannot outrank an adverse sibling", () => {
  const rd = band("satisfied", { dpo_determination: { verdict: "record_insufficient" } });
  assertEquals(rd?.rating, "Partly evidenced");
  assertEquals(rd?.rating_basis, "GDPR Articles 5(2) and 24(1)");
  assertEquals(rd?.determined_from[0], "accountability_determination:satisfied");
  assert(rd?.determined_from.includes("dpo_determination:record_insufficient"));
  // the other direction: no adverse sibling keeps the strong band.
  assertEquals(band("satisfied", { dpo_determination: { verdict: "satisfied" } })?.rating, "Evidenced");
});

Deno.test("item402 readiness one consumer path: line restates the typed record", () => {
  const rd = band("partially_satisfied")!;
  assertEquals(readinessLine(rd), "Accountability partly evidenced");
  // renderers read the typed record; they never derive a rating themselves.
  assertEquals(
    readinessLineForRender({ readiness_determination: rd }),
    "Accountability partly evidenced",
  );
  assertEquals(readinessLineForRender({ governance_readiness_line: "Accountability evidenced" }), "Accountability evidenced");
});

Deno.test("item402 readiness legacy persisted document renders byte-identically", async () => {
  const raw = await Deno.readTextFile(
    new URL("../fixtures/item402/governance-persisted-cba3724c.json", import.meta.url),
  );
  const doc = JSON.parse(raw) as Record<string, unknown>;
  const report = (doc.report_data ?? doc) as Record<string, unknown>;
  const before = JSON.stringify(report);
  // THE CORRUPTION GUARD: the persisted document carries neither field, the
  // renderer prints nothing extra, and reading it mutates not one byte.
  assertEquals("readiness_determination" in report, false);
  assertEquals("governance_readiness_line" in report, false);
  assertEquals(readinessLineForRender(report), "");
  assertEquals(JSON.stringify(report), before);
});

// ---------------------------------------------------------------------------
// the mined watchlist
// ---------------------------------------------------------------------------

Deno.test("item402 watchlist carries the mined classes and W-COPYEDIT verbatim", () => {
  assertEquals(GOVERNANCE_WATCH_CLASSES.map((c) => c.id), ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]);
  for (const c of GOVERNANCE_WATCH_CLASSES) assert(c.archive_fails > 0, c.id);
  const copyedit = (s: string) => s.slice(s.indexOf("W-COPYEDIT"));
  assertEquals(copyedit(GOVERNANCE_CRITIC_WATCHLIST), copyedit(LIA_CRITIC_WATCHLIST));
});
