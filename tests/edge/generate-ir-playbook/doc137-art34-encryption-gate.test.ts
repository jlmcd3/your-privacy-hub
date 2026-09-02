// DOC 137 (2026-09-01) — Art. 34(1) previously reached a firm
// "communication_not_required_no_high_risk" verdict on any record with
// unresolved encryption, because `unintelligible(f)` is computed but the
// `highRisk` boolean never references it. That is sound when the record
// carries NO HIGH_RISK_DATA_TYPES category at all (highCats.length === 0):
// the formula's hostile-actor/scale terms are gated behind `highCats.length
// > 0`, so encryption cannot change the outcome and the firm "not required"
// conclusion is correct as-is (see ir-art34-honest-basis.test.ts's fixture,
// which is exactly this shape and is deliberately left unchanged here).
//
// The narrow, real gap is the borderline case: exactly one HIGH_RISK_DATA_
// TYPES category recorded (one short of the `highCats.length >= 2` auto-
// trigger) with neither a hostile cause nor scale recorded, AND the
// technical-protection fact never stated at all (`unintelligible(f) ===
// "unknown"`). There, an adverse encryption finding is capable of
// completing the case for a likely HIGH risk on that single category, so a
// firm "not required" conclusion overclaims. build.ts now routes that one
// combination to `undetermined_on_the_record` / `record_insufficient`
// instead, without touching HIGH_RISK_DATA_TYPES or the `highRisk` formula.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildArt34ExemptionAnalysis,
  buildDataSubjectCommunicationDetermination,
  buildSaNotificationDetermination,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";

type Bag = Record<string, unknown>;

function dsFor(over: Bag = {}) {
  const intake: Bag = {
    organizationName: "Nordlys Analytics ApS",
    discoveryDateTime: "2026-08-29T14:00",
    cause: "Ransomware or malware",
    dataTypes: ["Names and contact details"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["Denmark"],
    contained: "Yes",
    organisationType: "Company",
    ...over,
  };
  const rsa = buildSaNotificationDetermination(intake);
  const exemptions = buildArt34ExemptionAnalysis(intake);
  return buildDataSubjectCommunicationDetermination(intake, rsa.verdict, exemptions.any_exemption_available);
}

// (a) Borderline: one HIGH_RISK_DATA_TYPES category, no hostile cause, no
// scale, encryption completely unstated — an adverse encryption finding
// could plausibly complete the high-risk case. Must NOT reach a firm
// "not required" conclusion.
Deno.test("DOC 137: single high-risk category + unresolved encryption + non-hostile, non-scale cause is left pending, not firmly cleared", () => {
  const ds = dsFor({
    cause: "Accidental disclosure",
    dataTypes: ["Health / medical records"],
    affectedCount: "Fewer than 100",
    // no encryptionStatus / encryptionKeyStatus recorded at all
  });
  assertEquals(ds.verdict, "undetermined_on_the_record");
  assertEquals(ds.status, "record_insufficient");
  assertStringIncludes(ds.application, "Health / medical records");
  assertStringIncludes(ds.application, "neither reached nor ruled out");
  assert(
    !ds.application.includes("Article 34(1) is a higher threshold"),
    "fell through to the firm not-required application text",
  );
  assertStringIncludes(
    ds.information_needed ?? "",
    "whether the affected data were encrypted or otherwise rendered unintelligible",
  );
});

// (a2) Same borderline category set, but a hostile cause is ALSO recorded —
// that already trips `highRisk` via the existing formula (highCats.length
// > 0 && hostile), so this must remain "communication_required" and must
// NOT be captured by the new pending gate (order-of-branches regression
// guard: the new `else if` sits after the `highRisk` branch).
Deno.test("DOC 137: single high-risk category + hostile cause is still communication_required (unaffected by the new gate)", () => {
  const ds = dsFor({
    cause: "Ransomware or malware",
    dataTypes: ["Health / medical records"],
    affectedCount: "Fewer than 100",
  });
  assertEquals(ds.verdict, "communication_required");
});

// (b) No high-risk category at all, regardless of hostile cause/scale — this
// is the PANEL-BLOCKER IR-4 / ir-art34-honest-basis.test.ts fixture shape.
// The current firm "not required" conclusion is genuinely correct here
// (highCats.length === 0 makes highRisk mathematically independent of
// encryption), so this must be UNCHANGED — no false-pending regression.
Deno.test("DOC 137: zero high-risk categories keeps the firm not-required conclusion even with unresolved encryption and a hostile cause", () => {
  const ds = dsFor({
    cause: "Ransomware or malware",
    dataTypes: ["Names and contact details"],
    affectedCount: "1,000–10,000",
  });
  assertEquals(ds.verdict, "communication_not_required_no_high_risk");
  assertEquals(ds.status, "analysed");
});

// (c) Encryption AFFIRMATIVELY resolved as secure, with a single high-risk
// category and no hostile cause/scale — the exemption branch (uni === "yes"
// && exemptionAvailable) or, absent exemption availability, the ordinary
// highRisk-false path must still govern; the new "unknown" gate must never
// fire once encryption is actually known.
Deno.test("DOC 137: affirmatively-secure encryption on a single high-risk category is unaffected by the new gate", () => {
  const ds = dsFor({
    cause: "Accidental disclosure",
    dataTypes: ["Health / medical records"],
    affectedCount: "Fewer than 100",
    encryptionStatus: "All affected data encrypted / rendered unintelligible",
    encryptionKeyStatus: "Keys not compromised",
  });
  assert(
    ds.verdict === "communication_excused_by_exemption" || ds.verdict === "communication_not_required_no_high_risk",
    `unexpected verdict with resolved-secure encryption: ${ds.verdict}`,
  );
});

// (c2) Encryption AFFIRMATIVELY resolved as compromised, same borderline
// category set — a known-bad fact, not an unresolved one, so the record
// insufficiency gate must not apply; the existing firm not-required
// application text should run instead.
Deno.test("DOC 137: affirmatively-compromised encryption on a single high-risk category still reaches a firm conclusion, not the pending gate", () => {
  const ds = dsFor({
    cause: "Accidental disclosure",
    dataTypes: ["Health / medical records"],
    affectedCount: "Fewer than 100",
    encryptionStatus: "No affected data encrypted",
  });
  assertEquals(ds.verdict, "communication_not_required_no_high_risk");
  assertEquals(ds.status, "analysed");
});

// (d) Two or more high-risk categories always trips highRisk regardless of
// cause/scale/encryption — must remain "communication_required" and never
// fall into the new pending gate.
Deno.test("DOC 137: two high-risk categories remain communication_required regardless of unresolved encryption", () => {
  const ds = dsFor({
    cause: "Accidental disclosure",
    dataTypes: ["Health / medical records", "Government IDs / SSN"],
    affectedCount: "Fewer than 100",
  });
  assertEquals(ds.verdict, "communication_required");
});
