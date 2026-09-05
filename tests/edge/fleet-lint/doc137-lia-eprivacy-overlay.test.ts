// DOC 137 (2026-09-01) — regression guard for the LIA ePrivacy/PECR
// engagement-map wiring: engagement-map.ts's R_EPRIVACY_PECR entry
// (buildLiaEngagementMap) was computed and attached to report.engagement_map
// since it shipped, but no LIA renderer ever read it — the exact same
// "computed but never rendered" pattern doc 136 fixed for DPIA's Art.
// 35(3)(c) entry. Fixed here by eprivacyOverlayNote (in
// lia-skeleton-assemble.ts), rendered as the "findings:5" block, V2-only.
//
// DOC 139 (2026-09-02) — an external legal review flagged the doc 137
// overlay as a NEW P1: engagement-map.ts's R_EPRIVACY_PECR rule used to run
// its own coarse keyword regex, resolving "engaged" or "conditional" but
// NEVER "not_engaged" on the facts — so the firm "requires a separate
// consent or exemption..." sentence was reaching every device/wearable-
// adjacent record regardless of whether THIS record's facts actually
// establish PECR relevance.
//
// FIX: `buildLiaEngagementMap` now takes the already-computed determination
// from the already-ratified, narrower `eprivacy-gate.ts` hard gate as an
// optional 4th parameter and uses IT — not a regex — to decide
// R_EPRIVACY_PECR's status ("engaged" only on "consent_requirement_engaged",
// "not_engaged" only on "not_engaged_on_the_record", "conditional"
// otherwise, including when the parameter is omitted). `eprivacyOverlayNote`
// (lia-skeleton-assemble.ts) is UNCHANGED in what it reads — still only
// `report.engagement_map`'s R_EPRIVACY_PECR entry, never
// `report.eprivacy_short_circuit` directly — because
// tests/edge/run-li-assessment/eprivacy-gate.test.ts ratifies that the
// skeleton assembler must never consume that finding directly (the typed
// engine's outcome override is the only door for eprivacy-gate.ts's own
// prose to reach the Art. 6(1)(f) determination). The only change in
// eprivacyOverlayNote is content: "conditional" now specifically means the
// harder gate is ambiguous, so it renders the qualified "Additional
// Information Required" statement instead of the entry's generic rationale.
//
// This overlay is informational/adjacent-obligation only: it must never
// alter the three-part-test's own Article 6(1)(f) determination, and it
// must not duplicate or interact with the already-ratified, narrower
// eprivacy-gate.ts hard gate (LIA_EPRIVACY_GATE_RATIFIED), which can alter
// that determination from its own regex triggers.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleLiaSkeletonDocument,
  eprivacyOverlayNote,
  readTypedVerdicts,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { buildLiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";
import { buildEprivacyShortCircuit } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/eprivacy-gate.ts";

type Bag = Record<string, unknown>;

const COOKIE_RECORD: Bag = {
  organization_name: "Harbor Analytics Ltd",
  stated_purpose: "Site analytics via first-party cookies",
  processing_description: "The company sets first-party cookies and a device fingerprint to measure engagement.",
  jurisdictions: ["United Kingdom"],
  purpose_details: {
    interest_type: "Analytics",
    specific_benefit: "improved site performance measurement",
    beneficiary: "Harbor Analytics Ltd",
  },
  necessity_details: {
    alternatives_rationale: "aggregate server logs cannot attribute sessions",
    why_consent_not_used: "not applicable — engagement measurement only",
  },
  balancing_details: {
    scale_approx: "All site visitors",
    frequency: "Continuous",
    duration: "Cookie lifetime 12 months",
    safeguards: ["IP truncation"],
  },
  attestation_details: {},
};

const PLAIN_RECORD: Bag = {
  organization_name: "Northfield Clinics Ltd",
  stated_purpose: "Appointment reminder calls",
  processing_description: "Staff call patients by phone to confirm upcoming appointments.",
  jurisdictions: ["United Kingdom"],
  purpose_details: {
    interest_type: "Patient care coordination",
    specific_benefit: "reduced missed appointments",
    beneficiary: "Patients",
  },
  necessity_details: {
    alternatives_rationale: "SMS-only reminders have a lower response rate for this population",
    why_consent_not_used: "the interest is pursued without relying on consent",
  },
  balancing_details: {
    scale_approx: "Patients with upcoming appointments",
    frequency: "Once per appointment",
    duration: "Retained for the appointment cycle only",
    safeguards: ["Call log access restricted to reception staff"],
  },
  attestation_details: {},
};

// DOC 139 — a record where the coarse engagement-map keyword regex (or the
// new default-conditional path) would flag relevance, but eprivacy-gate.ts's
// own narrower triggers do not fire an unmistakable "consent_requirement_
// engaged" — it lands on "undetermined_on_the_record" instead (classified
// as behavioral_advertising, an ePrivacy-adjacent use-case class, without
// any TERMINAL_EQUIPMENT_TRIGGERS/UNSOLICITED_MESSAGE_TRIGGERS hit).
const AMBIGUOUS_DEVICE_RECORD: Bag = {
  organization_name: "Pulse Wearables Ltd",
  stated_purpose: "Ad personalization for the companion app",
  processing_description:
    "The mobile app SDK collects a device identifier used for behavioural advertising personalization.",
  jurisdictions: ["United Kingdom"],
  purpose_details: {
    interest_type: "Advertising",
    specific_benefit: "more relevant in-app ads",
    beneficiary: "Pulse Wearables Ltd",
  },
  necessity_details: {
    alternatives_rationale: "contextual-only advertising performs materially worse for this audience",
    why_consent_not_used: "the interest is pursued without relying on consent",
  },
  balancing_details: {
    scale_approx: "All app users",
    frequency: "Continuous",
    duration: "Retained for 24 months",
    safeguards: ["Opt-out available in app settings"],
  },
  attestation_details: {},
};

function paragraphs(report: Bag, record: Bag): string[] {
  const doc = assembleLiaSkeletonDocument(report, record, { deterministic: true }) as unknown as {
    document: { sections: Array<{ paragraphs: Array<{ text: string }> }> };
  };
  return doc.document.sections.flatMap((sec) => sec.paragraphs.map((p) => p.text));
}

function documentText(report: Bag, record: Bag): string {
  return paragraphs(report, record).join("\n");
}

// DOC 139 — the real pipeline (run-li-assessment/index.ts) computes
// `report.eprivacy_short_circuit` via attachLiaDeliverables BEFORE calling
// buildLiaEngagementMap, then passes `eprivacy_short_circuit.determination`
// through as buildLiaEngagementMap's 4th argument. Tests exercising the
// realistic gated behavior wire the two together the same way.
function engagementMapFor(record: Bag): ReturnType<typeof buildLiaEngagementMap> {
  const gate = buildEprivacyShortCircuit(record);
  return buildLiaEngagementMap(record, undefined, undefined, gate.determination);
}

const isOverlayParagraph = (p: string) =>
  p.startsWith("Separately,") || p.startsWith("PECR/ePrivacy applicability");

Deno.test("doc139 — LIA: firm requirement text renders only when eprivacy-gate.ts's own triggers also fire", () => {
  const gate = buildEprivacyShortCircuit(COOKIE_RECORD);
  assertEquals(gate.determination, "consent_requirement_engaged", "fixture must trip eprivacy-gate.ts's own hard trigger");

  const engagement_map = engagementMapFor(COOKIE_RECORD);
  const entry = engagement_map.entries.find((e) => e.rule_id === "R_EPRIVACY_PECR");
  assert(entry, "R_EPRIVACY_PECR entry missing from buildLiaEngagementMap output");
  assertEquals(entry!.status, "engaged");

  const text = documentText({ engagement_map }, COOKIE_RECORD);
  assertStringIncludes(text, "Separately,");
  assertStringIncludes(
    text,
    "requires a separate consent or exemption under the ePrivacy Directive / PECR 2003",
  );
  assertStringIncludes(text, "does not affect, and is not affected by, the Article 6(1)(f) determination above");
});

// Batch 4ed05f22 (2026-09-05, Velorix): page one said Not Available BECAUSE of
// the ePrivacy gate while this overlay said the gate "does not affect … the
// Article 6(1)(f) determination above". The typed engine's persisted
// foreclosure flag (the sanctioned door — this file still never reads the gate
// finding) now reconciles the overlay's closing sentence.
Deno.test("batch 4ed05f22 — LIA: under foreclosure the overlay names the gate as the reason, never 'does not affect'", () => {
  const engagement_map = engagementMapFor(COOKIE_RECORD);
  const plain = eprivacyOverlayNote({ engagement_map });
  assertStringIncludes(plain, "does not affect, and is not affected by, the Article 6(1)(f) determination above");
  const foreclosedNote = eprivacyOverlayNote({ engagement_map }, true);
  assertStringIncludes(foreclosedNote, "Separately,");
  assertStringIncludes(foreclosedNote, "is the reason legitimate interests is not available for the covered processing");
  assert(!foreclosedNote.includes("does not affect"), "the contradicting sentence must not render under foreclosure");

  // The flag rides the typed engine's telemetry, not the gate finding.
  const v = readTypedVerdicts({ _meta: { internal: { lia_typed_test: { eprivacy_foreclosed: true } } } });
  assertEquals(v.eprivacy_foreclosed, true);
  assertEquals(readTypedVerdicts({}).eprivacy_foreclosed, false);

  // End to end through the assembler: the document carries the reconciled sentence.
  const text = documentText({ engagement_map, _meta: { internal: { lia_typed_test: { eprivacy_foreclosed: true } } } }, COOKIE_RECORD);
  assertStringIncludes(text, "is the reason legitimate interests is not available");
  assert(!text.includes("does not affect, and is not affected by"), "assembled document must not carry the contradiction");
});

Deno.test("doc139 — LIA: qualified 'Additional Information Required' text renders when the harder gate's own triggers don't clearly fire (ambiguous signal)", () => {
  const gate = buildEprivacyShortCircuit(AMBIGUOUS_DEVICE_RECORD);
  assertEquals(gate.determination, "undetermined_on_the_record", "fixture must be ambiguous under eprivacy-gate.ts's narrower triggers");

  const engagement_map = engagementMapFor(AMBIGUOUS_DEVICE_RECORD);
  const entry = engagement_map.entries.find((e) => e.rule_id === "R_EPRIVACY_PECR");
  assert(entry, "R_EPRIVACY_PECR entry missing");
  assertEquals(entry!.status, "conditional");

  const text = documentText({ engagement_map }, AMBIGUOUS_DEVICE_RECORD);
  assertStringIncludes(text, "PECR/ePrivacy applicability — Additional Information Required.");
  assertStringIncludes(
    text,
    "does not establish whether the processing involves storage of information on, or access to information stored on, terminal equipment",
  );
  assert(!text.includes("Separately,"), "the firm sentence must not render when the signal is ambiguous");
});

Deno.test("doc139 — LIA: no overlay text at all when the harder gate finds no PECR signal on the record", () => {
  const gate = buildEprivacyShortCircuit(PLAIN_RECORD);
  assertEquals(gate.determination, "not_engaged_on_the_record", "the harder gate correctly finds no PECR signal on this record");

  const engagement_map = engagementMapFor(PLAIN_RECORD);
  const entry = engagement_map.entries.find((e) => e.rule_id === "R_EPRIVACY_PECR");
  assert(entry, "R_EPRIVACY_PECR entry missing");
  assertEquals(entry!.status, "not_engaged", "the fact-gated rule must now resolve not_engaged when the harder gate finds nothing");

  const text = documentText({ engagement_map }, PLAIN_RECORD);
  assert(!text.includes("Separately,"), "firm sentence must not render");
  assert(!text.includes("Additional Information Required"), "qualified sentence must not render");
  assert(!text.toLowerCase().includes("pecr"), "no PECR text at all should render for a record with no signal");
});

Deno.test("doc139 — LIA: omitting the gate determination (4th arg) degrades to the conservative qualified statement, never the firm one", () => {
  // Simulates the pre-doc-139 call shape / a caller that hasn't wired the
  // gate through yet — engagement-map.ts must default conservatively, not
  // assume engagement.
  const engagement_map = buildLiaEngagementMap(COOKIE_RECORD, undefined, undefined);
  const entry = engagement_map.entries.find((e) => e.rule_id === "R_EPRIVACY_PECR");
  assert(entry, "R_EPRIVACY_PECR entry missing");
  assertEquals(entry!.status, "conditional", "omitting the gate determination must not default to 'engaged'");

  const text = documentText({ engagement_map }, COOKIE_RECORD);
  assertStringIncludes(text, "PECR/ePrivacy applicability — Additional Information Required.");
  assert(
    !text.includes("requires a separate consent or exemption under the ePrivacy Directive / PECR 2003"),
    "must not assert the firm requirement without the harder gate's own confirmation",
  );
});

Deno.test("doc137 — LIA: no engagement_map at all renders no overlay text and no placeholder (no-padding law)", () => {
  const text = documentText({}, PLAIN_RECORD);
  assert(!text.includes("Separately,"), "overlay text must not appear absent an engagement_map");
  assert(!text.toLowerCase().includes("pecr"), "no PECR placeholder should render without a live entry");
});

Deno.test("doc137 — LIA: an engagement_map missing the PECR rule_id renders nothing for this overlay", () => {
  const engagement_map = {
    entries: [
      { rule_id: "R_ART_6_1_F", name: "x", status: "engaged", rationale: "irrelevant", intake_signals: [], section_ref: "s" },
    ],
  };
  const text = documentText({ engagement_map }, PLAIN_RECORD);
  assert(!text.includes("Separately,"), "must not render when the specific rule_id is absent");
  assert(!text.includes("Additional Information Required"), "must not render when the specific rule_id is absent");
});

Deno.test("doc137 — LIA: an explicit non-engagement status renders nothing (defensive gate, no placeholder)", () => {
  const engagement_map = {
    entries: [
      {
        rule_id: "R_EPRIVACY_PECR",
        name: "ePrivacy / PECR device-storage overlay",
        status: "not_engaged",
        rationale: "Any storage of or access to information on a user's device requires a separate consent or exemption under the ePrivacy Directive / PECR 2003 in addition to the LI basis.",
        intake_signals: [],
        section_ref: "section_5_recommendations",
      },
    ],
  };
  const text = documentText({ engagement_map }, PLAIN_RECORD);
  assert(!text.includes("Separately,"), "a non-engaged status must not render the overlay");
  assert(!text.includes("Additional Information Required"), "a non-engaged status must not render the overlay");
});

Deno.test("doc137 — LIA: the Article 6(1)(f) determination is byte-identical with and without the engagement_map", () => {
  const engagement_map = engagementMapFor(COOKIE_RECORD);
  const withMap = readTypedVerdicts({ engagement_map } as Bag);
  const withoutMap = readTypedVerdicts({} as Bag);
  assertEquals(withMap, withoutMap, "readTypedVerdicts must not vary with engagement_map presence");

  // The leads/exec-posture text (which carries the actual Art. 6(1)(f)
  // holding) must also be identical apart from the new, clearly separate
  // overlay paragraph appended in Findings — dropping just that one
  // paragraph must leave every other paragraph untouched.
  const paragraphsWith = paragraphs({ engagement_map }, COOKIE_RECORD).filter((p) => !isOverlayParagraph(p));
  const paragraphsWithout = paragraphs({}, COOKIE_RECORD);
  assertEquals(paragraphsWith, paragraphsWithout, "removing the overlay paragraph must leave every other paragraph byte-identical");
});

Deno.test("doc137 — LIA: the ratified eprivacy-gate.ts hard gate is untouched by this overlay — same trigger classification either way, and it never reads report.engagement_map", () => {
  const withoutMap = buildEprivacyShortCircuit(COOKIE_RECORD);
  const engagement_map = engagementMapFor(COOKIE_RECORD);
  // buildEprivacyShortCircuit is a pure function of the intake record only
  // (see its module header's PURITY LAW) — passing engagement_map alongside
  // the same intake must not change its output, since it never reads that
  // field at all.
  const withMap = buildEprivacyShortCircuit({ ...COOKIE_RECORD, engagement_map });
  assertEquals(withMap, withoutMap, "eprivacy-gate.ts output must not vary with the engagement-map overlay present");

  const gateSrc = Deno.readTextFileSync(
    new URL(
      "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/eprivacy-gate.ts",
      import.meta.url,
    ),
  );
  assert(!gateSrc.includes("engagement_map"), "eprivacy-gate.ts must not read or duplicate the engagement-map overlay");
});

Deno.test("doc139 — LIA: the skeleton assembler still never consumes report.eprivacy_short_circuit directly (single render-door law)", () => {
  const src = Deno.readTextFileSync(
    new URL(
      "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts",
      import.meta.url,
    ),
  );
  assert(
    !src.includes("eprivacy_short_circuit"),
    "the skeleton assembler must not consume the gate directly — see tests/edge/run-li-assessment/eprivacy-gate.test.ts's ratified assertion",
  );
});

Deno.test("doc139 — LIA: engagement-map.ts does not import eprivacy-gate.ts (no backwards _shared -> _local dependency)", () => {
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/_shared/engagement-map.ts", import.meta.url),
  );
  assert(
    !/from\s+["'].*eprivacy-gate\.ts["']/.test(src),
    "engagement-map.ts must receive the gate determination as a parameter from its caller, not import the function-local eprivacy-gate.ts module",
  );
});
