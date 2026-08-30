// BATCH 18b (Wave C1 — doc 111 queue, doc 109 §2.11 items 1–3, doc 113
// Session-2 Part B seam rulings). The Registration broker restructure:
//   S2.11 "table" blocks join the spine; REGISTRATION_SKELETON_PARAGRAPHS
//         untouched (hash recompute pinned here).
//   S2.12 The Filing Calendar — the broker document's centerpiece.
//   S2.13 Quotes print once per state block (kills Vermont ×3 / Texas ×2 /
//         California ×2), cited for each further role.
//   S2.14 The combined definitional limb table (State | Limb | Record | Met?).
//   S2.15 Per-state / per-instrument h3 heading chunks.
//   S2.16 §II split + the Art. 37(1) branch table.
//   S2.17 The readiness checklist table, state names not US-CA codes.
//   S2.18 The attestation seam ("What the attestation still needs is to
//         complete this block…") is fixed: sentence-shaped values verbatim.

import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  REGISTRATION_SKELETON_CONTENT_HASH,
  REGISTRATION_SKELETON_PARAGRAPHS,
} from "../../../supabase/functions/run-registration-assessment/_local/prose/plans/registration.spine.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

function brokerIntake(over: Bag = {}): Bag {
  return {
    organization_name: "Meridian Analytics, Inc.",
    organization_country: "US",
    organization_size: "51-250",
    industry: "Data analytics",
    role: "controller",
    processes_personal_data: true,
    markets_served: ["US", "US-CA", "US-OR", "US-TX", "US-VT"],
    acts_as_data_broker: true,
    sells_or_licenses_brokered_data: true,
    collects_data_not_directly_from_individuals: true,
    has_direct_relationship_with_data_subjects: false,
    brokered_data_individual_count: 250000,
    brokered_data_revenue_share_pct: 80,
    is_public_authority: false,
    approved_by_name: "R. Calloway",
    approved_by_title: "General Counsel",
    ...over,
  };
}

function assemble(intake: Bag) {
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const report: Bag = { registration_deliverables: d, ...d };
  return assembleRegistrationSkeletonDocument(report, intake);
}

function tablesOf(out: ReturnType<typeof assembleRegistrationSkeletonDocument>, sectionId: string) {
  const sec = out.document.sections.find((s) => s.id === sectionId);
  return (sec?.paragraphs ?? []).filter((p) => p.kind === "table" && p.table).map((p) => p.table!);
}

Deno.test("C1/S2.11: REGISTRATION_SKELETON_PARAGRAPHS hash is byte-unchanged by the table blocks", async () => {
  const joined = REGISTRATION_SKELETON_PARAGRAPHS.join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(joined));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assertEquals(hex, REGISTRATION_SKELETON_CONTENT_HASH);
});

Deno.test("C1/S2.12: the Filing Calendar renders as §I's first table with the four registry rows", () => {
  const out = assemble(brokerIntake());
  assertEquals(out.conformance, []);
  assertEquals(out.lead_coherence, []);
  const calendar = tablesOf(out, "data_broker_registration").find((t) => t.title === "Filing calendar");
  assertExists(calendar);
  assertEquals(calendar.columns, ["State", "File with", "Deadline / cycle", "Fee", "Authority", "Status"]);
  assertEquals(calendar.rows.map((r) => r[0]), ["California", "Oregon", "Texas", "Vermont"]);
  const vt = calendar.rows[3];
  assertEquals(vt[1], "Vermont Secretary of State");
  assertEquals(vt[2], "Annually, on or before Jan 31");
  assertEquals(vt[3], "$100.00");
  assertStringIncludes(vt[4], "9 V.S.A. § 2446(a)");
  const tx = calendar.rows[2];
  assertEquals(tx[3], "$300");
  // No stated amount => the typed fee_note's own honest generic.
  assertEquals(calendar.rows[0][3], "Set by the administering body");
});

Deno.test("C1/S2.13: each statutory provision is quoted once per state block and cited for its other roles", () => {
  const out = assemble(brokerIntake());
  const text = skeletonDocumentToText(out.document);
  // Vermont's § 2446(a) sentence used to print three times (duty, timing, fee).
  const VT_QUOTE = "Annually, on or before January 31 following a year in which a person meets the definition";
  assertEquals(text.split(VT_QUOTE).length - 1, 1, "Vermont provision must print exactly once");
  assertStringIncludes(text, "The timing is fixed by the same provision, 9 V.S.A. § 2446(a), quoted above.");
  assertStringIncludes(text, "The fee is fixed by the same provision, 9 V.S.A. § 2446(a) — $100.00 on its face.");
  // California's requirement provision likewise once (its window rides it).
  const CA_QUOTE = "On or before January 31 following each year in which a business meets the definition of data broker";
  assertEquals(text.split(CA_QUOTE).length - 1, 1, "California provision must print exactly once");
  assertStringIncludes(text, "The timing is fixed by the same provision, Cal. Civ. Code § 1798.99.82(a), quoted above.");
  // Texas's fee rides its requirement provision.
  assertStringIncludes(text, "The fee is fixed by the same provision, Tex. Bus. & Com. Code § 510.005(a) — $300 on its face.");
});

Deno.test("C1/S2.14: the combined limb table carries each state's own limbs with tri-state Met?", () => {
  const out = assemble(brokerIntake({ brokered_data_revenue_share_pct: undefined }));
  const limbs = tablesOf(out, "data_broker_registration").find((t) => t.title === "Definitional limbs");
  assertExists(limbs);
  assertEquals(limbs.columns, ["State", "Limb", "Record", "Met?"]);
  assert(limbs.rows.some((r) => r[0] === "California" && r[3] === "Met"));
  assert(limbs.rows.some((r) => r[0] === "Texas" && r[3] === "Not recorded"), "an unevidenced limb reads Not recorded");
  // Oregon's no-carve-out NOTE row is that statute's own, not imported.
  assert(limbs.rows.some((r) => r[0] === "Oregon" && r[1].startsWith("NOTE — Oregon imposes no")));
});

Deno.test("C1/S2.15: per-state and per-instrument units open with h3-shaped heading chunks", () => {
  const out = assemble(brokerIntake({ has_eu_establishment: true, large_scale_monitoring: true }));
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "California — Cal. Civ. Code § 1798.99.80(c)");
  assertStringIncludes(text, "Vermont — 9 V.S.A. § 2430(4)(A)");
  assertStringIncludes(text, "European Union representative — GDPR Art. 27(1)");
  assertStringIncludes(text, "Data protection officer — GDPR Art. 37(1)");
});

Deno.test("C1/S2.16: the Art. 37(1) branch table renders from the typed findings; no verdict is invented", () => {
  const out = assemble(brokerIntake({ has_eu_establishment: true, large_scale_monitoring: true }));
  const branches = tablesOf(out, "supervisory_and_ai_act").find((t) => t.title === "Article 37(1) branches");
  assertExists(branches);
  assertEquals(branches.columns, ["Branch", "Position on the record"]);
  assertEquals(branches.rows.length, 3);
  assertEquals(branches.rows[0][0], "GDPR Art. 37(1)(a)");
});

Deno.test("C1/S2.17: the readiness checklist uses state names, and the US-CA code labels are gone", () => {
  const out = assemble(brokerIntake());
  const checklist = tablesOf(out, "filing_readiness").find((t) => t.title === "Filing content checklist");
  assertExists(checklist);
  assertEquals(checklist.columns, ["Jurisdiction", "Required element", "Recorded?"]);
  assert(checklist.rows.every((r) => !/^US-/.test(r[0])), "no US-CA codes in the checklist");
  assert(checklist.rows.some((r) => r[0] === "California" && r[2] === "No — outstanding"));
  const text = skeletonDocumentToText(out.document);
  assert(!/US-CA\./.test(text), "the US-CA. heading dialect is retired from §III");
  assertStringIncludes(text, "California — Cal. Civ. Code § 1798.99.82(b)(2)");
});

Deno.test("C1/S2.18: the attestation seam renders the drafted sentence, not the garbled wrapper", () => {
  const out = assemble(brokerIntake({ approved_by_name: undefined, approved_by_title: undefined }));
  const text = skeletonDocumentToText(out.document);
  assert(!text.includes("What the attestation still needs is to complete this block"), "the garbled seam resurfaced");
  assertStringIncludes(text, "To complete this block the record must state the name of the person approving this assessment");
});

Deno.test("C1: a non-broker record gets no §I tables and stays conformant", () => {
  const out = assemble({
    organization_name: "Vantecor Analytics GmbH",
    organization_country: "DE",
    industry: "AdTech / MarTech",
    role: "controller",
    processes_personal_data: true,
    markets_served: ["DE", "FR"],
    acts_as_data_broker: false,
    is_public_authority: false,
  });
  assertEquals(out.conformance, []);
  assertEquals(out.register_findings, []);
  assertEquals(tablesOf(out, "data_broker_registration"), []);
});
