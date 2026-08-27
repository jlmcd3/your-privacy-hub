// FD703575 (quality batch, 2026-08-27) — Biometric fixes.
// The batch's biometric document (row 91e44cfa, scored 83.95) carried:
//   B1 [HIGH] the Washington MHMDA lead asserted "the company's answers
//      indicate that health data is collected or inferred" on the mere
//      EXISTENCE of MHMDA duty rows, against a record answering "No" on
//      every wa_mhmda_* field — while each duty row below it correctly said
//      the data falls outside RCW 19.373.010(8).
//   B2 [HIGH] § 15(a) compliance-with-schedule concluded "this duty is met"
//      on free text that itself DENIES the duty's predicates ("Castellan
//      does not have a formal written biometric retention schedule" / "No
//      automated destruction trigger is configured") — the negation-blind
//      free-text class.
//   B4 the CSC carried-forward quotes truncated mid-sentence at the 700-char
//      cap and shipped without terminal punctuation.
//   B5 the operative lead listed unmet duties by name and citation only;
//      each act now carries the requirement that closes it.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBiometricDeliverables } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts";
import { assembleBiometricSkeletonDocument } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-skeleton-assemble.ts";
import { BIOMETRIC_KEY_SENTENCES } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-csc.ts";

type Bag = Record<string, unknown>;

const DENYING_SCHEDULE =
  "Castellan does not have a formal written biometric retention schedule. In practice, fingerprint and facial templates remain in the Azure SQL database until an employee's account is manually deactivated.";
const DENYING_TRIGGER =
  "No automated destruction trigger is configured. Template deletion is a manual IT task initiated only when an IT administrator processes a termination ticket in ServiceNow; tickets are often delayed or missed for seasonal workers.";

function ilIntake(over: Bag = {}): Bag {
  return {
    orgName: "Castellan Facilities Group",
    orgType: "Private employer",
    purpose: "Timekeeping",
    biometricTypes: ["Fingerprint"],
    jurisdictions: ["Illinois (BIPA)"],
    retention_schedule_text: DENYING_SCHEDULE,
    retention_policy_public: "No",
    destruction_trigger: DENYING_TRIGGER,
    notice_before_collection: "Notice given before collection, but not in writing",
    consent_artifact_type: "Release executed as a condition of employment",
    sells_or_profits: "No",
    ...over,
  };
}

Deno.test("B2 — a schedule text that denies a schedule can never yield a met compliance duty", () => {
  const d = buildBiometricDeliverables(ilIntake() as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const comply = duties.find((x) => x.key === "il_bipa.15a_comply_with_schedule");
  assert(comply, "comply duty row must exist");
  assertEquals(comply!.verdict, "not_satisfied");
  assertStringIncludes(String(comply!.application), "presupposes one");
  const policy = duties.find((x) => x.key === "il_bipa.15a_written_policy");
  assertEquals(policy!.verdict, "not_satisfied");
  assertStringIncludes(String(policy!.application), "does not maintain a formal written retention schedule");
});

Deno.test("B2 — a real schedule with a trigger text that denies a configured trigger degrades honestly", () => {
  const d = buildBiometricDeliverables(ilIntake({
    retention_schedule_text: "A written schedule: templates are destroyed 30 days after termination, per Policy BIO-7.",
    retention_policy_public: "Yes",
    retention_policy_predates_possession: "Yes",
    destruction_trigger: DENYING_TRIGGER,
  }) as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const comply = duties.find((x) => x.key === "il_bipa.15a_comply_with_schedule");
  assertEquals(comply!.verdict, "record_insufficient");
  assertStringIncludes(String(comply!.application), "no destruction trigger is configured");
});

Deno.test("B2 — an affirmative schedule and trigger still satisfy (no over-correction)", () => {
  const d = buildBiometricDeliverables(ilIntake({
    retention_schedule_text: "A written schedule: templates are destroyed 30 days after termination, per Policy BIO-7.",
    retention_policy_public: "Yes",
    retention_policy_predates_possession: "Yes",
    destruction_trigger: "Automated deletion runs nightly; any template past its 30-day post-termination window is purged.",
  }) as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const comply = duties.find((x) => x.key === "il_bipa.15a_comply_with_schedule");
  assertEquals(comply!.verdict, "satisfied");
  const policy = duties.find((x) => x.key === "il_bipa.15a_written_policy");
  assertEquals(policy!.verdict, "satisfied");
});

Deno.test("B1 — the MHMDA lead reflects the health-inference answer, never bare row existence", () => {
  const waIntake = {
    orgName: "CastTrack Inc.",
    orgType: "Private employer",
    purpose: "Timekeeping",
    biometricTypes: ["Fingerprint"],
    jurisdictions: ["Washington (RCW 19.375 / My Health My Data)"],
    wa_enrolls_in_database: "Yes",
    wa_commercial_purpose: "No",
    wa_mhmda_health_inference: "No",
    wa_mhmda_privacy_policy_published: "No",
    wa_mhmda_collection_consent: "No",
    wa_mhmda_share_consent_separate: "No",
    wa_mhmda_geofence_health_facility: "No",
  } as Bag;
  const report = buildBiometricDeliverables(waIntake as never) as unknown as Bag;
  const sk = assembleBiometricSkeletonDocument({ ...report, duty_findings: report.duty_findings }, waIntake);
  const text = JSON.stringify(sk);
  assert(
    !text.includes("because the company's answers indicate that health data is collected or inferred"),
    "the applies-because-indicated lead must not render against a 'No' health-inference answer",
  );
  assertStringIncludes(text, "not consumer health data as RCW 19.373.010(8) defines it");
});

Deno.test("B4 — CSC carried-forward quotes end at a sentence boundary with terminal punctuation", () => {
  const longText = Array.from({ length: 12 }, (_, i) => `Sentence number ${i + 1} carries seventy characters of description for the record here.`).join(" ");
  const sentence = BIOMETRIC_KEY_SENTENCES.security_measures_description(longText);
  assert(sentence.endsWith("."), "the restatement must terminate");
  assert(/[.!?]"\.$/.test(sentence), `the quote must close at a sentence boundary: ...${sentence.slice(-40)}`);
  assert(sentence.length < longText.length + 80, "the cap must still bound the quote");
});

Deno.test("B5 — the operative lead names, per unmet duty, the requirement that closes it", () => {
  const report = buildBiometricDeliverables(ilIntake() as never) as unknown as Bag;
  const sk = assembleBiometricSkeletonDocument(report, ilIntake());
  const text = JSON.stringify(sk);
  const lead = text.match(/The operative conclusion is that the programme is out of compliance[^"]*/)?.[0] ?? "";
  assert(lead.length > 0, "the out-of-compliance lead must render on this fixture");
  assertStringIncludes(lead, "(");
  assertStringIncludes(lead, "requires");
});
