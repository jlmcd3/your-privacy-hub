// DOC 141 (2026-09-02) — regression guards for three LIA fixes:
//
//   1. BALANCING POLARITY (three-part-test-typed.ts composeBalancingAnalysis)
//      — the expectation and harm clauses used to land in "Against it"
//      UNCONDITIONALLY, so a reasonably_expected verdict printed the
//      pro-controller fact as weighing AGAINST the interest, contradicting
//      the same function's own factorEntries direction routing. Clauses now
//      bucket by verdict: reasonably_expected -> FOR; undetermined and
//      non-material/unrecorded harm -> a neutral sentence; adverse/partial
//      expectation and materially-weighted harm -> against.
//
//   2. UK GDPR ART. 6(11)/DUAA OVERLAY (lia-skeleton-assemble.ts
//      ukArt611OverlayNote) — engagement-map.ts computed the three
//      R_UK_ART_6_11_* entries since C1-d but no LIA renderer ever read
//      them (the doc-137 "computed but never rendered" defect class).
//      Informational only: it shares the v2 "findings:5" render door with
//      the ePrivacy note and must never move the Art. 6(1)(f)
//      determination.
//
//   3. FIRST-SENTENCE CIRCULARITY (build-upgrade4.ts interest-legitimacy
//      sub-tests) — the undetermined branches put the condition-restating
//      sentence first, and the condition walk quotes only
//      firstSentenceSafe(reasoning), so customers got pure circularity.
//      The informative sentence now comes first on all three branches.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  balancingVerdict,
  composeBalancingAnalysis,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import {
  assembleLiaSkeletonDocument,
  readTypedVerdicts,
  ukArt611OverlayNote,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { buildLiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";

type Bag = Record<string, unknown>;

// ── 1. Balancing polarity ───────────────────────────────────────────────────

const U4_BASE = {
  benefit_and_beneficiary: { benefit: "faster fraud response for account holders" },
  opt_out_feasibility: { status: "analysed", feasibility: "opt_out_offered", counts_as_mitigation: true },
  relationship_with_individual: { status: "analysed", power_imbalance: false },
};
const INTAKE: Bag = { balancing_details: { safeguards: ["IP truncation", "role-based access"] } };
const NO_CHILD = { determination: "children_not_in_scope" };

function analysisFor(expectations: Bag, harms: Bag): { analysis: string; against: string } {
  const u4 = { ...U4_BASE, potential_harms: harms } as never;
  const v = balancingVerdict(expectations as never, NO_CHILD as never, u4, INTAKE);
  const { analysis } = composeBalancingAnalysis(v, expectations as never, NO_CHILD as never, u4, INTAKE);
  // Colon form only — the honest empty-bucket sentence ("Against it, the
  // typed findings above carry no factor of material weight.") lists nothing.
  const m = analysis.match(/Against it:([^.]*)\./);
  return { analysis, against: m ? m[1] : "" };
}

Deno.test("doc141 — balancing: reasonably_expected lands on the FOR side and never in the against sentence", () => {
  const { analysis, against } = analysisFor(
    { status: "analysed", verdict: "reasonably_expected" },
    { status: "analysed", material_weight_against_controller: true, worst_case_severity: "severe" },
  );
  const favour = analysis.slice(0, analysis.indexOf("Against it"));
  assertStringIncludes(favour, "the people affected would reasonably expect this processing");
  assert(
    !against.includes("reasonably expect"),
    `pro-controller expectation printed as against: ${against}`,
  );
});

Deno.test("doc141 — balancing: not_reasonably_expected still lands against; non-material harm no longer does", () => {
  const { analysis, against } = analysisFor(
    { status: "analysed", verdict: "not_reasonably_expected" },
    { status: "analysed", material_weight_against_controller: false, worst_case_severity: "minimal" },
  );
  assertStringIncludes(against, "would not reasonably expect this processing");
  assert(!against.includes("worst-case impact"), `non-material harm printed as against: ${against}`);
  assertStringIncludes(analysis, "Neither for nor against it: the worst-case impact recorded is minimal.");
});

Deno.test("doc141 — balancing: undetermined expectation and unrecorded harm sit in the neutral sentence, not against", () => {
  const { analysis, against } = analysisFor(
    { status: "record_insufficient", verdict: "undetermined_on_the_record" },
    { status: "record_insufficient", material_weight_against_controller: false },
  );
  assertStringIncludes(analysis, "Against it, the typed findings above carry no factor of material weight.");
  assertEquals(against, "", "no factor should print in an against list");
  assertStringIncludes(
    analysis,
    "Neither for nor against it: what the people affected would expect is not established; the worst-case impact is not stated.",
  );
});

Deno.test("doc141 — balancing: materially-weighted harm still prints against the interest", () => {
  const { against } = analysisFor(
    { status: "analysed", verdict: "partly_expected" },
    { status: "analysed", material_weight_against_controller: true, worst_case_severity: "moderate" },
  );
  assertStringIncludes(against, "would only partly expect this processing");
  const full = analysisFor(
    { status: "analysed", verdict: "partly_expected" },
    { status: "analysed", material_weight_against_controller: true, worst_case_severity: "moderate" },
  ).analysis;
  assertStringIncludes(full, "weighs materially against the interest");
});

// ── 2. The UK GDPR Art. 6(11)/DUAA overlay ──────────────────────────────────

const UK_NETSEC_RECORD: Bag = {
  organization_name: "Sentry Ledger Ltd",
  stated_purpose: "Fraud detection and network security monitoring for customer accounts",
  processing_description: "Automated abuse detection over login telemetry to spot account takeover.",
  jurisdictions: ["United Kingdom (UK GDPR)"],
  purpose_details: {
    interest_type: "Fraud prevention",
    specific_benefit: "fewer compromised accounts",
    beneficiary: "Customers",
  },
  necessity_details: {
    alternatives_rationale: "manual review cannot keep pace with login volume",
    why_consent_not_used: "the interest is pursued without relying on consent",
  },
  balancing_details: {
    scale_approx: "All account holders",
    frequency: "Continuous",
    duration: "Telemetry retained 90 days",
    safeguards: ["Access restricted to the security team"],
  },
  attestation_details: {},
};

// The real pipeline computes the map with the eprivacy-gate determination
// wired through; "not_engaged_on_the_record" keeps the PECR overlay silent
// so these tests isolate the Art. 6(11) note.
const mapFor = (record: Bag) => buildLiaEngagementMap(record, undefined, undefined, "not_engaged_on_the_record");

function paragraphs(report: Bag, record: Bag): string[] {
  const doc = assembleLiaSkeletonDocument(report, record, { deterministic: true }) as unknown as {
    document: { sections: Array<{ paragraphs: Array<{ text: string }> }> };
  };
  return doc.document.sections.flatMap((sec) => sec.paragraphs.map((p) => p.text));
}

const isUk611Paragraph = (p: string) => p.includes("On the UK leg of the analysis, UK GDPR Article 6(11)");

Deno.test("doc141 — Art. 6(11) overlay renders when a recognised-interest entry is engaged on a UK record", () => {
  const engagement_map = mapFor(UK_NETSEC_RECORD);
  const entry = engagement_map.entries.find((e) => e.rule_id === "R_UK_ART_6_11_NETWORK_SECURITY");
  assert(entry, "R_UK_ART_6_11_NETWORK_SECURITY entry missing");
  assertEquals(entry!.status, "engaged", "fixture must engage the network-security recognised interest");

  const text = paragraphs({ engagement_map }, UK_NETSEC_RECORD).join("\n");
  assertStringIncludes(text, "On the UK leg of the analysis, UK GDPR Article 6(11)");
  assertStringIncludes(text, "inserted by the Data (Use and Access) Act 2025");
  assertStringIncludes(text, "recognises network and information security as an example of a legitimate interest");
  assertStringIncludes(text, "a legitimate interests assessment is still required");
  assertStringIncludes(text, "does not affect, and is not affected by, the Article 6(1)(f) determination above");
});

Deno.test("doc141 — Art. 6(11) overlay does NOT render for a non-UK record, a UK record with no matching purpose, or no map at all", () => {
  const nonUk = { ...UK_NETSEC_RECORD, jurisdictions: ["EU (GDPR)"] };
  assertEquals(ukArt611OverlayNote({ engagement_map: mapFor(nonUk) }), "");

  const ukPlain = {
    ...UK_NETSEC_RECORD,
    stated_purpose: "Appointment reminder calls",
    processing_description: "Staff call patients by phone to confirm upcoming appointments.",
  };
  const plainMap = mapFor(ukPlain);
  for (const e of plainMap.entries) {
    if (e.rule_id.startsWith("R_UK_ART_6_11_")) assertEquals(e.status, "not_engaged", e.rule_id);
  }
  assertEquals(ukArt611OverlayNote({ engagement_map: plainMap }), "");
  assertEquals(ukArt611OverlayNote({}), "");

  const text = paragraphs({}, UK_NETSEC_RECORD).join("\n");
  assert(!text.includes("Article 6(11)"), "no Art. 6(11) text may render without a live engaged entry");
});

Deno.test("doc141 — Art. 6(11) overlay is informational only: verdicts and every non-overlay paragraph byte-identical either way", () => {
  const engagement_map = mapFor(UK_NETSEC_RECORD);
  assertEquals(
    readTypedVerdicts({ engagement_map } as Bag),
    readTypedVerdicts({} as Bag),
    "readTypedVerdicts must not vary with the engagement map present",
  );
  const withNote = paragraphs({ engagement_map }, UK_NETSEC_RECORD).filter((p) => !isUk611Paragraph(p));
  const withoutNote = paragraphs({}, UK_NETSEC_RECORD);
  assertEquals(withNote, withoutNote, "removing the overlay paragraph must leave every other paragraph byte-identical");
});

Deno.test("doc141 — both overlays share the findings render door: ePrivacy note first, Art. 6(11) note after it, one paragraph", () => {
  const engagement_map = {
    entries: [
      ...mapFor(UK_NETSEC_RECORD).entries.filter((e) => e.rule_id !== "R_EPRIVACY_PECR"),
      {
        rule_id: "R_EPRIVACY_PECR",
        name: "ePrivacy / PECR device-storage overlay",
        status: "engaged",
        rationale: "Any storage of or access to information on a user's device requires a separate consent or exemption under the ePrivacy Directive / PECR 2003 in addition to the LI basis.",
        intake_signals: [],
        section_ref: "section_5_recommendations",
      },
    ],
  };
  const para = paragraphs({ engagement_map }, UK_NETSEC_RECORD).find((p) => p.startsWith("Separately,"));
  assert(para, "shared overlay paragraph missing");
  const pecrAt = para!.indexOf("PECR");
  const ukAt = para!.indexOf("On the UK leg of the analysis");
  assert(pecrAt >= 0 && ukAt > pecrAt, "the Art. 6(11) note must follow the ePrivacy note in the shared block");
});

// ── 3. First-sentence circularity in the interest-legitimacy sub-tests ──────

Deno.test("doc141 — undetermined sub-test reasonings lead with the informative sentence, not the condition restatement", () => {
  // A record with no purpose_details at all drives all three sub-tests into
  // their missing-fact branches (lawful + clearly_articulated undetermined,
  // real_and_present undetermined).
  const report: Bag = {};
  attachLiaUpgrade4(report, { balancing_details: {}, necessity_details: {}, attestation_details: {} });
  const il = report.interest_legitimacy as Bag;
  const subTests = il.sub_tests as Array<{ id: string; verdict: string; reasoning: string }>;
  assertEquals(subTests.length, 3);
  for (const t of subTests) {
    assertEquals(t.verdict, "undetermined_on_the_record", t.id);
    assert(
      !/^The (first|second|third) condition asks/.test(t.reasoning),
      `${t.id}: reasoning still leads with the circular restatement — "${t.reasoning}"`,
    );
  }
  const byId = Object.fromEntries(subTests.map((t) => [t.id, t.reasoning]));
  assert(byId.lawful.startsWith("The record names neither the interest nor its type"), byId.lawful);
  assert(byId.clearly_articulated.startsWith("The record contains no articulation of the interest to test"), byId.clearly_articulated);
  assert(byId.real_and_present.startsWith("The record describes neither the processing nor the purpose"), byId.real_and_present);
  // The condition walk quotes each sub-test's FIRST sentence — it must now be
  // the informative one, so the walk itself carries no circular parenthetical.
  const application = String(il.application);
  assert(
    !application.includes("condition asks whether"),
    `the condition walk still quotes a circular restatement: ${application}`,
  );
  assertStringIncludes(application, "The record contains no articulation of the interest to test");
});
