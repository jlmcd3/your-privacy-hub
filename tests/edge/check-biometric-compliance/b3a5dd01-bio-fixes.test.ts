// B3A5DD01 (quality batch, 2026-08-28) — Biometric fixes.
//   B2 [HIGH] wa_19375.020_5_material_inconsistency was wired but inert: it
//      unconditionally claimed "the record does not set out those original
//      terms" and hardcoded record_insufficient, regardless of what
//      release_artifact_description/purpose actually held. The live intake
//      supplied both, directly consistent — the check never looked.
//   B3 [HIGH] a SCOPED trigger denial ("No trigger is defined for
//      inter-site transfers") after an established general trigger was read
//      as denying the trigger altogether ("The trigger text the record
//      supplies states no destruction trigger is configured" — false
//      against a record naming a specific event trigger).
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBiometricDeliverables } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts";

type Bag = Record<string, unknown>;

function waIntake(over: Bag = {}): Bag {
  return {
    orgName: "Castellan Workforce Technologies Ltd",
    orgType: "Employer (employee biometrics)",
    purpose: "Time & attendance / workforce management",
    biometricTypes: ["Fingerprint / palm print"],
    jurisdictions: ["Washington state, USA"],
    wa_enrolls_in_database: "Yes",
    wa_commercial_purpose: "Yes",
    notice_before_collection: "Written notice given before collection",
    consent_artifact_type: "Release executed as a condition of employment (onboarding paperwork)",
    disclosure_bases: ["Necessary to provide a product or service the subject requested"],
    security_measures_description: "Templates are AES-256 encrypted at rest.",
    destruction_trigger: "Employee separation date, or 90 days after the initial purpose is fulfilled, whichever occurs first.",
    ...over,
  };
}

function ilIntake(over: Bag = {}): Bag {
  return {
    orgName: "Castellan Workforce Technologies Ltd",
    orgType: "Employer (employee biometrics)",
    purpose: "Time & attendance",
    biometricTypes: ["Fingerprint"],
    jurisdictions: ["Illinois, USA (BIPA)"],
    retention_policy_public: "Yes",
    retention_policy_predates_possession: "No",
    retention_schedule_text: "Templates are deleted within 3 years of collection per the published schedule.",
    ...over,
  };
}

Deno.test("B2 — a record supplying both the original terms and the current purpose is assessed, not declared missing", () => {
  const d = buildBiometricDeliverables(waIntake({
    release_artifact_description:
      "The form states that fingerprint and facial geometry will be collected for time-and-attendance purposes using the Suprema BioStation A2 system and retained for the duration of employment.",
  }) as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const row = duties.find((x) => x.key === "wa_19375.020_5_material_inconsistency");
  assert(row, "the material-inconsistency row must exist");
  assert(
    !String(row!.application).includes("does not set out those original terms"),
    "must not claim the terms are missing when they are supplied",
  );
  assertStringIncludes(String(row!.application), "consistent with those terms");
  assertEquals(row!.verdict, "satisfied");
});

Deno.test("B2 — original terms that plainly diverge from the current purpose are not asserted consistent", () => {
  const d = buildBiometricDeliverables(waIntake({
    purpose: "Facial recognition for retail loss-prevention watchlists",
    release_artifact_description:
      "The form states that fingerprint data will be collected solely for time-and-attendance clock-in purposes.",
  }) as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const row = duties.find((x) => x.key === "wa_19375.020_5_material_inconsistency");
  assertEquals(row!.verdict, "record_insufficient");
  assert(!String(row!.application).includes("consistent with those terms"));
});

Deno.test("B2 — either field missing still degrades honestly, naming the missing one", () => {
  const d = buildBiometricDeliverables(waIntake({ release_artifact_description: "" }) as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const row = duties.find((x) => x.key === "wa_19375.020_5_material_inconsistency");
  assertEquals(row!.verdict, "record_insufficient");
  assertStringIncludes(String(row!.information_needed), "Supply the terms under which identifiers were originally provided");
});

Deno.test("B3 — a scoped trigger denial after an established general trigger does not deny the trigger", () => {
  const d = buildBiometricDeliverables(ilIntake({
    destruction_trigger:
      "Employee separation date (termination, resignation, or end of fixed-term contract), or 90 days after the initial purpose is fulfilled, whichever occurs first — per RM-2023-11. No trigger is defined for inter-site transfers.",
  }) as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const comply = duties.find((x) => x.key === "il_bipa.15a_comply_with_schedule");
  assert(comply, "comply duty row must exist");
  assert(
    !String(comply!.application).includes("states no destruction trigger is configured"),
    "must not claim the trigger is unconfigured when a general trigger is established",
  );
  assertEquals(comply!.verdict, "satisfied");
  assertStringIncludes(String(comply!.application), "narrower gap not covered by that trigger");
  assertStringIncludes(String(comply!.application), "inter-site transfers");
});

Deno.test("B3 — an unscoped denial (the original fd703575 shape) still denies", () => {
  const d = buildBiometricDeliverables(ilIntake({
    destruction_trigger:
      "No automated destruction trigger is configured. Template deletion is a manual IT task initiated only when an IT administrator processes a termination ticket in ServiceNow; tickets are often delayed or missed for seasonal workers.",
  }) as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const comply = duties.find((x) => x.key === "il_bipa.15a_comply_with_schedule");
  assertEquals(comply!.verdict, "not_satisfied");
});

Deno.test("B3 — a trigger field that is ONLY a scoped denial, nothing else, still denies", () => {
  const d = buildBiometricDeliverables(ilIntake({
    destruction_trigger: "No trigger is defined for inter-site transfers.",
  }) as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const comply = duties.find((x) => x.key === "il_bipa.15a_comply_with_schedule");
  assertEquals(comply!.verdict, "record_insufficient");
});

Deno.test("B3 — a clean operative trigger with no denial anywhere still satisfies (no over-correction)", () => {
  const d = buildBiometricDeliverables(ilIntake({
    destruction_trigger: "Automated deletion runs nightly; any template past its 30-day post-termination window is purged.",
  }) as never) as unknown as Bag;
  const duties = (d.duty_findings as Bag[]) ?? [];
  const comply = duties.find((x) => x.key === "il_bipa.15a_comply_with_schedule");
  assertEquals(comply!.verdict, "satisfied");
  assert(!String(comply!.application).includes("narrower gap"));
});
