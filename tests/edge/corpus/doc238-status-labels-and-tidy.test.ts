// DOC 238 §5 item 6 / §5.5.2 / §1.4 FOLLOW-UP (2026-09-09) — THE CROSS-PRODUCT
// PINS for the shared status-label + citation code path.
//
// `deriveSourceStatus` / `citationFor` (generate-corpus-hooks/_local/
// generate.ts) are ONE function each, dispatched for all four products by
// product-registry.ts. Doc 238 found the printed `sa_decision` label matched
// the CEO's approved documents for DPIA only; Risk (doc 234) and ADMT (doc
// 236) print their own approved wording, and LIA's is live-ratified with the
// per-hook ruling still open. The fix is a per-product conventions table
// (`HOOK_PRODUCT_CITATION_CONVENTIONS`) that the shared function consults —
// so the risk this file guards against is exactly the one the brief named:
// a change aimed at Risk/ADMT silently altering LIA's or DPIA's labels.
//
// This file pins, in one place:
//   1. the conventions table's key set == the registry's key set;
//   2. each product's OWN draft/ratified `*_SOURCE_STATUS_LABELS.sa_decision`
//      == what the shared generator derives for that product (the v1
//      fallback and the baked label can never disagree again; LIA/DPIA are
//      the shared text, Risk/ADMT the approved override);
//   3. the SAME source row derives four labels, one per product, and the
//      LIA/DPIA/no-product ones are byte-identical to the pre-override text;
//   4. the FSOR status-clause convention per product (ADMT omits, the rest
//      keep — doc 238 §5.5.2);
//   5. `tidyRenderedSentence` is a byte-for-byte no-op on every CEO-approved
//      paragraph/citation this program has (docs 223B/233/234/236) and on
//      LIA's ratified appeal sentence, is idempotent, and collapses exactly
//      the artifacts an empty slot leaves.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { tidyRenderedSentence } from "../../../supabase/functions/_shared/corpus/hook-render-tidy.ts";
import {
  deriveSourceStatus,
  HOOK_PRODUCT_CITATION_CONVENTIONS,
  type HookProfileRow,
  type HookSourceRow,
} from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { HOOK_PRODUCT_REGISTRY } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { LIA_APPEAL_SENTENCE, LIA_SOURCE_STATUS_LABELS } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts";
import { DPIA_SOURCE_STATUS_LABELS } from "../../../supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-hooks.ts";
import { RISK_SOURCE_STATUS_LABELS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts";
import { ADMT_SOURCE_STATUS_LABELS } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";

const SHARED_SA_DECISION = "supervisory-authority decision — persuasive, non-binding outside its jurisdiction";
const RISK_SA_DECISION_234 = "foreign supervisory-authority decision, cited by analogy — not binding on California regulators";
const ADMT_SA_DECISION_236 = "foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations";
const NO_INPUTS = { appeal_note: null, verified_as_of: null };

/** One GDPR enforcement row, as every product would receive it. */
const enfProfile: HookProfileRow = {
  id: "p-enf",
  source_table: "enforcement_actions",
  source_row_id: "dbfca969-3139-43d1-8a5b-7fff179f8db6", // Garante, Comune di Bolzano — cited in DPIA (doc 233) AND Risk (doc 234)
  outcome_posture: "rejected",
  instrument: "EU GDPR",
  factor_ids: ["x"],
  ratified_by: "ceo",
  ratified_at: "2026-09-09T00:00:00Z",
  ledger_ref: "t",
};
const enfSource: HookSourceRow = { source_table: "enforcement_actions", regulator: "Garante", subject: "Comune di Bolzano", decision_date: "2021-05-13", appeal_status: "unknown" };
const fsorProfile: HookProfileRow = { ...enfProfile, id: "p-fsor", source_table: "cppa_fsor_commentary", source_row_id: "7f616c44-b6f9-43b0-9891-1fdbd501bffc", instrument: "CPPA ADMT Regulations" };
const fsorSource: HookSourceRow = { source_table: "cppa_fsor_commentary", regulation_citation: "11 CCR § 7220(c)(1)", fsor_package: "ccpa-2025-cyber-risk-admt" };

function label(product: string | undefined, profile = enfProfile, source = enfSource) {
  const s = deriveSourceStatus(profile, source, NO_INPUTS, product);
  assert(!("exclude" in s), JSON.stringify(s));
  return s as Exclude<typeof s, { exclude: string }>;
}

Deno.test("doc238 status — HOOK_PRODUCT_CITATION_CONVENTIONS has exactly the registry's product keys (no product can be dispatched without a conventions entry, and none is invented)", () => {
  assertEquals(Object.keys(HOOK_PRODUCT_CITATION_CONVENTIONS).sort(), Object.keys(HOOK_PRODUCT_REGISTRY).sort());
  assertEquals(Object.keys(HOOK_PRODUCT_CITATION_CONVENTIONS).sort(), ["admt", "cppa-risk", "dpia", "lia"]);
});

Deno.test("doc238 status — each product's own *_SOURCE_STATUS_LABELS.sa_decision equals what the shared generator derives for that product: LIA/DPIA the shared (ratified) text, Risk/ADMT their CEO-approved override", () => {
  assertEquals(LIA_SOURCE_STATUS_LABELS.sa_decision, SHARED_SA_DECISION);
  assertEquals(DPIA_SOURCE_STATUS_LABELS.sa_decision, SHARED_SA_DECISION);
  assertEquals(RISK_SOURCE_STATUS_LABELS.sa_decision, RISK_SA_DECISION_234);
  assertEquals(ADMT_SOURCE_STATUS_LABELS.sa_decision, ADMT_SA_DECISION_236);
  assertEquals(HOOK_PRODUCT_CITATION_CONVENTIONS.lia.sa_decision_label, undefined);
  assertEquals(HOOK_PRODUCT_CITATION_CONVENTIONS.dpia.sa_decision_label, undefined);
  assertEquals(HOOK_PRODUCT_CITATION_CONVENTIONS["cppa-risk"].sa_decision_label, RISK_SOURCE_STATUS_LABELS.sa_decision);
  assertEquals(HOOK_PRODUCT_CITATION_CONVENTIONS.admt.sa_decision_label, ADMT_SOURCE_STATUS_LABELS.sa_decision);
  // Generator == map, per product.
  assertEquals(label("lia").status_label, LIA_SOURCE_STATUS_LABELS.sa_decision);
  assertEquals(label("dpia").status_label, DPIA_SOURCE_STATUS_LABELS.sa_decision);
  assertEquals(label("cppa-risk").status_label, RISK_SOURCE_STATUS_LABELS.sa_decision);
  assertEquals(label("admt").status_label, ADMT_SOURCE_STATUS_LABELS.sa_decision);
});

Deno.test("doc238 status — the SAME enforcement row derives four labels, and the LIA/DPIA/no-product/unknown-product ones are byte-identical to the pre-override text (the regression the brief warned about cannot happen)", () => {
  for (const product of [undefined, "lia", "dpia", "not-a-product"]) {
    const s = label(product);
    assertEquals(s.status_label, SHARED_SA_DECISION, `product ${product}`);
    assertEquals(s.status_in_citation, true);
    assertEquals(s.source_status, "sa_decision");
    assertEquals(s.verb, "found");
  }
  assertEquals(label("cppa-risk").status_label, RISK_SA_DECISION_234);
  assertEquals(label("admt").status_label, ADMT_SA_DECISION_236);
  // The other enforcement statuses are untouched for every product.
  for (const product of [undefined, "lia", "dpia", "cppa-risk", "admt"]) {
    assertEquals(label(product, enfProfile, { ...enfSource, appeal_status: "appeal_pending" }).status_label, "under appeal");
    assertEquals(label(product, enfProfile, { ...enfSource, appeal_status: "affirmed" }).status_label, "supervisory-authority decision, affirmed on appeal");
  }
});

Deno.test("doc238 status — the Risk/ADMT override only prints where the profile's own instrument makes 'foreign … GDPR' true; otherwise the shared label (never a false claim, never a blank)", () => {
  for (const product of ["cppa-risk", "admt"]) {
    for (const instrument of ["CCPA", "CPPA Regulations", "California Consumer Privacy Act", null]) {
      assertEquals(label(product, { ...enfProfile, instrument }).status_label, SHARED_SA_DECISION, `${product} / ${instrument}`);
    }
    for (const instrument of ["GDPR", "EU GDPR", "UK GDPR", "GDPR (Belgium)"]) {
      assert(label(product, { ...enfProfile, instrument }).status_label.startsWith("foreign supervisory-authority decision, cited by analogy"), `${product} / ${instrument}`);
    }
  }
});

Deno.test("doc238 status — FSOR status clause per product (doc 238 §5.5.2): ADMT's approved citations omit it, every other product keeps it; the label itself is derived for all", () => {
  for (const product of [undefined, "lia", "dpia", "cppa-risk"]) {
    const s = label(product, fsorProfile, fsorSource);
    assertEquals(s.status_in_citation, true, `product ${product}`);
    assertEquals(s.status_label, "CPPA Final Statement of Reasons — agency position, primary regulator commentary");
  }
  const admt = label("admt", fsorProfile, fsorSource);
  assertEquals(admt.status_in_citation, false);
  assertEquals(admt.status_label, "CPPA Final Statement of Reasons — agency position, primary regulator commentary");
  assertEquals(HOOK_PRODUCT_CITATION_CONVENTIONS.admt.fsor_status_in_citation, false);
  assertEquals(HOOK_PRODUCT_CITATION_CONVENTIONS["cppa-risk"].fsor_status_in_citation, undefined);
});

// ── The tidy pass ─────────────────────────────────────────────────────────

/** Every CEO-approved paragraph/citation this program has, verbatim, plus
 *  doc 223B's literal rendered sentences and LIA's ratified appeal sentence.
 *  The tidy pass must not change a single byte of any of them. */
const APPROVED_TEXT: readonly [string, string][] = [
  ["doc 223B 0af0876d approved hedge", "But the outcome depends on this company's own facts: its purposes, the data involved, its safeguards, the effects on people, and what those people could reasonably expect."],
  ["doc 223B 0af0876d live S2", "The company has stated that its processing is for behavioural advertising; the processing is large-scale; it processes browsing or behavioural data; the people affected are its customers; its interest is commercial or revenue-related; it markets by online advertising. In DPC, LinkedIn, DPC found that where large-scale cross-border processing of members' first party and third party behavioural data for behavioural and targeted advertising, relying on consent and on a commercial legitimate interest, processing personal data without an appropriate legal basis is a clear and serious violation of the data subject's fundamental right to data protection. That finding cuts against the company's position on the balance, and the balance finding in Section IV reflects it. (DPC, LinkedIn, decision of 22 October 2024 § 7; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)"],
  ["doc 223B a22b1399 live S5a (quoted heading pinpoint)", "In ICO, Plan direct marketing, the ICO states that legitimate interests might be available as the lawful basis for a direct marketing activity, subject to the direct marketing activity does not need consent under PECR and the controller can show the use of people's information is proportionate, has a minimal privacy impact and is not a surprise to people or they are not likely to object. That guidance is relevant to the company's asserted legitimacy of its interest; whether its condition is satisfied is addressed in Section II. (ICO, Plan direct marketing \"How does legitimate interests apply to direct marketing?\"; ICO regulatory guidance — non-binding.)"],
  ["doc 223B 66742297 live S5a (§ Mál númer pinpoint)", "In Persónuvernd, Stjörnuna ehf, Persónuvernd found that monitoring of employees' work performance may in principle be permissible, but only where a special need for it exists, subject to a special need is shown, for example that supervision cannot be arranged by other means, that the monitoring is necessary under a collective agreement or other pay arrangement, particularly where pay is performance-based and time-measured, or that safety in the area cannot otherwise be ensured, and a data protection impact assessment is carried out before the monitoring begins. That guidance is relevant to the company's asserted legitimacy of its interest; whether its condition is satisfied is addressed in Section II. (Persónuvernd, Stjörnuna ehf, decision of 24 March 2024 § Mál númer 2021051091; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)"],
  ["doc 233 Bolzano approved citation", "(Garante, Comune di Bolzano, decision of 13 May 2021; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)"],
  ["doc 233 Bolzano approved hedge", "But the outcome depends on this company's own facts: whether the monitoring is organized and ongoing (systematic), or occasional and incidental."],
  ["doc 234 Candidate 1 approved paragraph", "The company has said this processing is planned but has not started, or that it started before a risk assessment was finished. California's rule requires a risk assessment to be completed before any § 7150(b)-triggering processing begins, and § 7155 sets the timing for that assessment. The Dutch data protection authority applied that same basic principle when it fined International Card Services B.V. for exactly this sequence. In its own words: \"ICS heeft nagelaten om een DPIA uit te voeren voordat het bedrijf in 2019 begon met het digitaal identificeren van klanten in Nederland\" — \"ICS failed to carry out a DPIA before the company began digitally identifying customers in the Netherlands in 2019.\" The company had rolled out a new identity-verification process — collecting a photo from about 1.5 million customers and comparing it against their ID documents — without assessing the risk first, and was fined €150,000. This decision is only persuasive here: the Dutch authority applied Dutch and EU law, not California's. Whether it says anything about this company depends on this company's own facts — whether its processing has actually started, and whether an assessment was completed first. (Autoriteit Persoonsgegevens (Dutch Data Protection Authority), International Card Services B.V., decision of 15 January 2024, final on appeal; foreign supervisory-authority decision, cited by analogy — not binding on California regulators.)"],
  ["doc 236 E1 approved citation", "(Garante per la protezione dei dati personali (Italian Data Protection Authority), Azienda Universitaria Friuli Occidentale, decision of 15 December 2022; foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations.)"],
  ["doc 236 notice-content approved citation", "(California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7220(c)(1).)"],
  ["doc 236 G1 approved citation (page ref)", "(California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7150(b)(6), Appendix p. 13.)"],
  ["LIA_APPEAL_SENTENCE (ratified)", LIA_APPEAL_SENTENCE],
  ["French-typography verbatim span (space before ; and : must survive)", "In CNIL, Example, the CNIL found that where x ; y : z, the finding — in its own words, \"la CNIL relève ; qu'il y a lieu : de constater\". (CNIL, Example, decision of 1 January 2024; status.)"],
];

Deno.test("doc238 tidy — byte-for-byte no-op on every CEO-approved paragraph and citation in docs 223B/233/234/236, on LIA's ratified appeal sentence, and on French-spaced verbatim text", () => {
  for (const [name, text] of APPROVED_TEXT) {
    assertEquals(tidyRenderedSentence(text), text, name);
  }
});

Deno.test("doc238 tidy — collapses exactly the artifacts an empty slot leaves, and is idempotent", () => {
  const cases: readonly [string, string][] = [
    ["(Cite; .)", "(Cite.)"],
    ["(Cite;  .)", "(Cite.)"],
    ["(Cite; )", "(Cite)"],
    ["(; status.)", "(status.)"],
    ["a; ; b", "a; b"],
    ["a, , b", "a, b"],
    ["Sentence one. ()", "Sentence one."],
    ["Sentence one.  Sentence two.", "Sentence one. Sentence two."],
    ["Sentence one .", "Sentence one."],
    ["word , word", "word, word"],
    ["( Cite.)", "(Cite.)"],
    ["  leading and trailing  ", "leading and trailing"],
    // The reachable production case, end to end: an ADMT FSOR trailer.
    ["…is addressed in Section 3. (California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7220(c)(1); .)", "…is addressed in Section 3. (California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7220(c)(1).)"],
  ];
  for (const [input, expected] of cases) {
    const once = tidyRenderedSentence(input);
    assertEquals(once, expected, `tidy(${JSON.stringify(input)})`);
    assertEquals(tidyRenderedSentence(once), once, `idempotent on ${JSON.stringify(input)}`);
  }
});
