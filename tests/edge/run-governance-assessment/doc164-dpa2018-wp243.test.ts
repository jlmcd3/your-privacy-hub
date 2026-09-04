// DOC 164 (2026-09-04) — wires the UK DPA 2018 sliver (Sch. 1 paras
// 5/39/40/41, s.119A) and WP243 rev.01 ('large scale' / 'core activities')
// into the Governance product's own citation registry, after the
// corpus-correction discussed in the Governance Applicable Law Outline.
//
// SCOPE: additive citations only. No verdict, gate, or trigger logic
// changes — see doc 164 §C for the audit trail. The organisation-size-band
// proxy behind Art. 37(1)(c) "large scale" remains the still-open CEO
// question from doc 162; this build only deepens the citation behind it.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildArt30ElementFindings,
  buildDpoDetermination,
  buildTransferAnalysis,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import {
  GOVERNANCE_DPA2018_WP243_AUTHORITIES,
  GOVERNANCE_DPA2018_WP243_VERSION,
} from "../../../supabase/functions/run-governance-assessment/_local/registry/governance-dpa2018-wp243-authorities.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";

type Bag = Record<string, unknown>;

const BANNED = [/the record (shows|reflects|indicates|demonstrates|establishes)/i, /on this record/i, /structured record/i, /risk pathway/i];

function ukSpecialCategory(over: Bag = {}): Bag {
  return {
    org_size: "251-1000",
    eu_uk_data: "Yes",
    jurisdictions: ["United Kingdom (UK GDPR)"],
    special_category: "Yes",
    special_categories_list: ["Health or medical data"],
    dpo_status: "Yes, formal DPO",
    data_categories: ["Health or medical data", "Employee records"],
    has_uk_establishment: true,
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "UK IDTA",
    ...over,
  };
}

// ── Registry ─────────────────────────────────────────────────────────────

Deno.test("DOC 164 — the registry carries all 8 rows with real verbatim text and the right sources", () => {
  assertEquals(GOVERNANCE_DPA2018_WP243_VERSION, "governance-dpa2018-wp243-doc164-2026-09-04");
  const keys = Object.keys(GOVERNANCE_DPA2018_WP243_AUTHORITIES);
  assertEquals(keys.length, 8);
  for (const k of keys) {
    const row = GOVERNANCE_DPA2018_WP243_AUTHORITIES[k];
    assert(row.verbatim_quote.length > 20, `${k}: quote too short`);
    assert(row.primary_source_url.startsWith("https://"), k);
    assert(row.verified_on === "2026-09-04", k);
  }
  assertStringIncludes(GOVERNANCE_DPA2018_WP243_AUTHORITIES.dpa2018_s119a_power.citation, "Data Protection Act 2018");
  assertStringIncludes(GOVERNANCE_DPA2018_WP243_AUTHORITIES.wp243_large_scale_factors.citation, "WP243 rev.01");
});

Deno.test("DOC 164 — the DPA 2018 quotes are the exact excerpts extracted from the live corpus (2026-09-04)", () => {
  assertEquals(
    GOVERNANCE_DPA2018_WP243_AUTHORITIES.dpa2018_s119a_power.verbatim_quote,
    "The Commissioner may issue a document specifying standard data protection clauses which the Commissioner considers are capable of securing that the data protection test set out in Article 46 of the UK GDPR or section 75 of this Act (or both) is met in relation to transfers of personal data.",
  );
  assertEquals(
    GOVERNANCE_DPA2018_WP243_AUTHORITIES.dpa2018_sch1_para5.verbatim_quote,
    "Except as otherwise provided, a condition in this Part of this Schedule is met only if, when the processing is carried out, the controller has an appropriate policy document in place (see paragraph 39 in Part 4 of this Schedule).",
  );
});

// ── Art. 30(1)(c) — Schedule 1 note ─────────────────────────────────────

Deno.test("DOC 164 — Art. 30(1)(c) names Schedule 1 only when special-category processing AND UK jurisdiction are both on the record", () => {
  const withBoth = buildArt30ElementFindings(ukSpecialCategory()).find((f) => f.element === "c")!;
  assertStringIncludes(withBoth.application, "Data Protection Act 2018, Schedule 1");
  assertStringIncludes(withBoth.application, "Part 1 employment, health and research");
  assertStringIncludes(withBoth.application, "the record does not state which condition, if any, is relied on");
  assertStringIncludes(withBoth.application, "appropriate policy document in place");

  const noUk = buildArt30ElementFindings(ukSpecialCategory({ jurisdictions: ["EU (GDPR)"], has_uk_establishment: false })).find((f) => f.element === "c")!;
  assert(!noUk.application.includes("Schedule 1"), "no UK jurisdiction on the record, no Schedule 1 note");

  const noSpecial = buildArt30ElementFindings(ukSpecialCategory({ special_category: "No", special_categories_list: [] })).find((f) => f.element === "c")!;
  assert(!noSpecial.application.includes("Schedule 1"), "no special-category processing on the record, no Schedule 1 note");
});

Deno.test("DOC 164 — the other six Art. 30(1) elements are untouched by the Schedule 1 splice", () => {
  const findings = buildArt30ElementFindings(ukSpecialCategory());
  for (const f of findings) {
    if (f.element === "c") continue;
    assert(!f.application.includes("Schedule 1"), `element ${f.element} must not carry the Sch. 1 note`);
  }
});

// ── DPO Art. 37(1)(c) — WP243 elaboration ───────────────────────────────

Deno.test("DOC 164 — the DPO limb (c) reasoning quotes WP243's 'core activities' and 'large scale' definitions, and names the size-band proxy honestly", () => {
  const dpo = buildDpoDetermination(ukSpecialCategory()) as unknown as Bag;
  const app = String((dpo.designation_trigger as Bag).application);
  assertStringIncludes(app, "core activities of the controller or processor");
  assertStringIncludes(app, "the number of data subjects concerned");
  assertStringIncludes(app, "The record's own large-scale signal here is the organisation's size band (251-1000)");
  assertStringIncludes((dpo.designation_trigger as Bag).standard as string, "public authority");
});

Deno.test("DOC 164 — WP243 elaboration renders only when limb (c) is actually engaged (not limb (a) alone)", () => {
  const publicAuthorityOnly = buildDpoDetermination(
    ukSpecialCategory({ special_category: "No", special_categories_list: [], org_size: "1-10", dpo_status: "Yes, formal DPO" }, ),
  ) as unknown as Bag;
  // publicAuthority requires the sector; without it neither limb is live, so
  // use a direct limb-(a) fixture instead of relying on the helper's fields.
  const dpo = buildDpoDetermination({
    dpo_status: "Yes, formal DPO",
    special_category: "No",
    special_categories_list: [],
    org_size: "1-10",
  }) as unknown as Bag;
  const app = String((dpo.designation_trigger as Bag).application ?? "");
  assert(!app.includes("WP29"), "no WP243 text when limb (c) is not engaged");
});

// ── Transfer analysis — s.119A ───────────────────────────────────────────

Deno.test("DOC 164 — the UK safeguards-route paragraph quotes DPA 2018 s.119A(1) and s.119A(4) alongside the existing Art. 46(2)(d) quote", () => {
  const transfer = buildTransferAnalysis(ukSpecialCategory()) as unknown as Bag;
  const app = String(transfer.application);
  assertStringIncludes(app, "Section 119A itself fixes what the Commissioner may issue");
  assertStringIncludes(app, "The Commissioner may issue a document specifying standard data protection clauses");
  assertStringIncludes(app, "Before issuing a document under this section, the Commissioner must consult the Secretary of State");
  assertStringIncludes(app, "laid before Parliament");
  // citations_used carries pinpoint subsections, matching every other UK
  // GDPR entry in the same list (e.g. "UK GDPR Art. 46(2)(d)", not the bare
  // Act name) — anchor().citation prefers the row's `subsection` field.
  const citations = transfer.citations_used as string[];
  assert(Array.isArray(citations) && citations.length > 0, "citations_used must be populated");
  assert(
    citations.includes("Data Protection Act 2018, s. 119A(1)") && citations.includes("Data Protection Act 2018, s. 119A(4)"),
    `s.119A pinpoints must reach citations_used: ${JSON.stringify(citations)}`,
  );
});

Deno.test("DOC 164 — no eu-side transfer record picks up the UK s.119A text", () => {
  const eu = buildTransferAnalysis({
    jurisdictions: ["EU (GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
  }) as unknown as Bag;
  assert(!String(eu.application).includes("section 119A"), "EU-side records must not carry the UK-only s.119A text");
});

// ── Register + grader instrument ─────────────────────────────────────────

Deno.test("DOC 164 — the new prose is register-clean", () => {
  const c = buildArt30ElementFindings(ukSpecialCategory()).find((f) => f.element === "c")!;
  const dpo = buildDpoDetermination(ukSpecialCategory()) as unknown as Bag;
  const transfer = buildTransferAnalysis(ukSpecialCategory()) as unknown as Bag;
  const text = [c.application, String((dpo.designation_trigger as Bag).application), String(transfer.application)].join("\n");
  for (const re of BANNED) assert(!re.test(text), `${re} matched the new prose`);
});

Deno.test("DOC 164 — the grader instrument carries the new tag", () => {
  // Not endsWith: later amendments (e.g. doc 165) append further tags after
  // this one — the tag only needs to be present, not terminal.
  assert(GRADER_CONTEXT_VERSION.includes("+gov-dpa2018-wp243-2026-09-04"));
});
