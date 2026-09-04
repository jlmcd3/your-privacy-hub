// DOC 163 (2026-09-03) — Registration: seven audits, model-vs-law map, build.
//
// Pins the designed states of doc 163 §C.1 (R1–R14) against the deterministic
// path: the deliverables builder, the skeleton assembler, the engine, the ICO
// tier resolver, the registry and its approval ledger, the contract and the
// grader instrument. Law verbatim from provision_texts / gdpr_articles.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildBdsg,
  buildRegistrationDeliverables,
  exemptionLabel,
  germanyInScope,
  recordedLargeScale,
} from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import {
  assembleRegistrationSkeletonDocument,
  computeDutyCounts,
  deriveDutyStatusTable,
} from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";
import { runRegistrationAssessment } from "../../../supabase/functions/run-registration-assessment/_local/registration-engine.ts";
import { resolveIcoFeeTier } from "../../../supabase/functions/run-registration-assessment/_local/ico-fee-tier.ts";
import {
  dutyRow,
  REGISTRATION_DUTY_AUTHORITIES,
  REGISTRATION_DUTY_VERSION,
} from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-verified-authorities.ts";
import { findUnapprovedRegistrationCorpusKeys } from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-corpus-approval-ledger.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";
import {
  REGISTRATION_AI_HIGH_RISK_ROLES,
  registrationContract,
} from "../../../supabase/functions/_shared/intake-contracts/registration-assessment.ts";

type Bag = Record<string, unknown>;

const BANNED = [/the record (shows|reflects|indicates|demonstrates|establishes)/i, /on this record/i, /structured record/i, /risk pathway/i];

function ukSmall(over: Bag = {}): Bag {
  return {
    organization_name: "Meridian AI Health",
    organization_country: "GB",
    organization_size: "small",
    employee_count: 25,
    industry: "Healthcare",
    role: "controller",
    processes_personal_data: true,
    has_uk_establishment: true,
    has_eu_establishment: false,
    markets_served: ["UK"],
    is_public_authority: false,
    processes_special_categories: false,
    large_scale_monitoring: false,
    acts_as_data_broker: false,
    sells_or_shares_personal_info: false,
    ...over,
  };
}

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
    markets_served: ["US-CA", "US-VT"],
    acts_as_data_broker: true,
    sells_or_shares_personal_info: true,
    collects_data_not_directly_from_individuals: true,
    has_direct_relationship_with_data_subjects: false,
    sells_or_licenses_brokered_data: true,
    brokered_data_individual_count: 4_200_000,
    brokered_data_revenue_share_pct: 88,
    data_broker_exemption_claimed: "none",
    filing_contact_details_ready: true,
    filing_opt_out_mechanism_documented: true,
    filing_minors_data_practices_documented: true,
    filing_metrics_documented: true,
    filing_rights_instructions_documented: true,
    filing_tx_categories_documented: true,
    filing_tx_credentialing_statement_documented: true,
    filing_tx_breach_count_documented: true,
    processes_children_data: false,
    processes_special_categories: false,
    large_scale_monitoring: true,
    ...over,
  };
}

function det(built: Bag, code: string): Bag {
  const d = (built.determinations as Bag[]).find((x) => x.jurisdiction === code);
  if (!d) throw new Error(`no determination for ${code}`);
  return d;
}

function assemble(intake: Bag) {
  const built = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const engine = runRegistrationAssessment(intake as never);
  const report: Bag = { registration_deliverables: built, obligations_summary: engine.obligations_summary, jurisdictions: engine.jurisdictions };
  const sk = assembleRegistrationSkeletonDocument(report, intake);
  return { built, sk, text: skeletonDocumentToText(sk.document) };
}

// ── Registry and ledger (R5, R8, R9) ─────────────────────────────────────────

Deno.test("DOC 163 — the new registry rows exist, quote the reproduced text, and every corpus key is ledger-approved", () => {
  assertEquals(REGISTRATION_DUTY_VERSION, "registration-duty-doc163-2026-09-03");
  assertStringIncludes(dutyRow("ca_data_broker_exclusions").verbatim_quote, "(4) An entity, or a business associate of a covered entity");
  assertStringIncludes(dutyRow("tx_applicability_exclusions").verbatim_quote, "(3) a federal, state, tribal, territorial, or local governmental entity");
  assertStringIncludes(dutyRow("tx_applicability_exclusions_fcra").verbatim_quote, "Fair Credit Reporting Act");
  assertStringIncludes(dutyRow("tx_applicability_exclusions_glba").verbatim_quote, "Gramm-Leach-Bliley Act");
  assertStringIncludes(dutyRow("vt_activity_exclusions").verbatim_quote, "(iv) providing publicly available information via real-time or near-real-time alert services");
  assertStringIncludes(dutyRow("dpo_trigger_bdsg_de_regardless").verbatim_quote, "regardless of the number of persons employed in processing");
  assertStringIncludes(dutyRow("dpo_publication").verbatim_quote, "communicate them to the supervisory authority");
  assertStringIncludes(dutyRow("uk_dpo_publication").verbatim_quote, "communicate them to the Commissioner");
  assertStringIncludes(dutyRow("uk_dpo_trigger_public_authority").verbatim_quote, "courts and tribunals");
  assertStringIncludes(dutyRow("uk_dpo_trigger_special_categories").verbatim_quote, "pursuant to Article 9 or personal data");
  assertEquals(dutyRow("uk_representative_exemption").corpus_key, "gdpr-articles:uk:27");
  assertEquals(findUnapprovedRegistrationCorpusKeys(REGISTRATION_DUTY_AUTHORITIES), []);
});

// ── R3 — Art. 37(1)(c) reads scale ───────────────────────────────────────────

Deno.test("DOC 163 R3 — special categories without a recorded scale leave branch (c) open, naming core activity and scale", () => {
  const built = buildRegistrationDeliverables(ukSmall({ processes_special_categories: true }) as never) as unknown as Bag;
  const dpo = built.dpo_determination as Bag;
  assertEquals(dpo.verdict, "record_insufficient");
  assertStringIncludes(String(dpo.information_needed), "core activity carried out on a large scale");
  const c = (dpo.findings as Bag[]).find((f) => f.key === "dpo_trigger_special_categories")!;
  assertEquals(c.verdict, "record_insufficient");
  assertStringIncludes(String(c.record_fact), "records no data-subject count");
  assertEquals(recordedLargeScale(ukSmall() as never), null);
});

Deno.test("DOC 163 R3 — special categories at more than 100,000 data subjects engage branch (c); the closing act quotes Art. 37(7)", () => {
  const built = buildRegistrationDeliverables(ukSmall({ processes_special_categories: true, data_subjects_count: 250_000 }) as never) as unknown as Bag;
  const dpo = built.dpo_determination as Bag;
  assertEquals(dpo.verdict, "engaged");
  assertStringIncludes(String(dpo.closing_act), "UK GDPR Art. 37(7) step");
  assertStringIncludes(String(dpo.closing_act), "communicate them to the Commissioner");
  assert((dpo.citations as string[]).includes("UK GDPR Art. 37(7)"));
  assertEquals(recordedLargeScale({ data_subjects_count: 100_000 } as never), false);
  assertEquals(recordedLargeScale({ data_subjects_count: 100_001 } as never), true);
});

Deno.test("DOC 163 R3 — an unanswered special-categories question asks for the answer, not the qualifiers (doc 142 parity)", () => {
  const built = buildRegistrationDeliverables(ukSmall({ processes_special_categories: undefined, large_scale_monitoring: undefined, is_public_authority: undefined }) as never) as unknown as Bag;
  const dpo = built.dpo_determination as Bag;
  assertEquals(dpo.verdict, "record_insufficient");
  assertStringIncludes(String(dpo.information_needed), "whether the organisation processes special categories of personal data or criminal-offence data");
});

// ── R9 — UK records quote the UK instrument ──────────────────────────────────

Deno.test("DOC 163 R9 — a UK-only record cites the UK GDPR's own Art. 37(1) rows", () => {
  const built = buildRegistrationDeliverables(ukSmall({ processes_special_categories: true, data_subjects_count: 250_000 }) as never) as unknown as Bag;
  const findings = (built.dpo_determination as Bag).findings as Bag[];
  assertEquals(findings.map((f) => f.citation), ["UK GDPR Art. 37(1)(a)", "UK GDPR Art. 37(1)(b)", "UK GDPR Art. 37(1)(c)"]);
  assertStringIncludes(String(findings[0].standard), "courts and tribunals");
  assertStringIncludes(String(findings[2].standard), "Article 9 or personal data");
  const uk = (built.representative_determinations as Bag[]).find((r) => r.jurisdiction === "UK")!;
  assertEquals(uk.verdict, "not_applicable");
});

Deno.test("DOC 163 R9 — a live UK representative duty quotes UK GDPR Art. 27(2)(a) and (b) from the UK row", () => {
  const built = buildRegistrationDeliverables(ukSmall({ has_uk_establishment: false, organization_country: "US", large_scale_monitoring: true }) as never) as unknown as Bag;
  const uk = (built.representative_determinations as Bag[]).find((r) => r.jurisdiction === "UK")!;
  assertEquals(uk.verdict, "engaged");
  assertStringIncludes(String(uk.exemption_analysis), "UK GDPR Art. 27(2)(a) disapplies the duty");
  assertStringIncludes(String(uk.exemption_analysis), "UK GDPR Art. 27(2)(b) additionally");
});

// ── R4 — Art. 27(2)(a) grounds ───────────────────────────────────────────────

Deno.test("DOC 163 R4 — special categories without scale leave the Art. 27(2)(a) exemption live; the ask names the three limbs", () => {
  const built = buildRegistrationDeliverables(ukSmall({ has_uk_establishment: false, organization_country: "US", processes_special_categories: true }) as never) as unknown as Bag;
  const uk = (built.representative_determinations as Bag[]).find((r) => r.jurisdiction === "UK")!;
  assertEquals(uk.verdict, "conditional");
  assertStringIncludes(String(uk.application), "special-category processing but not its scale");
  assertStringIncludes(String(uk.information_needed), "whether the processing is occasional");
  assertStringIncludes(String(uk.information_needed), "unlikely to result in a risk");
});

Deno.test("DOC 163 R4 — special categories at the recorded scale defeat the exemption and are named with the count", () => {
  const built = buildRegistrationDeliverables(ukSmall({ has_uk_establishment: false, organization_country: "US", processes_special_categories: true, data_subjects_count: 250_000 }) as never) as unknown as Bag;
  const uk = (built.representative_determinations as Bag[]).find((r) => r.jurisdiction === "UK")!;
  assertEquals(uk.verdict, "engaged");
  assertStringIncludes(String(uk.application), "large-scale special-category processing (250,000 data subjects a year)");
});

// ── R5 — exclusion claims against each state's reproduced text ───────────────

Deno.test("DOC 163 R5 — a HIPAA claim is conditional in California (subdivision (c)(4)) and has no footing in Vermont", () => {
  const built = buildRegistrationDeliverables(usBroker({ data_broker_exemption_claimed: "hipaa_health" }) as never) as unknown as Bag;
  const ca = det(built, "US-CA");
  assertEquals(ca.verdict, "conditional");
  assertEquals((ca.threshold as Bag).exclusion_effect, "conditional");
  assertStringIncludes(String((ca.threshold as Bag).exclusion_analysis), "(subdivision (c)(4))");
  assertStringIncludes(String((ca.open_questions as string[])[0]), "substantiation of the claimed health-data (HIPAA) exclusion for California");
  const vt = det(built, "US-VT");
  assertEquals(vt.verdict, "registrable");
  assertEquals((vt.threshold as Bag).exclusion_effect, "no_footing");
  assertStringIncludes(String((vt.threshold as Bag).exclusion_analysis), "has no footing in Vermont's exclusion text");
  assertEquals(exemptionLabel("hipaa_health"), "health-data (HIPAA)");
});

Deno.test("DOC 163 R5 — Oregon states no exclusion list; Texas's incompletely reproduced list leaves an unlisted family unresolved", () => {
  const built = buildRegistrationDeliverables(usBroker({ markets_served: ["US-OR", "US-TX"], data_broker_exemption_claimed: "insurance" }) as never) as unknown as Bag;
  const or = det(built, "US-OR");
  assertEquals(or.verdict, "registrable");
  assertEquals((or.threshold as Bag).exclusion_effect, "no_footing");
  assertStringIncludes(String((or.threshold as Bag).exclusion_analysis), "state no exclusion list");
  const tx = det(built, "US-TX");
  assertEquals(tx.verdict, "conditional");
  assertEquals((tx.threshold as Bag).exclusion_effect, "unresolved");
  assertStringIncludes(String((tx.threshold as Bag).exclusion_analysis), "omits one subdivision");
});

Deno.test("DOC 163 R5 — 'Not sure' is a question, not a claim: the duty attaches and the question is named", () => {
  const built = buildRegistrationDeliverables(usBroker({ data_broker_exemption_claimed: "unknown" }) as never) as unknown as Bag;
  const ca = det(built, "US-CA");
  assertEquals(ca.verdict, "registrable");
  assertEquals((ca.threshold as Bag).exclusion_effect, "unsure");
  assertStringIncludes(String((ca.threshold as Bag).exclusion_analysis), "The company is not sure whether a statutory exclusion applies");
  assert((ca.open_questions as string[]).some((q) => q.includes("the company is not sure")));
  const { text } = assemble(usBroker({ data_broker_exemption_claimed: "unknown" }));
  assertStringIncludes(text, "that it is not sure whether a statutory exclusion applies");
  assert(!/\bhipaa_health\b|\bunknown\b exclusion/.test(text), "no raw enum token reaches the document");
});

Deno.test("DOC 163 R5 — Tex. § 510.003(b)(3): a governmental entity is outside the Texas chapter", () => {
  const built = buildRegistrationDeliverables(usBroker({ markets_served: ["US-TX"], is_public_authority: true }) as never) as unknown as Bag;
  const tx = det(built, "US-TX");
  assertEquals(tx.verdict, "not_registrable");
  assertStringIncludes(String(tx.headline), "governmental entity on its answers");
  assertEquals((tx.requirement as Bag).verdict, "not_engaged");
  assertStringIncludes(String((tx.requirement as Bag).application), "Tex. Bus. & Com. Code § 510.003(b)");
});

// ── R6 — Texas limb (2) requires revenue ─────────────────────────────────────

Deno.test("DOC 163 R6 — Texas limb (2): a recorded 0 % share defeats it, a blank share leaves it open, a positive share meets it", () => {
  const base = usBroker({ markets_served: ["US-TX"], brokered_data_individual_count: 310_000 });
  const zero = det(buildRegistrationDeliverables({ ...base, brokered_data_revenue_share_pct: 0 } as never) as unknown as Bag, "US-TX");
  assertEquals(zero.verdict, "not_registrable");
  assertEquals(((zero.threshold as Bag).limbs as Bag[])[2].met, false);
  const blank = det(buildRegistrationDeliverables({ ...base, brokered_data_revenue_share_pct: undefined } as never) as unknown as Bag, "US-TX");
  assertEquals(blank.verdict, "record_insufficient");
  assertEquals(((blank.threshold as Bag).limbs as Bag[])[2].met, null);
  assertStringIncludes(String(((blank.threshold as Bag).limbs as Bag[])[2].reasoning), "turns on revenue derived from that data");
  const some = det(buildRegistrationDeliverables({ ...base, brokered_data_revenue_share_pct: 31 } as never) as unknown as Bag, "US-TX");
  assertEquals(some.verdict, "registrable");
});

// ── R7 — filing-content lists equal the reproduced statutes ──────────────────

Deno.test("DOC 163 R7 — the checklists are the statutes' own lists as reproduced; Texas's known-child element turns on the children's-data answer", () => {
  const built = buildRegistrationDeliverables(usBroker({ markets_served: ["US-CA", "US-VT", "US-TX", "US-OR"] }) as never) as unknown as Bag;
  const readiness = built.filing_readiness as Bag[];
  const items = (code: string) => (readiness.find((r) => r.jurisdiction === code)!.items as Bag[]);
  assertEquals(items("US-CA").map((i) => i.intake_key), ["filing_contact_details_ready", "filing_metrics_documented", "filing_minors_data_practices_documented"]);
  assertEquals(items("US-VT").map((i) => i.intake_key), ["filing_contact_details_ready", "filing_opt_out_mechanism_documented"]);
  assertEquals(items("US-OR").length, 1);
  const tx = items("US-TX");
  assertEquals(tx.length, 6);
  const child = tx.find((i) => String(i.item).includes("known child"))!;
  assertEquals(child.required, false);
  assertEquals(child.ready, true);
  assertEquals(readiness.find((r) => r.jurisdiction === "US-TX")!.ready_to_file, true);
  assertStringIncludes(String(readiness.find((r) => r.jurisdiction === "US-VT")!.summary), "as reproduced here");
  const withChildren = buildRegistrationDeliverables(usBroker({ markets_served: ["US-TX"], processes_children_data: true, filing_minors_data_practices_documented: false }) as never) as unknown as Bag;
  const txChild = ((withChildren.filing_readiness as Bag[])[0].items as Bag[]).find((i) => String(i.item).includes("known child"))!;
  assertEquals(txChild.required, true);
  assertEquals(txChild.ready, false);
  assertEquals((withChildren.filing_readiness as Bag[])[0].ready_to_file, false);
});

// ── R8 — BDSG § 38(1) typed ──────────────────────────────────────────────────

Deno.test("DOC 163 R8 — BDSG § 38(1): sentence two engages a broker regardless of headcount; sentence one is conditional at 20, not met below", () => {
  const de = (over: Bag) => ({ ...ukSmall({ organization_country: "DE", has_uk_establishment: false, has_eu_establishment: true, eu_lead_member_state: "DE", markets_served: ["DE"] }), ...over });
  const broker = buildBdsg(de({ employee_count: 12, acts_as_data_broker: true }) as never)!;
  assertEquals(broker.verdict, "engaged");
  assertStringIncludes(broker.headline, "second sentence");
  assertEquals(broker.findings[1].verdict, "engaged");
  assertEquals(broker.findings[0].verdict, "not_engaged");
  const twentyFive = buildBdsg(de({ employee_count: 25 }) as never)!;
  assertEquals(twentyFive.verdict, "conditional");
  assertStringIncludes(String(twentyFive.information_needed), "constantly engaged");
  const twelve = buildBdsg(de({ employee_count: 12 }) as never)!;
  assertEquals(twelve.verdict, "not_engaged");
  assertStringIncludes(twelve.reasoning, "Article 35 limb of the second sentence is not assessed here");
  assertEquals(buildBdsg(ukSmall() as never), null);
  assert(germanyInScope({ organization_country: "US", markets_served: ["DE"] } as never), "a German market brings § 38 in");
});

Deno.test("DOC 163 R8 — the document carries the typed BDSG determination in the Duty-status table, the counts and Section 2", () => {
  const intake = ukSmall({ organization_country: "DE", has_uk_establishment: false, has_eu_establishment: true, eu_lead_member_state: "DE", markets_served: ["DE"], employee_count: 12, acts_as_data_broker: true, sells_or_shares_personal_info: true });
  const { built, sk, text } = assemble(intake);
  const report: Bag = { registration_deliverables: built };
  const row = (deriveDutyStatusTable(report)!.rows).find((r) => r[0].startsWith("Data protection officer — BDSG"))!;
  assertEquals(row[2], "Required on reported facts");
  assert(sk.duty_counts.attached_names.includes("the designation of a data protection officer under BDSG § 38(1) (Germany)"));
  assertStringIncludes(text, "Germany — data protection officer, BDSG § 38(1)");
  assertStringIncludes(text, "regardless of the number of persons employed in processing");
  assertEquals(sk.lead_coherence, []);
});

// ── R1 — the high-risk role ──────────────────────────────────────────────────

Deno.test("DOC 163 R1 — the Art. 49(1) duty is engaged for a provider, not engaged for a private deployer, conditional when unstated", () => {
  const eu = (over: Bag) => ukSmall({ organization_country: "IE", has_uk_establishment: false, has_eu_establishment: true, eu_lead_member_state: "IE", markets_served: ["IE"], uses_ai_systems: true, ai_high_risk: true, ...over });
  const provider = buildRegistrationDeliverables(eu({ ai_high_risk_role: "provider" }) as never).ai_act_registration!;
  assertEquals(provider.verdict, "engaged");
  assertStringIncludes(String(provider.closing_act), "registration itself in the EU database");
  assertEquals(provider.findings[0].verdict, "engaged");
  const deployer = buildRegistrationDeliverables(eu({ ai_high_risk_role: "deployer" }) as never).ai_act_registration!;
  assertEquals(deployer.verdict, "not_engaged");
  assertStringIncludes(deployer.headline, "as its deployer");
  const unsure = buildRegistrationDeliverables(eu({ ai_high_risk_role: "unsure" }) as never).ai_act_registration!;
  assertEquals(unsure.verdict, "conditional");
  const publicBody = buildRegistrationDeliverables(eu({ ai_high_risk_role: "deployer", is_public_authority: true }) as never).ai_act_registration!;
  assertEquals(publicBody.findings[0].citation, "AI Act Art. 49(3)");
  assertEquals(REGISTRATION_AI_HIGH_RISK_ROLES.length, 4);
});

// ── R10 — counts and leads ───────────────────────────────────────────────────

Deno.test("DOC 163 R10 — the Art. 49 determination is counted; counts under ten read as words; the fee carries its own clause", () => {
  const eu = (over: Bag) => ukSmall({ organization_country: "IE", has_uk_establishment: false, has_eu_establishment: true, eu_lead_member_state: "IE", markets_served: ["IE"], uses_ai_systems: true, ai_high_risk: true, ...over });
  const engaged = computeDutyCounts({ registration_deliverables: buildRegistrationDeliverables(eu({ ai_high_risk_role: "provider" }) as never) });
  assertEquals(engaged.ai_act_attached, 1);
  assert(engaged.attached_names.includes("the EU AI Act Article 49(1) registration of the high-risk system"));
  const reserved = computeDutyCounts({ registration_deliverables: buildRegistrationDeliverables(eu({}) as never) });
  assertEquals(reserved.ai_act_attached, 0);
  assert(reserved.reserved >= 1, "a conditional Art. 49 determination is reserved");
  const { text } = assemble(usBroker({ markets_served: ["US-CA", "US-VT"] }));
  assertStringIncludes(text, "two registration duties attach");
  const report: Bag = {
    registration_deliverables: buildRegistrationDeliverables(ukSmall() as never),
    jurisdictions: [{ code: "UK", name: "United Kingdom", obligations: ["ico_fee"], filing_fee_cents: 7800 }],
  };
  const sk = assembleRegistrationSkeletonDocument(report, ukSmall());
  const t = skeletonDocumentToText(sk.document);
  assertStringIncludes(t, "whether the fee has been paid is not recorded in the information supplied");
  assert(!t.includes("No filing is required of"), "an attached fee is an outstanding act, not an all-clear");
});

Deno.test("DOC 163 R10 — a single open designation reads 'it is not a filing item'", () => {
  const { text } = assemble(ukSmall({ organization_country: "US", has_uk_establishment: false, markets_served: ["BG"] }));
  assertStringIncludes(text, "One duty determination remains open above; it is not a filing item");
});

// ── R11 — the Section 1 lead follows the determinations ──────────────────────

Deno.test("DOC 163 R11 — a met definition attaches a duty even where the company does not call itself a broker", () => {
  const intake = usBroker({ acts_as_data_broker: false, markets_served: ["US-CA"] });
  const { sk, text } = assemble(intake);
  assertEquals(sk.duty_counts.broker_states, ["California"]);
  assertStringIncludes(text, "has not described itself as a data broker, but on its answers the California data-broker definition is met and a registration duty attaches there");
  assertStringIncludes(text, "that it does not describe itself as a data broker");
  assertEquals(sk.lead_coherence, []);
});

// ── R12 — ICO tier honesty ───────────────────────────────────────────────────

Deno.test("DOC 163 R12 — one axis fixes a tier only where that axis decides it; otherwise two tiers remain and no amount is asserted", () => {
  const staff300 = resolveIcoFeeTier({ employee_count: 300 });
  assertEquals(staff300.tier, null);
  assertEquals(staff300.possible_tiers, [2, 3]);
  assertEquals(staff300.fee_cents, null);
  assertStringIncludes(String(staff300.fee_range_label), "£78.00 or £3,763.00, depending on turnover");
  assertStringIncludes(staff300.narrative, "Tier 3 requires both turnover above £36 million and more than 250 staff");
  const staff25 = resolveIcoFeeTier({ employee_count: 25 });
  assertEquals(staff25.possible_tiers, [1, 2]);
  assertEquals(resolveIcoFeeTier({ employee_count: 5 }).tier, 1);
  const revenueOnly = resolveIcoFeeTier({ annual_revenue_usd: 100_000_000 });
  assertEquals(revenueOnly.possible_tiers, [2, 3]);
  assertStringIncludes(revenueOnly.narrative, "converted from the recorded annual revenue in US dollars");
  assert(!revenueOnly.narrative.includes("annual_revenue_usd"), "no raw intake key in the card note");
  assertEquals(resolveIcoFeeTier({ employee_count: 300, annual_revenue_usd: 78_000_000 }).tier, 3);
});

Deno.test("DOC 163 R12 — an unresolved tier names its range in the duty name and its ask in the table", () => {
  const report: Bag = {
    registration_deliverables: buildRegistrationDeliverables(ukSmall({ employee_count: 300, organization_size: "large" }) as never),
    jurisdictions: [{ code: "UK", name: "United Kingdom", obligations: ["ico_fee"], filing_fee_cents: null, fee_range_label: "£78.00 or £3,763.00, depending on turnover", fee_tier_ask: "Record the organisation's turnover to fix the tier (Tier 2 (£78.00) or Tier 3 (£3,763.00)), then confirm it via the ICO fee self-assessment before filing" }],
  };
  const counts = computeDutyCounts(report);
  assert(counts.attached_names.includes("the United Kingdom ICO annual data-protection fee (£78.00 or £3,763.00, depending on turnover)"));
  const row = deriveDutyStatusTable(report)!.rows.find((r) => r[0] === "ICO annual data-protection fee")!;
  assertStringIncludes(row[3], "Record the organisation's turnover to fix the tier");
});

// ── R13 — EU/EEA market scope sentence ───────────────────────────────────────

Deno.test("DOC 163 R13 — EU/EEA markets carry the scope sentence on Member State registration statutes", () => {
  const { text } = assemble(ukSmall({ organization_country: "US", has_uk_establishment: false, markets_served: ["BG", "HU", "AU"] }));
  assertStringIncludes(text, "The markets served also name Bulgaria and Hungary. No Member State registration or notification statute is among the authorities relied on in this assessment");
  assertStringIncludes(text, "The markets served also name Australia.");
});

// ── R14 — one resolver: the engine's citations follow the regime ─────────────

Deno.test("DOC 163 R14 — the engine's conditional DPO citation names the UK instrument on a UK-only record and reader labels in its reasons", () => {
  const uk = runRegistrationAssessment({ organization_country: "GB", organization_size: "small", employee_count: 25, processes_personal_data: true, processes_special_categories: true, has_uk_establishment: true, markets_served: ["UK", "US-CO"] });
  assertEquals(uk.obligations_summary.citations, ["UK GDPR Art. 37(1)(c)"]);
  assertStringIncludes(String(uk.obligations_summary.dpo_condition), "Conditional on UK GDPR Art. 37(1)(c)");
  assert(uk.jurisdictions.some((j) => j.why.includes("residents of Colorado (US)")));
  const de = runRegistrationAssessment({ organization_country: "US", organization_size: "small", employee_count: 12, processes_personal_data: true, processes_special_categories: true, markets_served: ["DE"] });
  assertEquals(de.obligations_summary.citations, ["GDPR Art. 37(1)(c)"]);
});

// ── Contract, grader, register ───────────────────────────────────────────────

Deno.test("DOC 163 — the contract carries the new keys and the grader instrument carries the tag", () => {
  const keys = registrationContract.fields.map((f) => f.key);
  for (const k of ["ai_high_risk_role", "filing_tx_categories_documented", "filing_tx_credentialing_statement_documented", "filing_tx_breach_count_documented"]) {
    assert(keys.includes(k), k);
  }
  const role = registrationContract.fields.find((f) => f.key === "ai_high_risk_role")!;
  assertEquals([...(role.options ?? [])], ["provider", "deployer", "both", "unsure"]);
  assert(GRADER_CONTEXT_VERSION.endsWith("+registration-law-map-2026-09-03"));
});

Deno.test("DOC 163 — the designed states render register-clean and conformant across the variants", () => {
  const variants: Bag[] = [
    ukSmall({ processes_special_categories: true }),
    ukSmall({ organization_size: "large", employee_count: 300 }),
    usBroker({ data_broker_exemption_claimed: "hipaa_health" }),
    usBroker({ markets_served: ["US-TX"], brokered_data_individual_count: 310_000, brokered_data_revenue_share_pct: 0, data_broker_exemption_claimed: "unknown" }),
    ukSmall({ organization_country: "DE", has_uk_establishment: false, has_eu_establishment: true, eu_lead_member_state: "DE", markets_served: ["DE", "US"], employee_count: 12, acts_as_data_broker: true, sells_or_shares_personal_info: true, collects_data_not_directly_from_individuals: true, has_direct_relationship_with_data_subjects: false, sells_or_licenses_brokered_data: true, brokered_data_individual_count: 900_000, brokered_data_revenue_share_pct: 70 }),
    ukSmall({ organization_country: "IE", has_uk_establishment: false, has_eu_establishment: true, eu_lead_member_state: "IE", markets_served: ["IE", "UK"], uses_ai_systems: true, ai_high_risk: true, ai_high_risk_role: "provider" }),
  ];
  for (const intake of variants) {
    const { sk, text } = assemble(intake);
    assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
    assertEquals(sk.register_findings, []);
    assertEquals(sk.lead_coherence, []);
    for (const re of BANNED) assert(!re.test(text), `${re} in ${String(intake.organization_name)}`);
    assert(!/\b(hipaa_health|fcra_consumer_reporting|glba_financial|annual_revenue_usd|ai_high_risk_role)\b/.test(text), "no raw tokens");
  }
});
