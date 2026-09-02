// DOC 137 (2026-09-01) — regression guard for the LIA ePrivacy/PECR
// engagement-map wiring: engagement-map.ts's R_EPRIVACY_PECR entry
// (buildLiaEngagementMap) was computed and attached to report.engagement_map
// since it shipped, but no LIA renderer ever read it — the exact same
// "computed but never rendered" pattern doc 136 fixed for DPIA's Art.
// 35(3)(c) entry. Fixed here by eprivacyOverlayNote (in
// lia-skeleton-assemble.ts), rendered as the "findings:5" block, V2-only.
//
// This overlay is informational/adjacent-obligation only: it must never
// alter the three-part-test's own Article 6(1)(f) determination, and it
// must not duplicate or interact with the already-ratified, narrower
// eprivacy-gate.ts hard gate (LIA_EPRIVACY_GATE_RATIFIED), which can alter
// that determination from its own regex triggers.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleLiaSkeletonDocument,
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

function paragraphs(report: Bag, record: Bag): string[] {
  const doc = assembleLiaSkeletonDocument(report, record, { deterministic: true }) as unknown as {
    document: { sections: Array<{ paragraphs: Array<{ text: string }> }> };
  };
  return doc.document.sections.flatMap((sec) => sec.paragraphs.map((p) => p.text));
}

function documentText(report: Bag, record: Bag): string {
  return paragraphs(report, record).join("\n");
}

Deno.test("doc137 — LIA: ePrivacy/PECR overlay renders when the engagement-map entry is engaged", () => {
  const engagement_map = buildLiaEngagementMap(COOKIE_RECORD, undefined, undefined);
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

Deno.test("doc137 — LIA: ePrivacy/PECR overlay renders when the engagement-map entry is conditional (not just engaged)", () => {
  const engagement_map = buildLiaEngagementMap(PLAIN_RECORD, undefined, undefined);
  const entry = engagement_map.entries.find((e) => e.rule_id === "R_EPRIVACY_PECR");
  assert(entry, "R_EPRIVACY_PECR entry missing");
  assertEquals(entry!.status, "conditional");

  const text = documentText({ engagement_map }, PLAIN_RECORD);
  assertStringIncludes(text, "Separately,");
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
});

Deno.test("doc137 — LIA: the Article 6(1)(f) determination is byte-identical with and without the engagement_map", () => {
  const engagement_map = buildLiaEngagementMap(COOKIE_RECORD, undefined, undefined);
  const withMap = readTypedVerdicts({ engagement_map } as Bag);
  const withoutMap = readTypedVerdicts({} as Bag);
  assertEquals(withMap, withoutMap, "readTypedVerdicts must not vary with engagement_map presence");

  // The leads/exec-posture text (which carries the actual Art. 6(1)(f)
  // holding) must also be identical apart from the new, clearly separate
  // "Separately, ..." overlay paragraph appended in Findings — dropping
  // just that one paragraph must leave every other paragraph untouched.
  const paragraphsWith = paragraphs({ engagement_map }, COOKIE_RECORD).filter((p) => !p.includes("Separately,"));
  const paragraphsWithout = paragraphs({}, COOKIE_RECORD);
  assertEquals(paragraphsWith, paragraphsWithout, "removing the overlay paragraph must leave every other paragraph byte-identical");
});

Deno.test("doc137 — LIA: the ratified eprivacy-gate.ts hard gate is untouched by this overlay — same trigger classification either way, and it never reads report.engagement_map", () => {
  const withoutMap = buildEprivacyShortCircuit(COOKIE_RECORD);
  const engagement_map = buildLiaEngagementMap(COOKIE_RECORD, undefined, undefined);
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
