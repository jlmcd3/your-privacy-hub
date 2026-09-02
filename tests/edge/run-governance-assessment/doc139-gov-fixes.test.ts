// DOC 139 (2026-09-02) — two confirmed Governance bugs.
//
// FIX 1: the subtitle unconditionally claimed "the GDPR and UK GDPR"
// regardless of whether the intake's jurisdictions ever named the UK. A
// record scoped to "EU (GDPR)" and "Other" (no UK) still got a title
// asserting UK GDPR coverage the intake never established. The ICO
// Accountability Framework crosswalk appendix — itself a UK-regulator-
// specific framework — rendered unconditionally for the same reason.
//
// Root cause: GOVERNANCE_SKELETON_SUBTITLE (governance.spine.ts) was a
// single byte-pinned string with only {organizationName} as a slot; no
// jurisdiction was ever read. The ico_crosswalk section's composed blocks
// (governance-skeleton-assemble.ts) were likewise unconditional strings.
//
// Fix: two ratified spine constants — GOVERNANCE_SKELETON_SUBTITLE_WITH_UK /
// _NO_UK — selected at render time by hasGovernanceUkInScope(intake), the
// same pattern DPIA's readDpiaRegime()/DPIA_SKELETON_SUBTITLE_EU/_UK
// selection already uses. The ico_crosswalk composed blocks and table are
// gated on the same flag, relying on the renderer's existing NO-PADDING LAW
// (an empty composed string / null table drops the whole section, same as
// any other honestly-absent block).
//
// FIX 2: the crosswalk's own "Leadership and oversight" (DPO) row read a
// blunt roll-up verdict through verdictPhrase(), producing a blanket "the
// DPO determination is evidenced on the information provided" even when the
// DOC 137-corrected body (2026-09-01) explicitly qualifies that only the
// formal designation is evidenced — the Article 38 operating safeguards and
// three of the five Article 39 tasks are "not independently assessed", not
// evidenced. Fixed by reading the SAME dpo_determination sub-findings the
// body already composes from (buildDpoDetermination, governance-deliverables
// /build.ts) rather than the coarse roll-up alone, for the one roll-up value
// ("satisfied") where the coarse phrasing over-claimed.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleGovernanceSkeletonDocument } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import {
  GOVERNANCE_PROTECTED_FIXED_PROSE,
  GOVERNANCE_SKELETON_CONTENT_HASH,
  GOVERNANCE_SKELETON_CONTENT_HASH_V1,
} from "../../../supabase/functions/run-governance-assessment/_local/prose/plans/governance.spine.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function baseIntake(): Bag {
  return {
    organization_name: "Brightwater Analytics Ltd",
    sector: "SaaS",
    org_size: "51-250",
    data_categories: ["Contact details"],
  };
}

function baseReport(): Bag {
  return {
    readiness_determination: { rating: "partly_evidenced", reasoning: "Some duties are evidenced." },
    accountability_determination: { verdict: "partially_satisfied", reasoning: "Partly evidenced." },
    executive_summary: "The programme is partly evidenced.",
  };
}

Deno.test("DOC 139 — basis-v1 content hash is re-pinned and the old docx-basis value is retained for the audit trail", async () => {
  const text = GOVERNANCE_PROTECTED_FIXED_PROSE.join("\n");
  assertEquals(await sha256(text), GOVERNANCE_SKELETON_CONTENT_HASH);
  assertEquals(
    GOVERNANCE_SKELETON_CONTENT_HASH_V1,
    "e0717aba9ee74a0bef16c22feafd6a5abe39531d59d4db3b5c69fd29b574c92f",
  );
});

Deno.test("DOC 139 FIX 1 — no UK in the intake's jurisdictions: subtitle omits UK GDPR", () => {
  const intake = { ...baseIntake(), jurisdictions: ["EU (GDPR)", "Other"] };
  const res = assembleGovernanceSkeletonDocument(baseReport(), intake);
  assertStringIncludes(res.document.subtitle, "A programme review under the GDPR, prepared for Brightwater Analytics Ltd");
  assert(!res.document.subtitle.includes("UK GDPR"), res.document.subtitle);
});

Deno.test("DOC 139 FIX 1 — no jurisdictions recorded at all: subtitle omits UK GDPR", () => {
  const res = assembleGovernanceSkeletonDocument(baseReport(), baseIntake());
  assertStringIncludes(res.document.subtitle, "A programme review under the GDPR, prepared for Brightwater Analytics Ltd");
  assert(!res.document.subtitle.includes("UK GDPR"), res.document.subtitle);
});

Deno.test("DOC 139 FIX 1 — UK named in the intake's jurisdictions: subtitle keeps UK GDPR", () => {
  for (const uk of ["United Kingdom", "UK", "GB", "United Kingdom (UK GDPR)"]) {
    const intake = { ...baseIntake(), jurisdictions: ["EU (GDPR)", uk] };
    const res = assembleGovernanceSkeletonDocument(baseReport(), intake);
    assertStringIncludes(
      res.document.subtitle,
      "A programme review under the GDPR and UK GDPR, prepared for Brightwater Analytics Ltd",
      `failed for jurisdiction entry "${uk}"`,
    );
  }
});

Deno.test("DOC 139 FIX 1 — no UK in scope: the ICO crosswalk appendix is entirely absent, not just re-labelled", () => {
  const intake = { ...baseIntake(), jurisdictions: ["EU (GDPR)"] };
  const res = assembleGovernanceSkeletonDocument(baseReport(), intake);
  assert(
    !res.document.sections.some((sec) => sec.id === "ico_crosswalk"),
    "the ico_crosswalk section must not render for a non-UK record",
  );
  const text = skeletonDocumentToText(res.document);
  assert(!text.includes("ICO Accountability Framework"), "no ICO framework reference for a non-UK record");
  assert(!text.includes("Information Commissioner"), "no ICO framework reference for a non-UK record");
});

Deno.test("DOC 139 FIX 1 — UK in scope: the ICO crosswalk appendix still renders", () => {
  const intake = { ...baseIntake(), jurisdictions: ["EU (GDPR)", "United Kingdom"] };
  const res = assembleGovernanceSkeletonDocument(
    {
      ...baseReport(),
      dpo_determination: { verdict: "partially_satisfied" },
    },
    intake,
  );
  const sec = res.document.sections.find((x) => x.id === "ico_crosswalk");
  assert(sec, "the ico_crosswalk section must render for a UK-scoped record");
  const text = skeletonDocumentToText(res.document);
  assertStringIncludes(text, "ICO Accountability Framework");
  assertStringIncludes(text, "Leadership and oversight");
});

Deno.test("DOC 139 FIX 2 — a satisfied DPO roll-up no longer prints a blanket 'evidenced' crosswalk row", () => {
  const intake = { ...baseIntake(), jurisdictions: ["United Kingdom"] };
  const res = assembleGovernanceSkeletonDocument(
    { ...baseReport(), dpo_determination: { verdict: "satisfied" } },
    intake,
  );
  const table = res.document.tables?.find((t) => t.title === "ICO Accountability Framework crosswalk");
  assert(table, "expected the crosswalk table to render");
  const dpoRow = table!.rows.find((r) => r[0] === "Leadership and oversight");
  assert(dpoRow, "expected a Leadership and oversight row");
  assert(
    !dpoRow![1].toLowerCase().startsWith("the dpo determination is evidenced"),
    `crosswalk row must not read as a blanket "evidenced" claim: "${dpoRow![1]}"`,
  );
  assertStringIncludes(dpoRow![1], "Formal DPO designation evidenced");
  assertStringIncludes(dpoRow![1], "Article 38 operating safeguards");
  assertStringIncludes(dpoRow![1], "untested Article 39 tasks are not independently assessed");
});

Deno.test("DOC 139 FIX 2 — every other DPO roll-up value is unchanged (still reads through verdictPhrase)", () => {
  const intake = { ...baseIntake(), jurisdictions: ["United Kingdom"] };
  const cases: Array<[string, string]> = [
    ["partially_satisfied", "the dpo determination is partly evidenced on the information provided"],
    ["not_satisfied", "the dpo determination is not evidenced on the information provided"],
    ["not_applicable", "the dpo determination is not applicable on the information provided"],
    ["record_insufficient", "the dpo determination is unresolved on the information provided"],
  ];
  for (const [verdict, expectedLower] of cases) {
    const res = assembleGovernanceSkeletonDocument(
      { ...baseReport(), dpo_determination: { verdict } },
      intake,
    );
    const table = res.document.tables?.find((t) => t.title === "ICO Accountability Framework crosswalk");
    assert(table, `expected the crosswalk table to render for verdict ${verdict}`);
    const dpoRow = table!.rows.find((r) => r[0] === "Leadership and oversight");
    assert(dpoRow, `expected a Leadership and oversight row for verdict ${verdict}`);
    assertEquals(dpoRow![1].toLowerCase(), expectedLower, `verdict ${verdict}`);
  }
});

Deno.test("DOC 139 FIX 2 — no DPO determination at all: honest 'not separately assessed', not a fabricated read", () => {
  const intake = { ...baseIntake(), jurisdictions: ["United Kingdom"] };
  const res = assembleGovernanceSkeletonDocument({ ...baseReport(), dpo_determination: {} }, intake);
  const table = res.document.tables?.find((t) => t.title === "ICO Accountability Framework crosswalk");
  assert(table, "expected the crosswalk table to render");
  const dpoRow = table!.rows.find((r) => r[0] === "Leadership and oversight");
  assert(dpoRow, "expected a Leadership and oversight row");
  assertEquals(dpoRow![1], "Not separately assessed by this report");
});
