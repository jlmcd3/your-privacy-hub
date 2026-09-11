// BATCH bcf0a706 (2026-09-11, DOC 253) — the first sixteen-product Claude
// batch. Product fixes pinned against the batch's own records:
//   DPIA 943d955e — the r8 "protection" was the residual-risk sentence
//     ("Although the Trust & Safety analyst review limits exposure, a user
//     may experience service denial …"); the measure the record states is in
//     nature_scope_context ("reviewed by a Trust & Safety analyst").
//   RoPA c00e11e1 — "transferred to European Union (Brevo — EU data centres)
//     under No transfer outside EEA".
//   Governance fc9153eb — "must not be cited to Art. 44" rendered as prose;
//     the executive tally summed to nine of ten; the UK mechanism unnamed.
//   Biometric 70fe3741 — Article 9 with no paragraph; no Art. 4(14).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDpiaDeliverables, readHumanInterventionSpan } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { resolveTransfer } from "../../../../supabase/functions/generate-ropa-document/register/assemble-input.ts";
import { GOVERNANCE_VERIFIED_AUTHORITIES } from "../../../../supabase/functions/run-governance-assessment/_local/registry/governance-verified-authorities.ts";
import { harvestGovernanceCitations } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import { buildDomainFindingsTyped, composeExecutiveSummaryTyped } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";
import { buildTransferAnalysis } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { UK_JURISDICTION } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/elements.ts";
import { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } from "../../../../supabase/functions/_shared/grader/context.ts";
import { coerceIntakeToContract } from "../../../../supabase/functions/run-stress-job/_local/intake-coerce.ts";
import { euNoticeContract } from "../../../../supabase/functions/run-stress-job/_local/intake-contracts/eu-notice.ts";

type Bag = Record<string, unknown>;

// ── DPIA r8 reader ──────────────────────────────────────────────────────────

const VELORIX_NATURE =
  "Processing is automated and continuous; the ML scoring model evaluates each session against behavioural baselines and outputs a numeric risk score. Scores triggering suspension are reviewed by a Trust & Safety analyst within 24 hours before the suspension is confirmed as permanent; the analyst has authority to lift the suspension and can consider information submitted by the user via the appeal form. Aggregate model performance is reviewed quarterly by the Data Science team but individual-level human intervention is provided through the Trust & Safety analyst review process prior to any confirmed account action.";
const VELORIX_RESIDUAL =
  "Users who receive a false-positive suspension face temporary loss of access to the platform and associated paid services without prior warning. Although the Trust & Safety analyst review limits exposure, a user may experience service denial for up to 24 hours before human review is completed.";

Deno.test("bcf0a706 DPIA — the r8 measure is the record's operating review sentence, never its residual-risk sentence", () => {
  const span = readHumanInterventionSpan({ nature_scope_context: VELORIX_NATURE, residual_risks: VELORIX_RESIDUAL });
  assertEquals(span, "Scores triggering suspension are reviewed by a Trust & Safety analyst within 24 hours before the suspension is confirmed as permanent");
  // residual_risks alone is not a measure source, and its hedged clause is excluded on its own terms too.
  assertEquals(readHumanInterventionSpan({ residual_risks: VELORIX_RESIDUAL }), "");
  assertEquals(readHumanInterventionSpan({ description: "Although the analyst review limits exposure, a user may experience service denial for up to 24 hours before human review is completed." }), "");
  // The " but " split rescues an individual-level clause beside an aggregate one.
  assertEquals(
    readHumanInterventionSpan({ nature_scope_context: "Aggregate model performance is reviewed quarterly by the Data Science team but individual-level human intervention is provided through the analyst review process prior to any confirmed account action." }),
    "individual-level human intervention is provided through the analyst review process prior to any confirmed account action",
  );
});

Deno.test("bcf0a706 DPIA — on the batch record r8 resolves to Moderate from the nature_scope_context sentence", () => {
  const intake: Bag = {
    organization_name: "Velorix Digital Services Ltd",
    processing_activity_name: "Real-Time User Behavioural Fraud Scoring Engine",
    purpose: "To detect and prevent account takeover and payment fraud in real time.",
    data_subjects: "Registered Velorix platform users (adults, B2C)",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    data_categories: ["Customer records", "Location data", "Financial data", "Other"],
    reasons_to_conduct: ["Evaluation or scoring (incl. profiling / prediction)", "Automated decision-making with legal or significant effect", "Data processed on a large scale"],
    existing_safeguards: ["Encryption at rest", "Encryption in transit", "Access controls", "Data minimisation", "Pseudonymisation", "Staff training", "DPA signed with processor"],
    nature_scope_context: VELORIX_NATURE,
    residual_risks: VELORIX_RESIDUAL,
    retention_period: "Session risk scores and associated event logs: 30 days",
  };
  const r8 = buildDpiaDeliverables(intake).risk_register.find((r) => r.risk_id === "r8_automated_significant_effect")!;
  assertEquals(r8.measures, ["Scores triggering suspension are reviewed by a Trust & Safety analyst within 24 hours before the suspension is confirmed as permanent"]);
  assertEquals(r8.residual_band, "moderate");
  assert(!r8.measures.some((m) => /may experience service denial/.test(m)), "the residual-risk clause must not render as a protection");
});

// ── RoPA: an in-region recipient under a recorded "no transfer" ───────────

Deno.test("bcf0a706 RoPA — 'No transfer outside EEA' against an EU destination is a recorded no-transfer that names where the data stay", () => {
  const t = resolveTransfer({
    transfers_third_country: "yes",
    transfer_destination: "European Union (Brevo — EU data centres)",
    transfer_mechanism: "No transfer outside EEA",
  } as never);
  assertEquals(t.declaredNone, true);
  assertEquals(t.destination, "");
  assertEquals(t.mechanism, "");
  assertEquals(t.withinRegion, "European Union (Brevo — EU data centres)");
  // A real third-country transfer is byte-unchanged.
  const us = resolveTransfer({
    transfers_third_country: "yes",
    transfer_destination: "United States (Twilio)",
    transfer_mechanism: "Standard Contractual Clauses (Art. 46(2)(c))",
  } as never);
  assertEquals(us.declaredNone, false);
  assertEquals(us.withinRegion, "");
  assertStringIncludes(us.destination, "United States");
});

// ── Harness: the EU notice's data categories resolve from the cross-product vocabulary ──

Deno.test("bcf0a706 harness — DPIA/LIA category labels resolve to the EU notice's own tokens instead of being dropped", () => {
  const { intake, notes } = coerceIntakeToContract(euNoticeContract, {
    data_categories: ["Contact details", "Customer records", "Financial data", "Location data", "Other"],
  });
  assertEquals(intake.data_categories, ["identifiers", "commercial", "financial", "geolocation"]);
  assert(notes.some((n) => n.includes("\"Contact details\" → \"identifiers\"")), notes.join("\n"));
  assert(notes.some((n) => n.includes("dropped unmatched [\"Other\"]")), notes.join("\n"));
});

// ── Governance ─────────────────────────────────────────────────────────────

Deno.test("bcf0a706 governance — the UK transfer passage renders reader prose for the omitted Article 44; the registry note stays corpus-pinned and cited", () => {
  // The registry bytes are the corpus-pinned omission record (IR snapshot + vitest pins): unchanged.
  const row = (GOVERNANCE_VERIFIED_AUTHORITIES as Record<string, { verbatim_quote: string; citation: string }>).uk_art_44_not_in_force;
  assertEquals(row.verbatim_quote, "There is no UK GDPR Article 44 in force; the UK Chapter V general principle must not be cited to Art. 44.");
  const out = buildTransferAnalysis({
    jurisdictions: [UK_JURISDICTION],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "UK Addendum to EU SCCs",
  } as never) as unknown as { application: string; citations_used: string[] };
  // Ledger F9 (CEO 2026-09-11): the omission is stated as the corpus row records it.
  assertStringIncludes(out.application, "The UK chapter is a different body of law, not the EU chapter under another name. Article 44 was omitted from the UK GDPR on 5 February 2026 by the Data (Use and Access) Act 2025, so the general principle for transfers is now Article 44A(1):");
  assertStringIncludes(out.application, "Under Article 44A(2) that condition is met only where the transfer is approved by adequacy regulations under Article 45A, is made subject to appropriate safeguards under Article 46, or relies on a derogation for specific situations under Article 49 — Article 44A(2)(a):");
  assert(!out.application.includes("must not be cited"), "drafting instruction must not render");
  // Ledger F6 — the recorded mechanism is named.
  assertStringIncludes(out.application, "The recorded mechanism — the UK Addendum to the EU standard contractual clauses — is a set of standard data protection clauses issued by the Information Commissioner under section 119A of the Data Protection Act 2018 (in force 21 March 2022) and falls within Article 46(2)(d) of the UK GDPR.");
  // The omission row is still cited (ToA), and the harvester never lifts "Article 44" from the reader sentence.
  // The composer cites the row by its subsection form.
  assert(out.citations_used.includes("UK GDPR Art. 44 (omitted)"), JSON.stringify(out.citations_used));
  const cites = harvestGovernanceCitations({ application: out.application });
  assert(!cites.some((c) => /Art(?:icle|\.)\s*44\b(?!A)/.test(c)), JSON.stringify(cites));
});

const VELORIX_GOV: Bag = {
  tools: ["Microsoft 365 / Copilot", "Salesforce + Einstein", "GitHub Copilot", "Slack + AI features", "Otter.ai / Fireflies"],
  sector: "Technology/SaaS", org_size: "1001+", dpa_status: "Most vendors", dpo_status: "Yes, formal DPO", eu_uk_data: "Yes",
  dpia_status: "Yes, multiple DPIAs completed",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal", "California (CCPA/CPRA)", "Other US States"],
  dsr_capability: "Yes — documented and tested across all vendors", privacy_policy: "Yes, current (reviewed in last 12 months)",
  data_categories: ["Contact details", "Employee records", "Customer records", "Financial data", "Location data", "Communications content"],
  inventory_audit: "Yes — audited + formal approval process", training_status: "Yes, formal onboarding + annual refresh",
  transfer_status: "Yes, US-based tools", dpia_ai_coverage: "Some covered", special_category: "Yes",
  tool_instruction: "Yes, written policy with specific prohibitions", dsr_rights_tested: ["Access", "Erasure", "Portability", "Rectification"],
  incident_response: "Yes, tested in last 12 months", organization_name: "Velorix Digital Services Ltd", dpa_art28_verified: "Partially",
  technical_controls: "Yes — DLP/content filtering actively enforced", transfer_mechanism: "UK Addendum to EU SCCs",
  training_ai_coverage: "Yes — explicitly covers AI tools", privacy_notice_coverage: "Partially — some activities or tools not yet reflected",
  special_categories_list: ["Biometric data", "Trade union membership"],
  technical_controls_list: ["DLP rules", "Content filtering", "Endpoint upload restrictions", "Prompt-injection detection"],
  retention_schedule_status: "Yes — retention periods documented for each category of data",
};

Deno.test("bcf0a706 governance — the executive tally accounts for all ten domains (ledger F7)", () => {
  const exec = composeExecutiveSummaryTyped(buildDomainFindingsTyped(VELORIX_GOV as never));
  assertStringIncludes(exec, "leaves 7 of the ten fully evidenced.");
  assertStringIncludes(exec, "2 domains carry recorded gaps below the immediate-priority threshold");
  assertStringIncludes(exec, "One domain — Regulatory Exposure Summary — is evidenced; it carries a point to watch but no recorded gap.");
});

// ── Grader ─────────────────────────────────────────────────────────────────

Deno.test("bcf0a706 grader — DOC 253 carries its eight classes, the true-positive shapes, and the tag appends last", () => {
  const at = SHARED_GRADER_CONTEXT.indexOf("DOC 253 (batch-bcf0a706 triage, 2026-09-11");
  assert(at > SHARED_GRADER_CONTEXT.indexOf("DOC 252 (batch-916c33a8 triage"), "DOC 253 appends after DOC 252");
  const block = SHARED_GRADER_CONTEXT.slice(at);
  for (const h of [
    "AN EU-ESTABLISHED CONTROLLER OWES NO ART. 27 REPRESENTATIVE",
    "THE WORKSHEET LEAD IS A FIXED FRAME WITH RECORD OPERANDS",
    "\"MATTERS STILL OUTSTANDING\" LEAD IS THE TABLE'S LEAD-IN",
    "DOMAIN PARAGRAPHS AND THE REGISTER POINTER ARE FIXED FRAMES WITH RECORD OPERANDS",
    "DISCLOSES AN ABSENT FACT",
    "THE GOVERNING FRAMEWORK IS DERIVED FROM THE CONTROLLER'S JURISDICTION",
    "THE SECTION IV HARMS CLOSE IS A RATIFIED FRAME",
    "A FINDING MUST QUOTE TEXT THAT IS IN THE DOCUMENT GRADED",
  ]) assertStringIncludes(block, h);
  assertStringIncludes(block, "under No transfer outside EEA");
  assertStringIncludes(block, "must not be cited");
  // RE-PIN 2026-09-11 (DOC 254, ChatGPT prose review): the review tag follows the batch tag.
  assert(GRADER_CONTEXT_VERSION.endsWith("+doc252-rulings-2026-09-11+batch-bcf0a706-cal-2026-09-11+doc254-chatgpt-review-2026-09-11"), GRADER_CONTEXT_VERSION);
});
