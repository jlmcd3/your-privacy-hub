// DOC 142 (2026-09-02) — external review (Batch 7), Registration item A2.
//
// Where the Art. 37(1) branch walk leaves the DPO determination open (branch
// (a) cannot be evaluated because the intake never states public-authority
// status), the Duty-status table rendered:
//
//   Data protection officer | GDPR / UK GDPR | Additional information required | —
//
// (live run 19689881, Aster Machine B.V., 2026-09-02). The em-dash appeared
// because buildDpo's open-branch return carried no TOP-LEVEL
// `information_needed` — only the per-branch findings did, and
// deriveDutyStatusTable reads `dpo.closing_act || dpo.information_needed`.
// The Art. 27 representative rows already follow the rule that an open
// determination names the deciding fact, never a dash (A-TEAM S4 RULING
// S2.17a, doc 119). The fix names the concrete missing fact per open branch
// WITHOUT resolving it (doc-138 discipline).
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { deriveDutyStatusTable } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

// Mirrors the Aster Machine B.V. live intake (id 19689881-…): EU+UK
// established, public-authority status never recorded, branches (b)/(c)
// answered in the negative.
const asterLike: Bag = {
  organization_name: "Aster Machine B.V.",
  organization_country: "FR",
  organization_size: "medium",
  employee_count: 370,
  annual_revenue_usd: 72_000_000,
  industry: "Education",
  markets_served: ["FR", "UK"],
  has_eu_establishment: true,
  has_uk_establishment: true,
  // is_public_authority deliberately absent — the open fact.
  large_scale_monitoring: false,
  processes_special_categories: false,
  acts_as_data_broker: false,
  uses_ai_systems: false,
};

function reportFor(intake: Bag): Bag {
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  return { registration_deliverables: d, ...d, obligations_summary: {}, jurisdictions: [] };
}

Deno.test("DOC 142 A2 — an open DPO determination carries a top-level information_needed naming the missing fact", () => {
  const d = buildRegistrationDeliverables(asterLike as never) as unknown as Bag;
  const dpo = d.dpo_determination as Bag;
  assertEquals(dpo.verdict, "record_insufficient");
  const needed = String(dpo.information_needed ?? "");
  assert(needed.length > 0, "top-level information_needed must be set for an open branch walk");
  assertStringIncludes(needed, "whether the organisation is a public authority or body");
  assertStringIncludes(needed, "Art. 37(1)(a)");
  // The fact is NAMED, never resolved: no verdict language about it.
  assert(!/is a public authority\b(?!\s+or body)/.test(needed), needed);
});

Deno.test("DOC 142 A2 — the Duty-status table's Information-required cell names the fact, never a dash", () => {
  const table = deriveDutyStatusTable(reportFor(asterLike));
  assert(table, "duty table must render");
  const dpoRow = table!.rows.find((r) => r[0] === "Data protection officer");
  assert(dpoRow, "DPO row must be present");
  assertEquals(dpoRow![2], "Additional information required");
  assert(dpoRow![3] !== "—", "Information-required cell must not be an em-dash for a pending duty");
  assertStringIncludes(dpoRow![3], "Whether the organisation is a public authority or body");
  assertStringIncludes(dpoRow![3], "Art. 37(1)(a)");
});

Deno.test("DOC 142 A2 — an engaged DPO duty keeps its ratified closing-act cell byte-for-byte", () => {
  const table = deriveDutyStatusTable(
    reportFor({ ...asterLike, large_scale_monitoring: true }),
  );
  const dpoRow = table!.rows.find((r) => r[0] === "Data protection officer");
  assert(dpoRow, "DPO row must be present");
  assertEquals(dpoRow![2], "Required on reported facts");
  assertEquals(dpoRow![3], "Written designation and the Art. 37(7) steps");
});

Deno.test("DOC 142 A2 — every open branch is named when more than one is unanswered", () => {
  const d = buildRegistrationDeliverables(
    {
      ...asterLike,
      large_scale_monitoring: undefined,
      processes_special_categories: undefined,
    } as never,
  ) as unknown as Bag;
  const dpo = d.dpo_determination as Bag;
  assertEquals(dpo.verdict, "record_insufficient");
  const needed = String(dpo.information_needed ?? "");
  assertStringIncludes(needed, "public authority or body");
  assertStringIncludes(needed, "regular and systematic monitoring");
  assertStringIncludes(needed, "special categories");
});

Deno.test("DOC 142 A2 — banned phrases never enter the new strings", () => {
  const d = buildRegistrationDeliverables(asterLike as never) as unknown as Bag;
  const needed = String((d.dpo_determination as Bag).information_needed ?? "");
  for (
    const banned of [
      "the record shows",
      "the record reflects",
      "the record indicates",
      "the record demonstrates",
      "the record establishes",
      "on this record",
    ]
  ) {
    assert(!needed.toLowerCase().includes(banned), `banned phrase "${banned}" in: ${needed}`);
  }
});
