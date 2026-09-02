// DOC 142 (2026-09-02) — Art. 34(3) exception state on a high-risk record
// with unresolved protection facts. The Art. 33 analysis lists the
// encryption/unintelligibility and key-compromise facts as unresolved, yet
// the Art. 34 determination flatly asserted "No Article 34(3) limb removes
// the duty" — a contradiction inside one document (live batch, Aster/Maris
// EU runs, 2026-09-02). The high-risk finding is reached without the
// encryption fact (the `highRisk` branch is only entered once the recorded
// facts already clear the bar), so the verdict and urgency stay; only the
// 34(3) sentence becomes conditional and the outstanding protection facts
// are named as the follow-up (`information_needed`). Resolved protection
// states — absent, inadequate (3E9AD759-I2's explanatory clause), and
// adequate (the Art. 34(3)(a) exemption branch) — are unchanged.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildArt34ExemptionAnalysis,
  buildDataSubjectCommunicationDetermination,
  buildSaNotificationDetermination,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

// The live shape: credentials + hostile cause + scale — `highRisk` is true on
// the recorded facts alone, encryption never stated.
const BASE: Bag = {
  organizationName: "Aster Machine B.V.",
  discoveryDateTime: "2026-09-02T06:03",
  cause: "Unauthorized external access / cyberattack",
  dataTypes: ["Names and contact details", "Passwords / credentials"],
  affectedCount: "10,000–100,000",
  jurisdictions: ["Netherlands"],
  contained: "Yes",
  organisationType: "Company",
};

function dsFor(over: Bag = {}) {
  const intake: Bag = { ...BASE, ...over };
  const rsa = buildSaNotificationDetermination(intake);
  const exemptions = buildArt34ExemptionAnalysis(intake);
  return buildDataSubjectCommunicationDetermination(intake, rsa.verdict, exemptions.any_exemption_available);
}

Deno.test("DOC 142: unresolved encryption on a high-risk record makes the 34(3) sentence conditional, keeps the required verdict, and names the follow-up facts", () => {
  const ds = dsFor();
  assertEquals(ds.verdict, "communication_required");
  assertEquals(ds.status, "analysed");
  assertEquals(ds.high_risk_established, true);
  assert(
    !ds.application.includes("No Article 34(3) limb removes the duty"),
    "flat 34(3) claim survived on a record whose protection facts are unresolved",
  );
  assertStringIncludes(ds.application, "Whether an Article 34(3) limb removes the duty is not settled");
  assertStringIncludes(ds.application, "the duty stands unless those outstanding protection facts");
  assertStringIncludes(
    ds.why,
    "required unless the outstanding protection facts establish an Article 34(3) exception",
  );
  assertStringIncludes(
    ds.information_needed ?? "",
    "whether the affected data were encrypted or otherwise rendered unintelligible",
  );
  assertStringIncludes(ds.information_needed ?? "", "encryption key or other means of decryption was compromised");
});

Deno.test("DOC 142: encrypted-all with the key status unrecorded is the narrower unresolved case — the follow-up names only the key-compromise fact", () => {
  const ds = dsFor({ encryptionStatus: "All affected data encrypted / rendered unintelligible" });
  assertEquals(ds.verdict, "communication_required");
  assertStringIncludes(ds.application, "Whether an Article 34(3) limb removes the duty is not settled");
  assertStringIncludes(ds.application, "does not state whether the encryption key or other means of decryption was compromised");
  assertEquals(
    ds.information_needed,
    "whether the encryption key or other means of decryption was compromised.",
  );
});

Deno.test("DOC 142: resolved-absent encryption keeps the current flat/explanatory 34(3) treatment unchanged", () => {
  const ds = dsFor({ encryptionStatus: "No affected data encrypted" });
  assertEquals(ds.verdict, "communication_required");
  assert(!ds.application.includes("is not settled"), "conditional form fired on a resolved-absent record");
  assertStringIncludes(ds.why, "Communication to the affected data subjects is required.");
  assertEquals(ds.information_needed, undefined);
});

Deno.test("DOC 142: keys recorded as compromised keeps 3E9AD759-I2's explanatory clause, not the conditional form", () => {
  const ds = dsFor({
    encryptionStatus: "All affected data encrypted / rendered unintelligible",
    encryptionKeyStatus: "Keys compromised or possibly compromised",
  });
  assertEquals(ds.verdict, "communication_required");
  assertStringIncludes(ds.application, "The Article 34(3)(a) exemption does not remove the duty");
  assert(!ds.application.includes("is not settled"), "conditional form fired on a resolved-inadequate record");
  assertEquals(ds.information_needed, undefined);
});

Deno.test("DOC 142: resolved-adequate encryption still routes to the Article 34(3)(a) exemption branch", () => {
  const ds = dsFor({
    encryptionStatus: "All affected data encrypted / rendered unintelligible",
    encryptionKeyStatus: "Keys not compromised",
  });
  assertEquals(ds.verdict, "communication_excused_by_exemption");
});

Deno.test("DOC 142: the assembled document renders the conditional sentence and the immediate follow-up, and drops the flat 34(3) claim", () => {
  const res = assembleIRSkeletonDocument({}, BASE) as unknown as Bag;
  const full = JSON.stringify(res);
  assertStringIncludes(full, "Whether an Article 34(3) limb removes the duty is not settled");
  assertStringIncludes(full, "required unless the outstanding protection facts establish an Article 34(3) exception");
  assertStringIncludes(full, "The immediate follow-up is to confirm whether the affected data were encrypted");
  assert(
    !full.includes("No Article 34(3) limb removes the duty"),
    "the assembled document still carries the flat 34(3) claim alongside the unresolved Art. 33 facts",
  );
});

Deno.test("DOC 142: the assembled document on a resolved record renders no follow-up line and no conditional form", () => {
  const res = assembleIRSkeletonDocument({}, {
    ...BASE,
    encryptionStatus: "No affected data encrypted",
    encryptionKeyStatus: "Not applicable — no encryption",
  }) as unknown as Bag;
  const full = JSON.stringify(res);
  assert(!full.includes("The immediate follow-up is to confirm"), "follow-up line rendered on a resolved record");
  assert(!full.includes("is not settled"), "conditional form rendered on a resolved record");
});
