// BATCH ee860fd0 (2026-09-14) — /all-ptest agreed fixes for cppa-risk
// (run 2026-09-13, Online & Web Services, document b26fbf0a / Verilink).
// Thirteen items, each fixed identically in both `_local` mirrors
// (run-cppa-risk-assessment-v2 and ltp-risk-doc-gen):
//
//   unmapped-admt-ledger-credit        § 3.E credits § 4.A only for a keyed safeguard
//   matrix-extraction-fragments        Appendix A cells: no colon lead-ins, balanced quotes
//   training-data-status-conflict      Appendix E "No" vs PI-training narrative
//   incorrect-section-cross-reference  "Sections 2 and 3", not "II and III"
//   approval-date-recharacterization   earlier approval date is not reclassified
//   automatic-collection-consumer-act  entry-point triggers are named, no "no act" claim
//   admt-record-completeness           assumptions/limitations claim gated; areas named
//   retention-record-reconciliation    category criteria first; coherence gated
//   unsupported-retention-fallback     overall statement covers only what it names
//   recommendations-as-conditions      dependency clause names conditions only
//   unassessed-reputational-harm       "Not yet assessed" is not "no risk"
//   incomplete-necessity-coverage      necessity built from the full inventory
//   choice-risk-status-conflict        unconfirmed design facts, one vocabulary

import { assert, assertEquals, assertStringIncludes, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const VERILINK = JSON.parse(
  Deno.readTextFileSync(new URL("../fixtures/batch-ee860fd0/verilink.json", import.meta.url)),
) as Bag;
const B1 =
  "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const REPORT = { scope_and_triggers: { narrative: [B1] } };
const DATE = "2026-09-13";

const ADMT_TESTED_SAFEGUARD: Bag = {
  harm: "(E) Economic harms",
  risk_pathway_ids: ["(E) Economic harms"],
  safeguard: "Quarterly bias and accuracy testing of the interest-classification model against protected-class proxies, with results reviewed by the privacy team.",
  safeguard_status: "Implemented and tested",
};

for (const mirror of ["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen"]) {
  const engineMod = await import(`../../../supabase/functions/${mirror}/_local/ltp/risk-factor-engine.ts`);
  const asmMod = await import(`../../../supabase/functions/${mirror}/_local/ltp/risk-skeleton-assemble.ts`);
  const {
    runRiskFactorEngine,
    extractNecessity,
    buildNecessityMatrixTable,
    buildRiskAndSafeguardRegisterTable,
  } = engineMod;
  const { assembleRiskSkeletonDocument, matrixDeterminationSentence, firstSubstantiveSentenceQuoteAware } = asmMod;

  const engine = (over: Bag = {}) => runRiskFactorEngine({ ...VERILINK, ...over } as never, REPORT as never, DATE);
  const doc = (over: Bag = {}) => assembleRiskSkeletonDocument(REPORT as never, { ...VERILINK, ...over } as never);
  const docText = (over: Bag = {}) => skeletonDocumentToText(doc(over).document);
  const followUps = (r: { blocks: Record<string, string> }) => r.blocks["iv_determination:12"] ?? "";
  const conditions = (r: { blocks: Record<string, string> }) => r.blocks["iv_determination:11"] ?? "";
  const tableRows = (d: ReturnType<typeof assembleRiskSkeletonDocument>, titlePrefix: string): string[][] => {
    const sec = d.document.sections.find((x: { title: string }) => x.title.startsWith(titlePrefix));
    return (sec?.paragraphs ?? []).flatMap((p: { kind: string; table?: { rows: string[][] } }) => p.kind === "table" ? p.table!.rows : []);
  };

  // ── unmapped-admt-ledger-credit ──────────────────────────────────────────

  Deno.test(`ee860fd0 [${mirror}] — ADMT testing confirmed with no ADMT-keyed ledger safeguard: § 3.E claims no § 4.A credit`, () => {
    const t = engine().factors["admt_testing_analysis"] ?? "";
    assert(!t.includes("safeguard credit in § 4.A"), t);
    assert(!t.includes("carries weight in that ledger"), t);
    assertStringIncludes(t, "this record is noted but produces no separate credit in the § 4.A ledger");
  });

  // DOC 261 (targeted revert): no ledger safeguard is ever keyed to the
  // testing record by reading its text — a testing-shaped safeguard row
  // still draws no "rests on that record" claim.
  Deno.test(`ee860fd0 [${mirror}] — a testing-shaped safeguard row still draws no § 4.A credit claim; unconfirmed testing states no keyed safeguard; no ADMT ⇒ no § 3.E sentence`, () => {
    const r = engine({ a6_safeguards: [...(VERILINK.a6_safeguards as Bag[]), ADMT_TESTED_SAFEGUARD] });
    assert(!(r.factors["admt_testing_analysis"] ?? "").includes("rests on that record"));
    const gaps = engine({ admt_testing_facts: ["Tested for accuracy or validity"] });
    assertStringIncludes(gaps.factors["admt_testing_analysis"] ?? "", "No safeguard in the § 4.A ledger is keyed to this testing record");
    const none = engine({ q18_admt_use: "No", admt_testing_facts: [] });
    assertEquals(none.factors["admt_testing_analysis"], undefined);
  });

  // ── matrix-extraction-fragments ──────────────────────────────────────────

  Deno.test(`ee860fd0 [${mirror}] — Appendix A processing-method cell is the cross-reference sentence, never "…sequence:\\nEntry."`, () => {
    const rows = tableRows(doc(), "Appendix A");
    const cell = rows.find((r) => r[0] === "Processing methods and coherence")![1];
    assertEquals(cell, "As the Company describes it, the processing runs as one sequence, recorded in § 2.B.");
  });

  Deno.test(`ee860fd0 [${mirror}] — every Appendix A cell has balanced quotation marks and no colon or bare-label ending`, () => {
    const rows = tableRows(doc(), "Appendix A");
    assert(rows.length > 10, "matrix rendered");
    for (const r of rows) {
      const cell = r[1];
      assertEquals((cell.match(/“/g) ?? []).length, (cell.match(/”/g) ?? []).length, `unbalanced “ ” in: ${cell}`);
      assertEquals((cell.match(/"/g) ?? []).length % 2, 0, `unbalanced " in: ${cell}`);
      assert(!/:\s*$/.test(cell), `ends with a colon: ${cell}`);
      assert(!/\n\w+\.$/.test(cell), `ends with a bare label: ${cell}`);
    }
    const prior = rows.find((r) => r[0] === "Prior DPIA or other assessment")![1];
    assertStringIncludes(prior, "…”.");
  });

  Deno.test(`ee860fd0 [${mirror}] — a single-sentence determination is extracted verbatim; a stop inside an open quote is not a boundary`, () => {
    assertEquals(matrixDeterminationSentence("x", "One plain sentence."), "One plain sentence.");
    assertEquals(
      firstSubstantiveSentenceQuoteAware("Lead: “First part. Second part”. Next sentence."),
      "Lead: “First part. Second part”.",
    );
  });

  // ── training-data-status-conflict ────────────────────────────────────────

  // DOC 261 (targeted revert): the structured answer renders as given; the
  // narrative-PI qualifier is withdrawn (free-text inference). "Unknown" is
  // never converted to "No".
  Deno.test(`ee860fd0 [${mirror}] — the § 7153 training row renders the Company's structured answer as given ("No" / "Yes" / "Unknown")`, () => {
    const row = (over: Bag = {}) => tableRows(doc(over), "Appendix E").find((r) => r[0] === "§ 7153 — trained using personal information");
    assertEquals(row()![1], "No");
    assertEquals(row({ i5_admt_training_source: "" })![1], "No");
    assertEquals(row({ admt_provider_trained_using_pi: "Yes" })![1], "Yes");
    assertEquals(row({ admt_provider_trained_using_pi: "Unknown" })![1], "Unknown");
    assert(!followUps(engine()).includes("Confirm whether the technology was trained using personal information"));
    // § 7153 applicability still turns on its own conditions.
    const made = engine({ admt_made_available_to_other_business: "Yes" });
    assertStringIncludes(made.factors["admt_made_available"] ?? "", "made available to another business");
  });

  // ── incorrect-section-cross-reference ────────────────────────────────────

  Deno.test(`ee860fd0 [${mirror}] — § 4.B references "Sections 2 and 3", and every numbered Section reference resolves to a heading`, () => {
    const d = doc();
    const text = skeletonDocumentToText(d.document);
    assertStringIncludes(text, "Sections 2 and 3");
    assert(!text.includes("Sections II and III"));
    const headings = new Set(
      d.document.sections.map((x: { title: string }) => /^(\d+)\./.exec(x.title)?.[1]).filter(Boolean),
    );
    // Document section references are single Arabic numerals ("Section 4",
    // "Sections 2 and 3"); four-digit "Section 7152" is the regulation.
    for (const m of text.matchAll(/\bSections? (\d)(?: and (\d))?(?![\d.(])/g)) {
      for (const n of [m[1], m[2]].filter(Boolean)) assert(headings.has(n), `Section ${n} referenced but no heading: ${m[0]}`);
    }
    for (const m of text.matchAll(/§ (\d)\.[A-H]\b/g)) assert(headings.has(m[1]), `§ ${m[1]}.x referenced but no heading`);
  });

  // ── approval-date-recharacterization ─────────────────────────────────────

  Deno.test(`ee860fd0 [${mirror}] — an approval date earlier than the report date is not reclassified; both dates and the open version question are stated`, () => {
    const d = doc();
    const all = JSON.stringify(d.document);
    assert(!all.includes("earlier internal review"), "reclassification survived in § 5.A");
    assert(!all.includes("remains to be recorded"), all);
    assertStringIncludes(all, "The Company records approval by Sandra Kole on 2025-06-30. That date precedes the date of this assessment (");
    assertStringIncludes(all, "which version of the assessment it approves, and whether approval of this version is required, remain to be confirmed (§ 7152(a)(9); Follow-Ups, § 4.D).");
    const fu = followUps(engine());
    assertStringIncludes(fu, "Confirm which version of the assessment the recorded approval dated 2025-06-30 applies to, and whether approval of this version is required; that date precedes the date of this assessment (2026-09-13)");
    assert(!fu.includes("prior review record"));
  });

  Deno.test(`ee860fd0 [${mirror}] — a current approval date is stated without qualification; absent ⇒ "no approval date"; expressly prior ⇒ "prior version" language`, () => {
    const current = engine({ a9_approval_date: "2026-09-13" });
    assertStringIncludes(current.factors["approval_sufficiency_conclusion"] ?? "", "reviewed and approved on 2026-09-13");
    assert(!followUps(current).includes("which version of the assessment"));
    const absent = engine({ a9_approval_date: "" });
    assertStringIncludes(followUps(absent), "Record the date the assessment was reviewed and approved");
    const prior = engine({ prior_risk_assessment_date: "2025-06-30" });
    assertStringIncludes(followUps(prior), "the recorded approval date (2025-06-30) is the prior version’s");
    assertStringIncludes(prior.factors["approval_follow_up"] ?? "", "is the prior version’s");
  });

  // ── automatic-collection-consumer-act ────────────────────────────────────

  // DOC 261 (targeted revert): the wording no longer denies a consumer act;
  // the extraction of triggers from the entry-point narrative is withdrawn.
  Deno.test(`ee860fd0 [${mirror}] — automatic source: "without a separate act of supplying the information", never "without a contemporaneous act"; direct-only ⇒ the rule does not fire`, () => {
    const r = engine();
    const t = r.factors["sources_analysis"] ?? "";
    assert(!t.includes("without a contemporaneous act by the consumer"), t);
    assertStringIncludes(t, "gathered without a separate act by the consumer of supplying the information, which raises the weight of the notice and expectation analyses in § 3.C");
    assert(!t.includes("triggered by"));
    assert(!/no consumer (act|interaction)/i.test([r.factors["notice_application"], r.factors["expectation_application"], r.factors["choice_architecture"]].join(" ")));
    const direct = engine({ source_categories: ["Directly from the consumer"] }).factors["sources_analysis"] ?? "";
    assert(!direct.includes("separate act"));
  });

  // ── admt-record-completeness ─────────────────────────────────────────────

  Deno.test(`ee860fd0 [${mirror}] — assumptions/limitations empty ⇒ no "including its assumptions and limitations"; Appendix E names the missing area; Follow-Up exists`, () => {
    const r = engine();
    const logic = r.factors["admt_logic_note"] ?? "";
    assert(!logic.includes("including its assumptions and limitations"), logic);
    assertStringIncludes(logic, "its assumptions and limitations are not recorded and appear among the Follow-Ups in § 4.D");
    assertStringIncludes(followUps(r), "Record the assumptions and limitations of the automated decisionmaking technology’s logic");
    const text = docText();
    assert(!text.includes("five of six"));
    assertStringIncludes(text, "in five of the six record areas the appendix tracks — system description, logic, human review, testing, training data — and does not record the output and use area");
  });

  Deno.test(`ee860fd0 [${mirror}] — all fields populated ⇒ the full sentence and "all six" render; whitespace-only counts as empty`, () => {
    const full = { admt_assumptions_limitations: "Assumes stable interest signals; limited to logged-in users.", admt_output: "Interest-segment labels with confidence scores." };
    const r = engine(full);
    assertStringIncludes(r.factors["admt_logic_note"] ?? "", "including its assumptions and limitations, is preserved in Appendix E");
    assert(!followUps(r).includes("Record the assumptions and limitations"));
    assertStringIncludes(docText(full), "across all six record areas the appendix tracks");
    const blank = engine({ admt_assumptions_limitations: "   " });
    assertStringIncludes(followUps(blank), "Record the assumptions and limitations");
  });

  // ── retention-record-reconciliation ──────────────────────────────────────

  Deno.test(`ee860fd0 [${mirror}] — category criteria are stated verbatim and the overall criterion is not attributed to them; the coherence sentence is qualified`, () => {
    const t = engine().factors["retention_basis"] ?? "";
    assertStringIncludes(t, "“Statutory or regulatory retention requirement” for “Financial information”");
    assertStringIncludes(t, "“Duration of account / relationship” for “Account log-in or financial-account credentials”");
    assertStringIncludes(t, "“Fixed period from collection” for “Device identifiers (IP, cookies, device IDs)” and “Internet or network activity”");
    assert(!t.includes("Retention remains connected to the Purpose on the information provided"), t);
    assertStringIncludes(t, "the period for “Contact identifiers (name, email, phone)” and “General location (city, region, ZIP, IP-derived)”");
    assertStringIncludes(t, "the scope of the payment or billing processing recorded in the information provided");
    assertStringIncludes(t, "remain to be reconciled (§ 4.D)");
    // DOC 261: no period is read out of the overall statement's text.
    assert(!t.includes("attributed to no recorded category"), t);
  });

  Deno.test(`ee860fd0 [${mirror}] — one shared criterion, no conflict, no open item ⇒ the unqualified sentence; no basis at all ⇒ "cannot be determined"`, () => {
    const clean: Bag = {
      q4_pi_categories: ["Device identifiers (IP, cookies, device IDs)", "Internet or network activity"],
      retention_by_pi_category: [
        { pi_category: "Device identifiers (IP, cookies, device IDs)", retention_criteria: "Fixed period from collection", retention_period: "13 months" },
        { pi_category: "Internet or network activity", retention_criteria: "Fixed period from collection", retention_period: "13 months" },
      ],
      i2_retention_period: "13 months",
      i2_retention_criteria: "Fixed period from collection",
      i2_retention_detail: "",
    };
    const t = engine(clean).factors["retention_basis"] ?? "";
    assertEquals(t, "The Company states the basis for these periods as: “Fixed period from collection”. Retention remains connected to the Purpose on the information provided.");
    const noBasis = engine({
      ...clean,
      retention_by_pi_category: (clean.retention_by_pi_category as Bag[]).map((r) => ({ ...r, retention_criteria: "" })),
      i2_retention_criteria: "",
    }).factors["retention_basis"] ?? "";
    assertStringIncludes(noBasis, "Whether retention remains connected to the Purpose cannot be determined on the information provided");
    // DOC 261: a period mentioned only in the overall statement's text is not
    // read as a conflict (free-text inference withdrawn).
    const extraPeriodInText = engine({ ...clean, i2_retention_period: "13 months; audit logs 36 months" }).factors["retention_basis"] ?? "";
    assertStringIncludes(extraPeriodInText, "Retention remains connected to the Purpose on the information provided.");
  });

  // ── unsupported-retention-fallback ───────────────────────────────────────

  // DOC 261 (targeted revert): the § 2.G fallback never asserts that the
  // overall statement COVERS an uncovered category (whether it does is a
  // reading of narrative text); it states the record — the overall statement
  // is the only retention statement on it — and the Follow-Up asks.
  Deno.test(`ee860fd0 [${mirror}] — an uncovered category under an overall statement is never claimed as "covered"; all categories covered ⇒ the fallback does not fire`, () => {
    const r = engine();
    const t = r.factors["retention_basis"] ?? "";
    assertStringIncludes(t, "A category-specific retention period is not recorded for “Contact identifiers (name, email, phone)” and “General location (city, region, ZIP, IP-derived)”; the Company’s overall retention statement is the only retention statement on the record for them");
    assert(!t.includes("the only period covering"), t);
    assert(!t.includes("does not address"), t);
    assertStringIncludes(followUps(r), "specifically for “Contact identifiers (name, email, phone)” and “General location (city, region, ZIP, IP-derived)”; only the Company’s overall retention statement in § 2.G is on the record for them");
    const rows = r.tables["ii_information:14"]!.rows;
    assertEquals(rows.find((x: string[]) => x[0].startsWith("Contact identifiers"))![1], "No category-specific period recorded — the Company’s overall retention statement is the only retention statement on the record; see the Follow-Ups in § 4.D");
    const covered = engine({ q4_pi_categories: (VERILINK.retention_by_pi_category as Bag[]).map((r) => r.pi_category) });
    assert(!(covered.factors["retention_basis"] ?? "").includes("retention period is not recorded"));
  });

  // ── recommendations-as-conditions ────────────────────────────────────────

  Deno.test(`ee860fd0 [${mirror}] — the § 4.C dependency clause never names recommendations; § 4.D says they do not condition the determination`, () => {
    const withRecs = engine({ recipients: [{ recipient_name_or_category: "DataSphere Analytics", recipient_type: "Third party", contractual_protections: "Unsure", disclosure_purpose: "x", pi_categories_made_available: [] }] });
    assert((withRecs.blocks["iv_determination:13"] ?? "").length > 0, "recommendations expected");
    const det = withRecs.factors["determination_text"] ?? "";
    assert(!/recommendations/i.test(det), det);
    assertStringIncludes(det, "on the conditions in § 4.D being carried out");
    assertStringIncludes(docText(), "the recommendations strengthen the posture without conditioning the determination");
    const zeroRecs = engine();
    assert(!/recommendations/i.test(zeroRecs.factors["determination_text"] ?? ""));
  });

  Deno.test(`ee860fd0 [${mirror}] — zero conditions and zero recommendations ⇒ the clause names safeguards and review only; unfavorable ⇒ no clause`, () => {
    const noCond = engine({
      a6_safeguards: [(VERILINK.a6_safeguards as Bag[])[0]],
      a5_harm_pathways: [(VERILINK.a5_harm_pathways as Bag[])[0]],
      a2_necessity_set: (VERILINK.a2_necessity_set as Bag[]).filter((r) => r.necessity === "Necessary to the stated purpose"),
    });
    assertEquals(noCond.blocks["iv_determination:11"], undefined, "no conditions expected");
    const det = noCond.factors["determination_text"] ?? "";
    assertStringIncludes(det, "It depends on the credited safeguards continuing to operate as described and on the review required in Section 5 taking place on schedule.");
    assert(!det.includes("§ 4.D being carried out"));
    const stop = engine({ a5_harm_pathways: [{ ...(VERILINK.a5_harm_pathways as Bag[])[0], likelihood: "Highly likely", severity: "Severe" }], a6_safeguards: [] });
    assert(!/It depends on the credited safeguards/.test(stop.factors["determination_text"] ?? ""));
  });

  // ── unassessed-reputational-harm ─────────────────────────────────────────

  Deno.test(`ee860fd0 [${mirror}] — (G) "Not yet assessed" is excluded from the no-risk sentence, gets its own sentence, appears in Appendix D and § 4.B, and draws a Follow-Up`, () => {
    const r = engine();
    const paras = r.factors["risk_paragraphs"] ?? "";
    assertStringIncludes(paras, "For (B) Unlawful discrimination on protected characteristics; (D) Coercion or compulsion, including dark patterns; (F) Physical harms; (H) Psychological harms, the Company identifies no risk in the information provided");
    assertStringIncludes(paras, "For (G) Reputational harms, the Company has not yet assessed the category; no conclusion is drawn here, and completion of that assessment appears among the Follow-Ups in § 4.D.");
    assert(!/\(G\) Reputational harms;? [^.]*identifies no risk/.test(paras));
    assertStringIncludes(followUps(r), "Complete the assessment of (G) Reputational harms; the Company records that category as not yet assessed");
    assertStringIncludes(r.factors["factors_against"] ?? "", "— Harm category not yet assessed by the Company: (G) Reputational harms (§ 4.A).");
    const reg = buildRiskAndSafeguardRegisterTable(VERILINK)!.rows.find((x: string[]) => x[0] === "(G) Reputational harms")!;
    assertEquals(reg[3], "Not assessed");
    assertEquals(reg[5], "Not assessed");
    const summary = r.tables["iv_determination:8"]!.rows.map((x: string[]) => x[1]).join(" ");
    assert(!summary.includes("(G)"), "unassessed category must be excluded from the balance summary, not cleared");
  });

  Deno.test(`ee860fd0 [${mirror}] — all Considered-none ⇒ one sentence, no Follow-Up; all Not yet assessed ⇒ no no-risk sentence; missing status ⇒ Not yet assessed; legacy record ⇒ unchanged`, () => {
    const status = (map: Record<string, string>) =>
      (VERILINK.harm_category_review_status as Bag[]).map((x) => ({ ...x, review_status: map[x.harm_category as string] ?? x.review_status }));
    const allNone = engine({ harm_category_review_status: status({ "(G) Reputational harms": "Considered-none" }) });
    assert(!(allNone.factors["risk_paragraphs"] ?? "").includes("has not yet assessed"));
    assert(!followUps(allNone).includes("Complete the assessment of"));
    const allNya = engine({
      harm_category_review_status: (VERILINK.harm_category_review_status as Bag[]).map((x) => ({ ...x, review_status: "Not yet assessed" })),
    });
    assert(!(allNya.factors["risk_paragraphs"] ?? "").includes("identifies no risk in the information provided"));
    const missing = engine({ harm_category_review_status: (VERILINK.harm_category_review_status as Bag[]).filter((x) => x.harm_category !== "(F) Physical harms") });
    assertStringIncludes(missing.factors["risk_paragraphs"] ?? "", "For (F) Physical harms; (G) Reputational harms, the Company has not yet assessed the categories");
    const legacy = engine({ harm_category_review_status: undefined });
    assertStringIncludes(legacy.factors["risk_paragraphs"] ?? "", "(G) Reputational harms; (H) Psychological harms, the Company identifies no risk in the information provided");
  });

  // ── incomplete-necessity-coverage ────────────────────────────────────────

  // DOC 261 (targeted revert): the necessity record is the Company's a2
  // element rows and nothing else — no category is inferred from narrative
  // text. The conclusion now names the elements it counts (kept).
  Deno.test(`ee860fd0 [${mirror}] — the necessity conclusion names the elements it counts and reads only the a2 record; the matrix has one row per a2 element`, () => {
    const n = extractNecessity(VERILINK);
    assertEquals(n.unnecessary.length, 1);
    assertEquals(Object.keys(n).sort(), ["necessary", "total", "unnecessary", "unsure"]);
    const r = engine();
    assertStringIncludes(r.factors["necessity_conclusion"] ?? "", "one element is not shown to be necessary — “Account log-in credentials (email address)” — and that conclusion weighs against the processing in Section 4.");
    assertStringIncludes(conditions(r), "Cease processing, or establish the necessity of, “Account log-in credentials (email address)”.");
    assert(!followUps(r).includes("Record whether “Financial information” is necessary"));
    assertStringIncludes(r.factors["factors_against"] ?? "", "— One element not shown necessary (§ 3.B).");
    assertEquals(buildNecessityMatrixTable(VERILINK)!.rows.length, 4);
  });

  Deno.test(`ee860fd0 [${mirror}] — all elements necessary ⇒ favorable sentence and no condition; no a2 record ⇒ the posture sentence stands`, () => {
    const allNec = engine({
      a2_necessity_set: (VERILINK.a2_necessity_set as Bag[]).map((r) => ({ ...r, necessity: "Necessary to the stated purpose" })),
    });
    assertStringIncludes(allNec.factors["necessity_conclusion"] ?? "", "The necessity analysis supports the information processed");
    assert(!conditions(allNec).includes("Cease processing"));
    const none = engine({ a2_necessity_set: [] });
    assertStringIncludes(none.factors["necessity_landing"] ?? "", "no element-level necessity record");
    assertEquals(none.factors["necessity_conclusion"], undefined);
  });

  // ── choice-risk-status-conflict ──────────────────────────────────────────

  Deno.test(`ee860fd0 [${mirror}] — unconfirmed choice facts with (D) none-identified: no "live interference risk", § 4.A carries the (D) cross-reference, and a Follow-Up exists`, () => {
    const r = engine();
    const c = r.factors["choice_architecture"] ?? "";
    assert(!c.includes("live interference risk"), c);
    assertStringIncludes(c, "treated as an unconfirmed design fact: no interference risk is identified in category (D) (§ 4.A), but the assessment relies on the choice architecture only to the confirmed extent, and confirmation appears among the Follow-Ups in § 4.D");
    assertStringIncludes(r.factors["risk_paragraphs"] ?? "", "— as to (D), subject to the unconfirmed design facts noted in § 3.C.");
    assertStringIncludes(followUps(r), "Confirm the choice-architecture fact not confirmed in the information provided — the absence of steering design elements");
  });

  Deno.test(`ee860fd0 [${mirror}] — all confirmed ⇒ neither qualifier; an identified (D) risk ⇒ "identified" language; (D) not yet assessed ⇒ routed to the unassessed handling; none confirmed ⇒ same vocabulary`, () => {
    const all = engine({ choice_architecture_check: Object.keys({
      "Consent or permission requests are presented symmetrically — declining is as easy as accepting": 1,
      "Declining the processing does not degrade the core service the consumer seeks": 1,
      "The Company does not use design elements that steer consumers toward permitting the processing": 1,
    }) });
    assert(!(all.factors["choice_architecture"] ?? "").includes("unconfirmed"));
    assert(!(all.factors["risk_paragraphs"] ?? "").includes("subject to the unconfirmed design facts"));
    const dRisk = engine({
      a5_harm_pathways: [...(VERILINK.a5_harm_pathways as Bag[]), { harm: "(D) Coercion or compulsion, including dark patterns", likelihood: "Possible", severity: "Moderate", data_involved: "x", actor: "y", source: "z", cause: "w" }],
    });
    assertStringIncludes(dRisk.factors["choice_architecture"] ?? "", "each bears on the risk the Company identifies in category (D), assessed in § 4.A");
    const dNya = engine({
      harm_category_review_status: (VERILINK.harm_category_review_status as Bag[]).map((x) =>
        x.harm_category === "(D) Coercion or compulsion, including dark patterns" ? { ...x, review_status: "Not yet assessed" } : x
      ),
    });
    assertStringIncludes(dNya.factors["choice_architecture"] ?? "", "category (D) has not yet been assessed by the Company (§ 4.A)");
    assert(!(dNya.factors["risk_paragraphs"] ?? "").includes("subject to the unconfirmed design facts"));
    const noneConf = engine({ choice_architecture_check: ["None of the above can be confirmed"] });
    const c = noneConf.factors["choice_architecture"] ?? "";
    assert(!c.includes("live interference risk"), c);
    assertStringIncludes(c, "Each is treated as an unconfirmed design fact");
  });
}

// The citation-range guard lives in the ADMT assembler; its risk-side
// counterpart is the Appendix A cell hygiene above. assertThrows is imported
// for symmetry with the ADMT battery and exercised there.
void assertThrows;
