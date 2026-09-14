// BATCH ee860fd0 (2026-09-14) — the CEO decision sheet, implemented as
// recommended and approved ("Implement all", 2026-09-14). cppa-risk items,
// each fixed identically in both `_local` mirrors:
//
//   datasphere-role-remediation          role note on a planned-safeguard condition
//   mandatory-balancing-consequence      § 1.A tracks § 7154(a)'s "goal … restricting or prohibiting"
//   notice-alone-for-unexpected-use      § 7002 Follow-Up for an undisclosed distinct secondary use
//   unsupported-favorable-balance        Step 5 describes the comparator § 4.C applies
//   unsupported-transition-deadline      DOC 252 stands; initiation-date Follow-Up added
//   ongoing-processing-permission        recorded timeline printed; undated ⇒ explicit open timing
//   sensitive-credential-condition       credentials SPI carried as declared; email-only ⇒ Follow-Up
//   information-provider-identification  team-only roster ⇒ § 7152(a)(8) Follow-Up
//   consumer-control-overcredit          § 3.D cross-references (C) where identified

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const VERILINK = JSON.parse(
  Deno.readTextFileSync(new URL("../fixtures/batch-ee860fd0/verilink.json", import.meta.url)),
) as Bag;
const B1 =
  "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const REPORT = { scope_and_triggers: { narrative: [B1] } };
const DATE = "2026-09-13";

const DATASPHERE: Bag = {
  recipient_name_or_category: "DataSphere Analytics",
  recipient_type: "Third party",
  contractual_protections: "Written contract without confirmed CCPA restriction terms",
  disclosure_purpose: "Audience enrichment and cross-site ad targeting on behalf of advertisers",
  pi_categories_made_available: ["Internet or network activity"],
};
const TEAMS_ONLY: Bag = {
  i7_internal_contributors:
    "Product Analytics team (data pipeline design), Ad Operations team (segment configuration and performance review), Privacy & Compliance team (assessment lead and controls review), and Engineering (ML model maintenance).",
  section_7151_operational_participants: [
    { name: "Product Analytics Team", role: "Data pipeline design and feature engineering", processing_responsibility: "Designs and maintains the event-collection pipeline" },
  ],
};
const CONTROLS: Bag = { q7_right_delete: "Automated deletion with confirmation", q9_opt_out: "Yes, prominently on homepage", q10_id_verification: "Documented verification process matching CPPA guidance" };

for (const mirror of ["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen"]) {
  const engineMod = await import(`../../../supabase/functions/${mirror}/_local/ltp/risk-factor-engine.ts`);
  const asmMod = await import(`../../../supabase/functions/${mirror}/_local/ltp/risk-skeleton-assemble.ts`);
  const spine = await import(`../../../supabase/functions/${mirror}/_local/prose/plans/cppa-risk.spine.ts`);
  const { runRiskFactorEngine, thirdPartiesNamedAsServiceProvider, credentialsElementRecordEmailOnly, providersNameIndividuals } = engineMod;
  const { assembleRiskSkeletonDocument, riskConditionName } = asmMod;

  const engine = (over: Bag = {}) => runRiskFactorEngine({ ...VERILINK, ...over } as never, REPORT as never, DATE);
  const followUps = (r: { blocks: Record<string, string> }) => r.blocks["iv_determination:12"] ?? "";
  const conditions = (r: { blocks: Record<string, string> }) => r.blocks["iv_determination:11"] ?? "";
  const docText = (over: Bag = {}) => skeletonDocumentToText(assembleRiskSkeletonDocument(REPORT as never, { ...VERILINK, ...over } as never).document);

  // ── datasphere-role-remediation ──────────────────────────────────────────

  Deno.test(`ceo ee860fd0 [${mirror}] — a planned safeguard naming service-provider terms for a recorded third party carries the § 7053 role note; the safeguard text is untouched`, () => {
    const r = engine({ recipients: [DATASPHERE] });
    const c = conditions(r);
    assertStringIncludes(c, "will incorporate CCPA-required service-provider restrictions; the Notice at Collection will be expanded to cover all collection points” (recorded timeline: Within 12 months) (“DataSphere Analytics” is recorded as a third party; the applicable contract terms are those of 11 CCR § 7053 — see the Follow-Ups) (addresses: (C) Impairment of consumer control over personal information).");
    assertStringIncludes(followUps(r), "Confirm that the written contract with “DataSphere Analytics” carries the CCPA-required restriction terms");
    assertEquals(thirdPartiesNamedAsServiceProvider((VERILINK.a6_safeguards as Bag[])[1].safeguard as string, { recipients: [DATASPHERE] }), ["DataSphere Analytics"]);
    // A service-provider recipient, or a safeguard without service-provider terms, draws no note.
    assertEquals(thirdPartiesNamedAsServiceProvider((VERILINK.a6_safeguards as Bag[])[1].safeguard as string, { recipients: [{ ...DATASPHERE, recipient_type: "Service provider" }] }), []);
    assertEquals(thirdPartiesNamedAsServiceProvider("Contract amendments with DataSphere Analytics will prohibit re-identification.", { recipients: [DATASPHERE] }), []);
    const noRecipients = conditions(engine());
    assert(!noRecipients.includes("recorded as a third party"));
    // The compact head and the syllabus name still resolve past the notes.
    const first = c.split("\n")[1].replace(/^1\. /, "");
    assertEquals(riskConditionName(first, 0), "Planned safeguard — (C) Impairment of consumer control over personal information");
    assertStringIncludes(r.factors["conditions_compact"] ?? "", "Complete implementation of the planned safeguard (two conditions, addressing (C) Impairment of consumer control over personal information and (E) Economic harms)");
  });

  // ── mandatory-balancing-consequence / unsupported-favorable-balance ──────

  Deno.test(`ceo ee860fd0 [${mirror}] — § 1.A tracks § 7154(a)'s own words and Step 5 describes the comparator § 4.C applies; the content hash is re-pinned`, async () => {
    const text = docText();
    assertStringIncludes(text, "Section 7154 states the consequence directly: the goal of the assessment is restricting or prohibiting processing whose risks to consumers’ privacy outweigh its benefits.");
    assert(!text.includes("should be restricted or prohibited"));
    assertStringIncludes(text, "Step 5 — The balance. The strongest benefit established is weighed against the most serious risk remaining after safeguards; every benefit and every remaining risk is recorded in § 4.B, and the determination is rendered on that comparison.");
    assert(!text.includes("Each claimed benefit is weighed against the risks"));
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(spine.RISK_PROTECTED_FIXED_PROSE.join("\n")));
    assertEquals([...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""), spine.RISK_SKELETON_CONTENT_HASH);
  });

  // ── notice-alone-for-unexpected-use ──────────────────────────────────────

  Deno.test(`ceo ee860fd0 [${mirror}] — an undisclosed DISTINCT secondary use draws the § 7002 Follow-Up and the § 3.C pointer; compatible or disclosed uses do not`, () => {
    const r = engine({
      secondary_activities: [
        { name: "Product analytics", purpose: "x", relation_to_primary: "Compatible — supports or extends the primary purpose", disclosed_in_notice: "Yes — disclosed at or before collection" },
        { name: "Data-broker resale of segments", purpose: "y", relation_to_primary: "Distinct — a separate purpose", disclosed_in_notice: "No" },
      ],
    });
    assertStringIncludes(followUps(r), "Determine, for the secondary use recorded as a distinct purpose and not disclosed in the notice (“Data-broker resale of segments”), whether the use is reasonably necessary and proportionate to, and compatible with, the purpose for which the personal information was collected (11 CCR § 7002)");
    assertStringIncludes(r.factors["expectation_application"] ?? "", "raises a purpose-limitation question under 11 CCR § 7002 that notice alone does not resolve; it appears among the Follow-Ups in § 4.D.");
    // The transparency finding itself is unchanged.
    assertStringIncludes(r.factors["expectation_application"] ?? "", "Unexpected processing is not prohibited, but until the notice covers it, the divergence weighs against the processing in Section 4.");
    const compatible = engine({ secondary_activities: [{ name: "Analytics", purpose: "x", relation_to_primary: "Compatible — supports or extends the primary purpose", disclosed_in_notice: "No" }] });
    assert(!followUps(compatible).includes("11 CCR § 7002"));
    const disclosed = engine({ secondary_activities: [{ name: "Resale", purpose: "y", relation_to_primary: "Distinct — a separate purpose", disclosed_in_notice: "Yes — disclosed at or before collection" }] });
    assert(!followUps(disclosed).includes("11 CCR § 7002"));
    assert(!(disclosed.factors["expectation_application"] ?? "").includes("§ 7002"));
  });

  // ── unsupported-transition-deadline ──────────────────────────────────────

  Deno.test(`ceo ee860fd0 [${mirror}] — the DOC 252 pre-2026 inference stands and the record is asked for the current Activity's initiation date; a recorded start date needs no ask`, () => {
    const r = engine();
    assertStringIncludes(followUps(r), "Based on the information provided by the Company, processing began before January 1, 2026 and is ongoing.");
    assertStringIncludes(followUps(r), "Record the date the current Activity’s covered processing began, as distinct from the processing the prior assessment covered; the § 7155(b) transition deadline stated above rests on the record’s indication of a pre-2026 start");
    const dated = engine({ processing_start_date: "2024-03-01" });
    assert(!followUps(dated).includes("as distinct from the processing the prior assessment covered"));
  });

  // ── ongoing-processing-permission ────────────────────────────────────────

  Deno.test(`ceo ee860fd0 [${mirror}] — planned-safeguard conditions print the recorded timeline; an undated condition makes the Result state the open timing`, () => {
    const r = engine();
    assertStringIncludes(conditions(r), "(recorded timeline: Within 12 months) (addresses: (E) Economic harms)");
    assert(!(r.factors["conditions_compact"] ?? "").includes("timing"), "dated conditions draw no timing caveat");
    const undated = engine({
      a6_safeguards: (VERILINK.a6_safeguards as Bag[]).map((g, i) => i === 2 ? { ...g, planned_timeline: "No committed timeline" } : g),
    });
    const compact = undated.factors["conditions_compact"] ?? "";
    assertStringIncludes(compact, "The timing of one of the conditions is not recorded: until a committed timeline is recorded (§ 4.D), the permission to proceed rests on the Company’s own commitment to complete it, and that timing remains an open item.");
    assertStringIncludes(conditions(undated), "Commit an implementation timeline for the planned safeguard recorded without one");
    assert(!conditions(undated).includes("(recorded timeline: No committed timeline)"));
  });

  // ── sensitive-credential-condition ───────────────────────────────────────

  Deno.test(`ceo ee860fd0 [${mirror}] — credentials SPI is carried as declared; an email-only element record draws the § 1798.140(ae)(1)(A) Follow-Up and the § 2.D qualifier`, () => {
    const r = engine();
    assertEquals(credentialsElementRecordEmailOnly(VERILINK), true);
    assertStringIncludes(r.factors["information_profile"] ?? "", "Of those, one is sensitive personal information — Account log-in or financial-account credentials");
    assertStringIncludes(r.factors["information_profile"] ?? "", "the element record for that category names an email address only, and whether access-enabling credentials are processed with it (Cal. Civ. Code § 1798.140(ae)(1)(A)) appears among the Follow-Ups in § 4.D.");
    assertStringIncludes(followUps(r), "Confirm whether the Activity processes account log-in or financial-account information in combination with any required security or access code, password, or credentials allowing access to the account (Cal. Civ. Code § 1798.140(ae)(1)(A))");
    const withPassword = engine({
      a2_necessity_set: [...(VERILINK.a2_necessity_set as Bag[]), { element: "Account log-in credentials (username and password)", necessity: "Necessary to the stated purpose", justification: "Authentication." }],
    });
    assertEquals(credentialsElementRecordEmailOnly({ ...VERILINK, a2_necessity_set: withPassword ? (withPassword as never) && [...(VERILINK.a2_necessity_set as Bag[]), { element: "Account log-in credentials (username and password)" }] : [] }), false);
    assert(!followUps(withPassword).includes("§ 1798.140(ae)(1)(A))"));
    // No element keyed to the category at all ⇒ nothing is asserted either way.
    assertEquals(credentialsElementRecordEmailOnly({ ...VERILINK, a2_necessity_set: (VERILINK.a2_necessity_set as Bag[]).filter((x) => !/log-in/.test(x.element as string)) }), false);
  });

  // ── information-provider-identification ──────────────────────────────────

  Deno.test(`ceo ee860fd0 [${mirror}] — a team-only provider roster draws the § 7152(a)(8) Follow-Up and the § 2.H sentence; named individuals do not`, () => {
    const r = engine(TEAMS_ONLY);
    assertStringIncludes(r.factors["record_providers"] ?? "", "The record identifies teams or functions rather than individuals; § 7152(a)(8) requires the individuals who provided the information to be identified, and completing that record appears among the Follow-Ups in § 4.D.");
    assertStringIncludes(followUps(r), "Identify by name and position the individuals who provided information for this assessment; the record names teams or functions only, and § 7152(a)(8) requires the individuals to be identified (legal counsel who provided legal advice excepted)");
    assertEquals(providersNameIndividuals(TEAMS_ONLY), { anyRecord: true, individuals: false });
    assertEquals(providersNameIndividuals({ i7_internal_contributors: "M. Delgado, VP Consumer Credit; R. Okafor, CISO; T. Nguyen, Privacy Counsel; the store-operations director for POS workflow facts." }), { anyRecord: true, individuals: true });
    assertEquals(providersNameIndividuals({ section_7151_operational_participants: [{ name: "Sandra Kole", role: "Chief Privacy Officer" }] }), { anyRecord: true, individuals: true });
    assertEquals(providersNameIndividuals({}), { anyRecord: false, individuals: false });
    const named = engine({ ...TEAMS_ONLY, i7_internal_contributors: "Marcus Feld, VP Engineering & Data (pipeline facts); the Ad Operations team (segment configuration)." });
    assert(!followUps(named).includes("names teams or functions only"));
    assert(!followUps(engine()).includes("names teams or functions only"), "no provider record ⇒ no ask");
  });

  // ── consumer-control-overcredit ──────────────────────────────────────────

  Deno.test(`ceo ee860fd0 [${mirror}] — credited controls cross-reference the (C) data-flow risk where one is identified; without a (C) risk the sentence is unchanged`, () => {
    const withC = engine(CONTROLS);
    assertStringIncludes(withC.factors["controls_application"] ?? "", "formal and exercisable on the information provided, and each is credited — which weighs in the Company’s favor. Their practical effect on the data flows identified under (C) Impairment of consumer control over personal information is weighed in § 4.A.");
    const noC = engine({ ...CONTROLS, a5_harm_pathways: (VERILINK.a5_harm_pathways as Bag[]).filter((p) => !/^\(C\)/.test(p.harm as string)) });
    const t = noC.factors["controls_application"] ?? "";
    assertStringIncludes(t, "each is credited — which weighs in the Company’s favor.");
    assert(!t.includes("practical effect on the data flows"));
  });
}
