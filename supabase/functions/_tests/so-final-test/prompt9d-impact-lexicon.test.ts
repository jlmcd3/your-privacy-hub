// PROMPT 9D item 1 — impact-lexicon widening. Per-pattern fixture pairs:
// impact prose is now recognised; benefit-only prose is still NOT recognised.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hasImpactLanguage, IMPACT_LEXICON } from "../ltp/dpia-deliverables/build.ts";

const PAIRS: Array<{ name: string; impact: string; benefit: string }> = [
  {
    name: "expressed concern (doc b435d8eb)",
    impact: "Six participants expressed concern about the absence of a default human review step.",
    benefit: "The scoring model enables faster lending decisions and improves throughput.",
  },
  {
    name: "uncomfortable (doc dfe21899)",
    impact: "54% of respondents were uncomfortable with health data being used in motor pricing.",
    benefit: "Telematics pricing delivers lower premiums and supports competitive positioning.",
  },
  {
    name: "less favourable outcomes (doc b435d8eb)",
    impact: "AurelianScore v3.2 may produce systematically less favourable outcomes for applicants from certain cohorts.",
    benefit: "The model achieves better portfolio outcomes and is necessary to deliver the product.",
  },
  {
    name: "bias / discrimination (doc 472a9ea1)",
    impact: "The council raised bias — whether the XGBoost model performs equitably across patient demographics.",
    benefit: "Clinical triage benefits from a validated model that improves sensitivity.",
  },
  {
    name: "no human review pathway (doc 56489b7c)",
    impact: "Declined applicants do not receive a meaningful human-review pathway in the adverse-action notice.",
    benefit: "Automation is required for viable lending at scale and supports underwriting capacity.",
  },
  {
    name: "unaware (doc dfe21899)",
    impact: "38% of respondents were unaware that automated decisions were made without human review.",
    benefit: "The survey confirmed the service delivers value and enables faster quotes.",
  },
  {
    name: "without disclosure (doc 1ad3fbb5)",
    impact: "Enrichment of application data from external sources proceeds without explicit disclosure at the point of collection.",
    benefit: "External enrichment improves accuracy and is necessary to achieve the screening objective.",
  },
  {
    name: "opt-out mechanism (doc 1ad3fbb5)",
    impact: "Participants expressed a preference for a clear opt-out mechanism from automated scoring.",
    benefit: "The scoring pipeline enables consistent screening and supports client service levels.",
  },
  {
    name: "continuous monitoring (run 887a91d2 / doc dfe21899)",
    impact: "Continuous transactional enrichment runs 24/7 with continuous monitoring of account behaviour.",
    benefit: "Continuous availability of the platform improves service and delivers efficiency.",
  },
  {
    name: "broader than strictly necessary (doc dfe21899)",
    impact: "GPS collection at 10-second intervals is broader than strictly necessary for premium-band assignment.",
    benefit: "Granular data is necessary to achieve accurate actuarial pricing and improves margins.",
  },
  {
    name: "decision volume (run 887a91d2)",
    impact: "Approximately 18,000 automated credit decisions per month are issued against these customers.",
    benefit: "The system delivers faster decisioning and supports growth in the loan book.",
  },
  {
    name: "affected population (run 887a91d2)",
    impact: "Approximately 340,000 active data subjects, of whom roughly 18,000 receive a new automated decision each cycle, are scored.",
    benefit: "The programme benefits 340,000 customers by enabling quicker onboarding.",
  },
  {
    name: "cannot avoid (run 887a91d2 ask text)",
    impact: "Customers flagged by the early-distress module cannot avoid the profiling once they hold an account.",
    benefit: "The module is required for prudential monitoring and supports regulatory reporting.",
  },
  {
    name: "would not expect (run 887a91d2 ask text)",
    impact: "Applicants would not expect transactional history from 36 months to inform a loan refusal.",
    benefit: "Applicants benefit from a decision that is delivered within minutes.",
  },
  {
    name: "at stake",
    impact: "What is at stake for the individual is access to consumer credit on fair terms.",
    benefit: "What the business gains is improved conversion and lower cost to serve.",
  },
  {
    name: "Art. 22-class consequence",
    impact: "A low score means applicants are refused credit without any human step.",
    benefit: "A high score means the bank achieves faster approvals and improves margin.",
  },
];

for (const p of PAIRS) {
  Deno.test(`9D item 1: impact prose recognised — ${p.name}`, () => {
    assert(hasImpactLanguage(p.impact), `not recognised: ${p.impact}`);
  });
  Deno.test(`9D item 1.2: benefit-only prose still fails — ${p.name}`, () => {
    assert(!hasImpactLanguage(p.benefit), `benefit prose wrongly recognised: ${p.benefit}`);
  });
}

Deno.test("9D item 4: one constant — the eight original patterns are retained", () => {
  const sources = IMPACT_LEXICON.map((r) => r.source);
  for (const s of ["\\bintrusive\\b", "\\bdetriment\\b", "\\bloss of control\\b", "\\breasonable expectations?\\b"]) {
    assert(sources.includes(s), `original pattern dropped: ${s}`);
  }
  assert(IMPACT_LEXICON.length > 8);
});
