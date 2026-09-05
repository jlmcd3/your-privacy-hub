// DOC 188 (2026-09-05) — all-products batch e38460 (pinned data), LIA items.
//
//   P3  Authorities Cited listed only Article 6(1)(f) while the body cited
//       Article 9(1), Article 9(2)(b), Article 5(1)(c) and Article 6(1)(a).
//       The assembler's own composed pinpoints now enter the ledger
//       (LIA_COMPOSED_PINPOINTS, each corpus-anchored), the iff-cited test
//       accepts the bare pinpoint the composed sentences use, and a UK-only
//       record relabels every GDPR article to the UK instrument.
//   P9  The alternatives table carried a row labelled "Alternatives
//       considered" (the customer's heading word) and one row naming three
//       alternatives with the third reason. The heading is stripped, inline
//       "(1) …; (2) …" items split, and a summary label yields one row per
//       named alternative (folded onto its detailed sibling by the existing
//       paraphrase dedup).
//
// Fixture: the pinned LIA sample (src/lib/sampleFixtures.ts F_LIA_UK) as it
// stood in the batch — the same text both graded documents were built from.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import {
  attachLiaUpgrade4,
  buildAlternativesConsidered,
  normaliseAlternativesText,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import {
  assembleLiaSkeletonDocument,
  bareLiaPinpoint,
  LIA_COMPOSED_PINPOINTS,
  renderLiaToa,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const ALTERNATIVES_CONSIDERED =
  "Alternatives considered: (1) scheduled supervisor check-ins — too infrequent to detect acute medical events; (2) zone-only sensors without physiological data — would not detect cardiac or heat events; (3) voluntary opt-in only — selection bias would leave the most at-risk workers unmonitored. Telemetry on all underground workers is necessary to achieve the safety objective.";

function batchIntake(over: Bag = {}): Bag {
  return {
    organization_name: "North Pole Manual Mining Ltd",
    subject_anchor: "Wearable safety telemetry for underground shift workers",
    processing_description: "Wearable telemetry (heart rate, beacon-proximity zone) for underground shift workers.",
    data_categories: ["Location data", "Health data", "Employee records"],
    relationship_type: "Employees",
    jurisdictions: ["United Kingdom (UK GDPR)"],
    stated_purpose: "To reduce the risk of fatality and serious injury underground.",
    alternatives_considered: ALTERNATIVES_CONSIDERED,
    purpose_details: {
      interest_holder: "Controller and the shift workforce",
      interest_type: "Health and safety / vital interests of workers",
      interest_statement: "Real-time detection of medical events and unauthorised zone entry to prevent fatalities.",
      specific_benefit: "Underground medical events are detected within seconds rather than at the next check-in.",
      beneficiary: "Our business and the individuals",
    },
    necessity_details: {
      alternatives: "Scheduled check-ins; zone sensors only; voluntary opt-in — each rejected as insufficient to meet the safety objective.",
      alternatives_rationale:
        "Scheduled supervisor check-ins — would not detect a cardiac or heat event occurring between rounds.\nZone sensors without physiological data — would not detect any medical event at all, only unauthorised entry.\nVoluntary opt-in telemetry — would leave the highest-risk workers unmonitored through selection bias.",
      why_consent_not_used:
        "Workers are in a clear power imbalance with the employer; consent could not be freely given for safety monitoring.",
      data_minimised: "Only beacon-proximity zone and heart-rate are processed; raw telemetry is deleted at 90 days.",
    },
    balancing_details: {
      reasonable_expectation: "Partly",
      vulnerable_subjects: ["Employees in a power-imbalance relationship"],
      potential_harm: "Severe",
      safeguards: ["Pseudonymised dashboards", "90-day raw-data retention"],
      special_category_data: true,
      relationship_category: "Employee",
      statutory_restrictions: "Mines Regulations 2014; UK GDPR Art. 9(2)(b) employment-law condition for health data.",
    },
    attestation: { dpo_reviewed: "Yes", dpo_reviewer: "Rudy Rangifer", approver_name: "Marta Kowalczyk" },
    ...over,
  };
}

function render(intake: Bag) {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  const sk = assembleLiaSkeletonDocument(report, intake, { deterministic: true });
  const toa = sk.document.sections.find((s) => s.id === "table_of_authorities");
  assert(toa, "no Table of Authorities");
  return { report, text: skeletonDocumentToText(sk.document), toa: toa!.paragraphs.map((p) => p.text).join("\n") };
}

// ── P3 — the Table of Authorities lists what the body cites ─────────────────

Deno.test("doc188 P3 — the composed pinpoints are corpus-anchored and carry the instrument", () => {
  const pins = LIA_COMPOSED_PINPOINTS.map((p) => p.pinpoint);
  assertEquals(pins, ["Article 9(1) GDPR", "Article 9(2) GDPR", "Article 5(1)(c) GDPR", "Article 6(1)(a) GDPR"]);
  for (const p of LIA_COMPOSED_PINPOINTS) {
    assert(p.corpus_key && p.corpus_table && p.verbatim.length > 20, p.pinpoint);
  }
  assertEquals(bareLiaPinpoint("Article 9(1) GDPR"), "Article 9(1)");
  assertEquals(bareLiaPinpoint("Article 6(1)(f) UK GDPR"), "Article 6(1)(f)");
  assertEquals(bareLiaPinpoint("EDPB Guidelines 1/2024"), "EDPB Guidelines 1/2024");
});

Deno.test("doc188 P3 — the batch record's Table of Authorities lists Articles 5(1)(c), 6(1)(a), 6(1)(f), 9(1) and 9(2) under the UK instrument", () => {
  const { text, toa } = render(batchIntake());
  // The body cites the bare pinpoints the composed sentences use.
  assertStringIncludes(text, "Article 9(1) data cannot rest on legitimate interests alone");
  assertStringIncludes(text, "The record names Article 9(2)(b)");
  assertStringIncludes(text, "Article 5(1)(c) requires personal data to be");
  assertStringIncludes(text, "Obtaining consent under Article 6(1)(a)");
  // The ToA names each of them, on the UK instrument for a UK-only record.
  for (const line of [
    "Article 5(1)(c) UK GDPR",
    "Article 6(1)(a) UK GDPR",
    "Article 6(1)(f) UK GDPR",
    "Article 9(1) UK GDPR",
    "Article 9(2) UK GDPR",
  ]) {
    assertStringIncludes(toa, line);
  }
  assert(!toa.includes("Article 9(1) GDPR\n"), "a UK-only record must not list the EU instrument beside the UK one");
});

Deno.test("doc188 P3 — an EU record lists the same pinpoints on the EU instrument", () => {
  const { toa } = render(batchIntake({ jurisdictions: ["EU (GDPR)"] }));
  assertStringIncludes(toa, "Article 9(1) GDPR");
  assertStringIncludes(toa, "Article 5(1)(c) GDPR");
  assert(!toa.includes("UK GDPR"), "an EU-only record carries no UK instrument");
});

Deno.test("doc188 P3 — iff-cited holds: a record that never reaches Article 9 lists no Article 9 authority", () => {
  const { text, toa } = render(batchIntake({
    data_categories: ["Contact details", "Employee records"],
    balancing_details: {
      reasonable_expectation: "Yes",
      potential_harm: "Minimal",
      safeguards: ["Access controls"],
      special_category_data: false,
      relationship_category: "Employee",
      statutory_restrictions: "",
    },
  }));
  assert(!text.includes("Article 9(1)"), "the boundary must not fire on a clean record");
  assert(!toa.includes("Article 9(1)"), "no Article 9(1) in the ToA when the body never cites it");
  assert(!toa.includes("Article 9(2)"), "no Article 9(2) in the ToA when the body never cites it");
});

Deno.test("doc188 P3 — every ToA line is cited in the body in full or bare form", () => {
  const { text, toa } = render(batchIntake());
  for (const line of toa.split("\n").map((l) => l.trim()).filter((l) => l && !/^(Regulations|Statutes|Guidance)/.test(l))) {
    const bare = bareLiaPinpoint(line);
    assert(text.includes(line) || text.includes(bare), `ToA lists ${line}, which is not cited in the body`);
  }
});

Deno.test("doc188 P3 — renderLiaToa accepts the bare pinpoint but still drops an uncited entry", () => {
  const body = "Whether that category engages Article 9(1) is not answered. Article 6(1)(f) GDPR governs.";
  const toa = renderLiaToa(["Article 6(1)(f) GDPR", "Article 9(1) GDPR", "Article 5(1)(c) GDPR"], body);
  assertStringIncludes(toa, "Article 6(1)(f) GDPR");
  assertStringIncludes(toa, "Article 9(1) GDPR");
  assert(!toa.includes("Article 5(1)(c)"), "an authority the body never cites stays out");
});

// ── P9 — the alternatives table ─────────────────────────────────────────────

Deno.test("doc188 P9 — the heading word is stripped and inline numbered items are isolated", () => {
  const lines = normaliseAlternativesText(ALTERNATIVES_CONSIDERED).split("\n");
  assert(!lines[0].toLowerCase().startsWith("alternatives considered"), lines[0]);
  assertEquals(lines.length, 3);
  assert(lines[0].startsWith("1. scheduled supervisor check-ins"), lines[0]);
  assert(lines[1].startsWith("2. zone-only sensors"), lines[1]);
  assert(lines[2].startsWith("3. voluntary opt-in only"), lines[2]);
  // A sentence that merely ends in a number is not a list marker.
  assertEquals(normaliseAlternativesText("Retained for over 5. Then deleted."), "Retained for over 5. Then deleted.");
  // A start-of-line marker keeps its line.
  assertEquals(normaliseAlternativesText("(1) manual review — slow\n(2) sampling — partial"), "1. manual review — slow\n2. sampling — partial");
});

Deno.test("doc188 P9 — no row is labelled with the heading, and each of the three alternatives carries its own reason", () => {
  const f = buildAlternativesConsidered(batchIntake()) as unknown as {
    alternatives: { alternative: string; why_inadequate: string; rationale_recorded: boolean }[];
  };
  const labels = f.alternatives.map((a) => a.alternative.toLowerCase());
  assert(!labels.some((l) => /^alternatives? considered/.test(l)), `heading became a row: ${labels.join(" | ")}`);
  assert(!labels.some((l) => l.includes(";")), `a summary label survived as one row: ${labels.join(" | ")}`);
  // Three real alternatives plus the consent row.
  assertEquals(f.alternatives.length, 4, labels.join(" | "));
  const byLabel = (re: RegExp) => f.alternatives.find((a) => re.test(a.alternative));
  const checkIns = byLabel(/check-ins/i)!;
  const zone = byLabel(/zone/i)!;
  const optIn = byLabel(/opt-in/i)!;
  assert(checkIns && zone && optIn, labels.join(" | "));
  assertStringIncludes(checkIns.why_inadequate.toLowerCase(), "cardiac or heat event");
  assertStringIncludes(zone.why_inadequate.toLowerCase(), "medical event");
  assertStringIncludes(optIn.why_inadequate.toLowerCase(), "selection bias");
  assert(f.alternatives.every((a) => a.rationale_recorded), "every alternative carries a recorded reason");
  assert(byLabel(/consent under Article 6\(1\)\(a\)/), "the consent alternative row is kept");
});

Deno.test("doc188 P9 — the rendered alternatives table carries no 'Alternatives considered' row", () => {
  const { text } = render(batchIntake());
  assert(!/Alternatives considered \| \(1\)/.test(text), "the heading word must not label a table row");
  assertStringIncludes(text, "selection bias");
});
