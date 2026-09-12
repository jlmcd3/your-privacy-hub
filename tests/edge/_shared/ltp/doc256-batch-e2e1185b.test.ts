// DOC 256 (2026-09-11) — batch e2e1185b triage. Pins the product and grader
// fixes: the grader payload flattens tables (both mirrors), the registration
// limb sentence pluralises by count, the Risk ADMT attribution no longer
// adds "for a significant decision" to the company's own answer, the
// biometric Washington disclosure row carries the recorded recipients, the
// LIA ePrivacy overlay names the open messaging limb when the device limb is
// answered, the use-case classifier no longer reads "outreach"/"email" as
// direct marketing, the IR Art. 33 determination names the lead-authority
// rule when Member States are recorded, the US notice Appendix A row is a
// completion row when no category is recorded, the DPA assembles Section 12
// in the GDPR/UK modes when California is engaged, and the governance
// appropriateness clause carries the calibration finding's own basis.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSkeletonGraderPayload as mirrorPayload } from "../../../../supabase/functions/grade-single-assessment/_local/grader/skeleton-payload-mirror.ts";
import { buildSkeletonGraderPayload as batchPayload } from "../../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";
import { buildRegistrationDeliverables } from "../../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { buildBiometricDeliverables } from "../../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts";
import { buildLiaEngagementMap } from "../../../../supabase/functions/_shared/engagement-map.ts";
import { eprivacyOverlayNote } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { classifyLiaUseCase } from "../../../../supabase/functions/_shared/lia/lia-use-case-classifier.ts";
import { buildSaNotificationDetermination } from "../../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { buildNoticeHtml, type StateRow } from "../../../../supabase/functions/generate-us-notice/_local/render.ts";
import { assembleDpaDocument, type DpaAssembleInput } from "../../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import { US_REQUIRED_TERMS_SECTION } from "../../../../supabase/functions/generate-dpa/_local/clause-library/dpa-clause-library.ts";
import { buildAccountabilityDetermination } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { GRADER_CONTEXT_VERSION } from "../../../../supabase/functions/_shared/grader/context.ts";

type Bag = Record<string, unknown>;

// ── grader: tables reach the grader as rows, not an empty line ─────────────

const TABLE_REPORT: Bag = {
  skeleton_document: {
    title: "T",
    sections: [{
      id: "s1",
      title: "Clocks",
      paragraphs: [
        { kind: "skeleton", text: "Prose before the table." },
        {
          kind: "table",
          text: "",
          table: {
            key: "s1:1",
            surface: "x",
            title: "Notification clocks",
            columns: ["Duty", "Deadline"],
            rows: [["Art. 33(1)", "72 hours"], ["Art. 34(1)", "without undue delay"]],
          },
        },
      ],
    }],
  },
};

Deno.test("doc256 — both grader payload builders flatten a table paragraph into its rows", () => {
  for (const build of [mirrorPayload, batchPayload]) {
    const text = build(TABLE_REPORT).text;
    assertStringIncludes(text, "[kind=table] Notification clocks\nDuty | Deadline\nArt. 33(1) | 72 hours\nArt. 34(1) | without undue delay");
    assert(!/\[kind=table\]\s*\n/.test(text), "no empty table line reaches the grader");
    assertStringIncludes(text, "[kind=skeleton] Prose before the table.");
  }
});

Deno.test("doc256 — the grader instrument carries the batch e2e1185b tag", () => {
  assert(GRADER_CONTEXT_VERSION.endsWith("+batch-e2e1185b-cal-2026-09-11+doc258-q9-homepage-2026-09-11+batch-c4d0b8a0-cal-2026-09-12"), GRADER_CONTEXT_VERSION);
});

// ── registration: the limb sentence pluralises by count ────────────────────

function usBroker(over: Bag = {}): Bag {
  return {
    organization_name: "Halyard Audience Data LLC",
    organization_country: "US",
    organization_size: "medium",
    employee_count: 140,
    industry: "AdTech / MarTech",
    role: "controller",
    processes_personal_data: true,
    has_uk_establishment: false,
    has_eu_establishment: false,
    is_public_authority: false,
    markets_served: ["US-CA"],
    acts_as_data_broker: true,
    sells_or_shares_personal_info: true,
    collects_data_not_directly_from_individuals: true,
    has_direct_relationship_with_data_subjects: false,
    sells_or_licenses_brokered_data: true,
    data_broker_exemption_claimed: "none",
    ...over,
  };
}

function caThreshold(intake: Bag): Bag {
  const built = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const d = (built.determinations as Bag[]).find((x) => x.jurisdiction === "US-CA");
  if (!d) throw new Error("no California determination");
  return d.threshold as Bag;
}

Deno.test("doc256 — one failed limb reads 'limb fails'; two read 'limbs fail'; the same for unevidenced limbs", () => {
  const one = caThreshold(usBroker({ sells_or_licenses_brokered_data: false, sells_or_shares_personal_info: false }));
  assertStringIncludes(String(one.application), "the following limb fails against the facts recorded");
  assert(!String(one.application).includes("limb(s)"));
  const two = caThreshold(usBroker({
    sells_or_licenses_brokered_data: false,
    sells_or_shares_personal_info: false,
    collects_data_not_directly_from_individuals: false,
  }));
  assertStringIncludes(String(two.application), "the following limbs fail against the facts recorded");
  const openOne = caThreshold(usBroker({ sells_or_licenses_brokered_data: null, sells_or_shares_personal_info: null }));
  assertStringIncludes(String(openOne.application), "the following limb is unevidenced by the facts recorded");
  const openTwo = caThreshold(usBroker({
    sells_or_licenses_brokered_data: null,
    sells_or_shares_personal_info: null,
    collects_data_not_directly_from_individuals: null,
  }));
  assertStringIncludes(String(openTwo.application), "the following limbs are unevidenced by the facts recorded");
});

// ── Risk: the ADMT attribution repeats the company's answer, nothing more ──

Deno.test("doc256 — the Risk factor engine attributes only the ADMT answer the company gave (both mirrors)", async () => {
  const OLD = "answers “Yes” to using automated decisionmaking technology for a significant decision";
  const NEW = "answers “Yes” to using automated decisionmaking technology";
  for (const rel of [
    "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-factor-engine.ts",
    "../../../../supabase/functions/ltp-risk-doc-gen/_local/ltp/risk-factor-engine.ts",
  ]) {
    const src = await Deno.readTextFile(new URL(rel, import.meta.url));
    assert(!src.includes(OLD), `${rel} still adds "for a significant decision" to the answer`);
    assert(src.includes(NEW), `${rel} lost the attribution sentence`);
  }
});

// ── biometric: the Washington disclosure row carries the recorded recipients ─

Deno.test("doc256 — the Washington disclosure-limits row names the recorded recipients", () => {
  const waIntake: Bag = {
    orgName: "CastTrack Inc.",
    orgType: "Private employer",
    purpose: "Timekeeping",
    biometricTypes: ["Fingerprint"],
    jurisdictions: ["Washington (RCW 19.375 / My Health My Data)"],
    disclosure_recipients: "Our payroll processor and the time-clock vendor",
    disclosure_bases: ["Consent"],
    wa_enrolls_in_database: "Yes",
    wa_commercial_purpose: "Yes",
  };
  const report = buildBiometricDeliverables(waIntake as never) as unknown as Bag;
  const row = (report.duty_findings as Bag[]).find((x) => x.key === "wa_19375.020_3_disclosure_limits");
  assert(row, "Washington disclosure row present");
  assertStringIncludes(String(row.record_fact), "Recipients: Our payroll processor and the time-clock vendor.");
  assert(!String(row.record_fact).includes("not supplied"), String(row.record_fact));
});

// ── LIA: the open messaging limb is named when the device limb is answered ─

const LIA_INTAKE: Bag = {
  organization_name: "Veltrix Digital Solutions Ltd",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  processing_description: "Session cookies and in-app messages to logged-in users about account activity.",
  stated_purpose: "Service continuity and account notices.",
  data_categories: ["Customer records"],
  purpose_details: {
    device_access: "Yes",
    device_access_strictly_necessary: "Yes — all of it is strictly necessary",
  },
};

Deno.test("doc256 — a conditional ePrivacy entry with the device limb answered names the messaging limb, not the device limb", () => {
  const map = buildLiaEngagementMap(LIA_INTAKE, undefined, undefined, "undetermined") as unknown as Bag;
  const entry = (map.entries as Bag[]).find((e) => e.rule_id === "R_EPRIVACY_PECR")!;
  assertEquals(entry.status, "conditional");
  assertEquals(entry.basis, "messages_limb_open");
  const rationale = String(entry.rationale);
  assert(rationale.startsWith("PECR/ePrivacy applicability — Additional Information Required. The company states"), rationale);
  assertStringIncludes(rationale, "PECR regulation 22");
  assert(!rationale.includes("does not establish whether the processing involves storage of or access to information on a user's device"), rationale);
  const note = eprivacyOverlayNote({ engagement_map: map });
  assertEquals(note, rationale);
});

Deno.test("doc256 — the generic conditional note still renders when the device limb is unanswered", () => {
  const map = buildLiaEngagementMap({ ...LIA_INTAKE, purpose_details: {} }, undefined, undefined, "undetermined") as unknown as Bag;
  const entry = (map.entries as Bag[]).find((e) => e.rule_id === "R_EPRIVACY_PECR")!;
  assertEquals(entry.status, "conditional");
  assertEquals(entry.basis, undefined);
  assertStringIncludes(String(entry.rationale), "The record does not establish whether the processing involves storage of or access to information on a user's device");
});

Deno.test("doc256 — 'outreach' and 'email' alone no longer classify a use case as direct marketing", () => {
  assert(classifyLiaUseCase("Email outreach to account holders about a service incident and password reset") !== "direct_marketing");
  assertEquals(classifyLiaUseCase("Sending a monthly marketing newsletter to subscribers"), "direct_marketing");
  assertEquals(classifyLiaUseCase("Promotional email campaign with upsell offers"), "direct_marketing");
});

// ── IR: lead supervisory authority when Member States are recorded ─────────

function irIntake(over: Bag = {}): Bag {
  return {
    organizationName: "Nordlys Analytics ApS",
    discoveryDateTime: "2026-08-29T14:00",
    cause: "Ransomware or malware",
    dataTypes: ["Names and contact details"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["Denmark", "Germany", "Netherlands"],
    contained: "Yes",
    organisationType: "Company",
    ...over,
  };
}

Deno.test("doc256 — the Art. 33 determination names the recorded Member States and the Art. 56(1) lead-authority rule", () => {
  const rsa = buildSaNotificationDetermination(irIntake()) as unknown as Bag;
  const app = String(rsa.application);
  assertStringIncludes(app, "The recorded EU jurisdictions are Denmark, Germany and Netherlands.");
  assertStringIncludes(app, "Article 56(1)");
  assertStringIncludes(app, "main establishment");
  const single = String((buildSaNotificationDetermination(irIntake({ jurisdictions: ["Denmark"] })) as unknown as Bag).application);
  assertStringIncludes(single, "The recorded EU jurisdictions are Denmark.");
  const generic = String((buildSaNotificationDetermination(irIntake({ jurisdictions: ["EU/EEA"] })) as unknown as Bag).application);
  assert(!generic.includes("The recorded EU jurisdictions are"), "the EU/EEA placeholder names no Member State");
});

// ── US notice: Appendix A row with no recorded category is a completion row ─

const CA: StateRow = { state_code: "CA", state_name: "California", framework_type: "ccpa" };
const US_FULL: Bag = {
  business_name: "Acme Widgets, Inc.",
  business_description: "We sell widgets online.",
  contact_email: "privacy@acme.example",
  data_categories: [],
  collection_purposes: ["service_delivery", "analytics"],
  data_sources: "Directly from you; automatically from your use of our website",
  third_party_sharing: "yes",
  third_party_categories: ["service_providers", "analytics"],
  sale_or_sharing: "no",
  retention_general: "24 months after your last order",
  ccpa_sensitive_data: "no",
  ccpa_minors: "no",
  ccpa_financial_incentive: "no",
  ccpa_admt: "no",
};

Deno.test("doc256 — the Notice at Collection row asks for the category, its purposes and its retention when no category is recorded", () => {
  const html = buildNoticeHtml(CA, US_FULL, "September 11, 2026");
  const start = html.indexOf("Appendix A — California Notice at Collection");
  const table = html.slice(html.indexOf("<table", start), html.indexOf("</table>", start));
  assertStringIncludes(table, "[insert the category]");
  assertStringIncludes(table, "[insert the purposes for this category]");
  assert(!table.includes("24 months after your last order"), "the general retention statement is not copied against an unnamed category");
  assert(!table.includes("service delivery"), "the general purposes are not copied against an unnamed category");
});

// ── DPA: Section 12 assembled wherever the CCPA addendum cites it ──────────

const DPA_BASE: DpaAssembleInput = {
  documentType: "gdpr",
  controllerName: "Acme GmbH",
  controllerJurisdiction: "Germany",
  processorName: "CloudOps GmbH",
  processorJurisdiction: "Germany",
  services: "cloud hosting and managed backups for the Controller's ERP system",
  dataCategories: ["General personal data"],
  retention: "For the duration of the principal agreement, then delete or return",
  hasSubProcessors: false,
  subProcessorList: "",
  subprocessorAuthorizationModel: "general",
  subprocessorNoticeDays: 30,
  auditRights: "Annual audit",
  includeTransferClause: false,
  transferMechanism: "",
  securityMeasuresSelected: ["encryption_at_rest"],
  securityMeasuresDetails: "AES-256",
  californiaEngaged: false,
};

Deno.test("doc256 — the GDPR and UK modes assemble the CCPA required-terms section when California is engaged, and not otherwise", () => {
  for (const documentType of ["gdpr", "uk"] as const) {
    const on = assembleDpaDocument({ ...DPA_BASE, documentType, processorJurisdiction: "California", californiaEngaged: true });
    assert(on.sections.some((sec) => sec.heading === US_REQUIRED_TERMS_SECTION.heading), `${documentType}: Section 12 assembled`);
    const off = assembleDpaDocument({ ...DPA_BASE, documentType });
    assert(!off.sections.some((sec) => sec.heading === US_REQUIRED_TERMS_SECTION.heading), `${documentType}: no Section 12 without California`);
  }
  const canada = assembleDpaDocument({ ...DPA_BASE, documentType: "canada", californiaEngaged: true });
  assert(!canada.sections.some((sec) => sec.heading === US_REQUIRED_TERMS_SECTION.heading), "canada mode never assembles the CCPA section");
});

// ── governance: the appropriateness clause carries the calibration basis ───

Deno.test("doc256 — the accountability reasoning carries the calibration finding's first sentence as the basis", () => {
  const demonstrability = Array.from({ length: 4 }, (_, i) => ({
    duty: `duty-${i}`,
    artifact_present: "yes" as const,
    artifact: "Named artifact",
    citation: "GDPR Art. 5(2)",
  })) as never;
  const det = buildAccountabilityDetermination(
    {},
    demonstrability,
    {
      verdict: "satisfied",
      status: "analysed",
      application: "The record names special-category data at a scale of 40,000 data subjects. The measures named answer that profile.",
    } as never,
    { verdict: "satisfied", status: "analysed" } as never,
  );
  assertStringIncludes(det.reasoning, "Article 24(1) names (the record names special-category data at a scale of 40,000 data subjects).");
  const bare = buildAccountabilityDetermination(
    {},
    demonstrability,
    { verdict: "satisfied", status: "analysed" } as never,
    { verdict: "satisfied", status: "analysed" } as never,
  );
  assertStringIncludes(bare.reasoning, "Article 24(1) names. Review:");
});
