// PROMPT 9H.1 (CEO-ruled 2026-08-15) — pinpoint-first Art. 6 resolution,
// ratified regime subtitle constants, pinned-fixture guard.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildLegalBasis } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import {
  DPIA_SKELETON_SUBTITLE_EU,
  DPIA_SKELETON_SUBTITLE_UK,
} from "../../../supabase/functions/_shared/prose/plans/dpia.spine.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/dpia-perfect-pinned.ts";
import { checkPerfectDpiaIntake } from "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts";

// The Harrowgate pinned fixture's ACTUAL secondary_uses text, verbatim.
const HARROWGATE_SECONDARY =
  "Quarterly portfolio pricing calibration: underwriting decisions and their outcomes are analysed each quarter to recalibrate the pricing model. The legal basis for this secondary operation is Article 6(1)(f): the company's legitimate interest in pricing accuracy, a basis stated separately from the contractual basis of the primary operation. The impact of this secondary use on the data subjects, stated separately from its benefit to the company: policyholders would not expect their individual claims records to shape future pricing models after their own policy has ended, and they cannot avoid their records' inclusion in the calibration set while data is retained; the effect on any individual is limited because calibration operates on pseudonymised records and produces no decision about any individual policyholder.";

Deno.test("9H.1 — the pinned fixture's verbatim secondary text is byte-identical to the fixture", () => {
  const harrow = DPIA_PERFECT_PINNED.find((c) =>
    JSON.stringify(c).includes("Quarterly portfolio pricing calibration")
  );
  assert(harrow, "Harrowgate pinned fixture not found");
  // deno-lint-ignore no-explicit-any
  const intake = ((harrow as any).intake ?? (harrow as any).intake_data ?? harrow) as any;
  const found = JSON.stringify(intake).includes(JSON.stringify(HARROWGATE_SECONDARY).slice(1, -1));
  assert(found, "test text is not byte-identical to the pinned fixture's secondary_uses");
});

const BASE = {
  processing_activity_name: "Motor and home underwriting",
  purpose: "To underwrite personal motor and home insurance applications.",
  data_subjects: "Prospective and current policyholders",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Contact details"],
  existing_safeguards: ["Access controls"],
  retention_period: "Seven years from policy end",
  necessity_proportionality:
    "The processing has an impact on the data subjects because it affects the applicants concerned and touches their reasonable expectations.",
};

Deno.test("9H.1 — Harrowgate secondary text resolves 6(1)(f), not 6(1)(b)", () => {
  const findings = buildLegalBasis({
    ...BASE,
    legal_basis_proposed: "Contract (Art. 6(1)(b))",
    secondary_uses: HARROWGATE_SECONDARY,
  });
  assertEquals(findings.length, 2);
  assertEquals(findings[0].article_6_basis, "Contract (Art. 6(1)(b))");
  assert(findings[1].article_6_basis.includes("6(1)(f)"), findings[1].article_6_basis);
  // the three-part test runs for the secondary operation and reports a verdict
  assert(findings[1].legitimate_interests_test, "no three-part test on the secondary operation");
  assert(findings[1].verdict, "no verdict reported for the secondary operation");
});

Deno.test("9H.1 — keyword-only text still resolves (f) through the unchanged fallback", () => {
  const findings = buildLegalBasis({
    ...BASE,
    legal_basis_proposed: "Contract (Art. 6(1)(b))",
    secondary_uses: "Aggregated statistics are produced on the basis of legitimate interests.",
  });
  assert(findings[1].article_6_basis.includes("6(1)(f)"), findings[1].article_6_basis);
});

Deno.test("9H.1 — contract-keyword text with no pinpoint still resolves (b)", () => {
  const findings = buildLegalBasis({
    ...BASE,
    legal_basis_proposed: "Consent (Art. 6(1)(a))",
    secondary_uses: "Renewal quotes are prepared under the contract with the policyholder.",
  });
  assert(findings[1].article_6_basis.includes("6(1)(b)"), findings[1].article_6_basis);
});

Deno.test("9H.1 — pin guard: every pinned perfect fixture still passes closed-loop lint", () => {
  for (const c of DPIA_PERFECT_PINNED) {
    // deno-lint-ignore no-explicit-any
    const intake = ((c as any).intake ?? (c as any).intake_data ?? c) as any;
    const r = checkPerfectDpiaIntake(intake);
    assert(r.ok, `pinned fixture failed lint: ${JSON.stringify(r).slice(0, 400)}`);
  }
});

Deno.test("9H.1 item 2 — subtitle constants are byte-pinned", () => {
  // RE-PIN BATCH 21a (doc 113 S7.2, doc 109 §1.6): spaced hyphen → em dash.
  assertEquals(
    DPIA_SKELETON_SUBTITLE_EU,
    "Prepared under Article 35 GDPR — {name}, for {organizationName}",
  );
  assertEquals(
    DPIA_SKELETON_SUBTITLE_UK,
    "Prepared under Article 35 UK GDPR — {name}, for {organizationName}",
  );
});
