// DOC 182 (2026-09-04) — the Canonical DPA Package v2.0 ported onto the dark
// clause-library assembler: independent geography flags, the v2.0
// supplementary sections after the ratified core, the jurisdiction-neutral
// skeleton for us-state mode, the four addenda/exhibits attached per engaged
// geography, and the formal-instrument contract-mode renderer. The ratified
// core bytes and every doc-80/81/108/111/113 pin are asserted elsewhere and
// re-run alongside this suite; here the additions are pinned and the
// handler's deterministic lint nets are proven silent on the new prose.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleDpaDocument,
  checkDpaCompleteness,
  DPA_ASSEMBLER_STAMP,
  type DpaAssembleInput,
} from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import {
  DPA_US_COVERED_STATE_LAWS,
  deriveDpaEngagement,
} from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-v2-supplement.ts";
import { deriveEngagedStates, detectNonEngagedStateAssertions } from "../../../supabase/functions/generate-dpa/_local/dpa-engaged-states.ts";
import { normalizeJurisdiction } from "../../../supabase/functions/generate-dpa/_local/dpa-derivation.ts";
import { hasHardViolations, lintReportText } from "../../../supabase/functions/_shared/output-lint.ts";
import { detectBlacklistPhrases } from "../../../supabase/functions/_shared/blacklist-phrases.ts";
import { buildDpaFormalInstrumentHTML, promptify } from "../../../supabase/functions/generate-report-pdf/_local/dpa-formal-instrument.ts";
import { countFills } from "../../../supabase/functions/_shared/prose/formal-instrument.ts";

const BASE: DpaAssembleInput = {
  documentType: "gdpr",
  controllerName: "Acme GmbH",
  controllerJurisdiction: "Germany",
  processorName: "CloudOps GmbH",
  processorJurisdiction: "Germany",
  services: "cloud hosting and managed backups for the Controller's ERP system",
  dataCategories: ["General personal data", "Employee / HR data"],
  retention: "For the duration of the principal agreement, then delete or return",
  hasSubProcessors: true,
  subProcessorList: "Hetzner Online GmbH (Hosting, Germany); AWS EMEA SARL — Backups — Ireland",
  subprocessorAuthorizationModel: "general",
  subprocessorNoticeDays: 30,
  auditRights: "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice",
  includeTransferClause: false,
  transferMechanism: "",
  securityMeasuresSelected: ["encryption_at_rest", "mfa"],
  securityMeasuresDetails: "AES-256; FIDO2 keys for admins",
  californiaEngaged: false,
};

// The handler's speculative-module nets (generate-dpa/index.ts), mirrored so
// the new prose is proven silent without importing the Deno.serve module.
const RE_CHILDRENS_SIGNAL = /\b(COPPA|FERPA|Recital 38|Article 8 GDPR|Article 8(?:\(1\))? of the GDPR|children'?s data|children under 13|children under 18|minors?|under 18)\b/i;
const RE_AI_TRAINING_SIGNAL = /\b(model training|ML training|machine learning training|training (?:its|the|our) models|use[s]? .* to train (?:its|the|our) models?|inference platform)\b/i;
const RE_HIPAA_SIGNAL = /\b(HIPAA|Business Associate Agreement|Business Associate\b|BAA\b|Protected Health Information|\bPHI\b|Covered Entity|45 C\.?F\.?R\.? § 16[04])/i;
const RE_GLBA_FCRA_SIGNAL = /\b(GLBA|Gramm[- ]Leach[- ]Bliley|Safeguards Rule|Nonpublic Personal Information|\bNPI\b|FCRA|Fair Credit Reporting Act|15 U\.?S\.?C\.? § 168)/i;

function headings(text: string): string[] {
  return text.split("\n").filter((l) => /^\d+\. [A-Z]/.test(l));
}

// The handler runs lintReportText with checkClauseNumbering OFF on the
// deterministic path (doc 182: the collision net targets model-numbered
// clauses and fires on every decimal statute cite, including the ratified
// Section 12's "§ 1798.140"); the mirror here matches that call.
function assertLintSilent(text: string, ctrl: string, proc: string, label: string) {
  const lint = lintReportText(text, { checkClauseNumbering: false });
  assert(!hasHardViolations(lint), `${label}: hard lint violations — ${JSON.stringify(lint.violations.filter((v) => v.severity === "hard").slice(0, 5))}`);
  assertEquals(detectBlacklistPhrases(text), [], `${label}: blacklist phrase`);
  const engaged = deriveEngagedStates([normalizeJurisdiction(ctrl).canonical, normalizeJurisdiction(proc).canonical]);
  assertEquals(detectNonEngagedStateAssertions(text, engaged), [], `${label}: non-engaged state statute asserted`);
  assert(!/\b1798\.150\b/.test(text), `${label}: § 1798.150 must never be cited`);
  assert(!RE_AI_TRAINING_SIGNAL.test(text), `${label}: AI-training vocabulary`);
  assert(!RE_HIPAA_SIGNAL.test(text), `${label}: HIPAA vocabulary`);
  assert(!RE_GLBA_FCRA_SIGNAL.test(text), `${label}: GLBA/FCRA vocabulary`);
}

Deno.test("doc182 — the GDPR core keeps its ratified sections and gains the v2.0 supplement with contiguous numbering; no addenda for a pure-EEA pair", () => {
  const doc = assembleDpaDocument(BASE);
  const t = doc.document_text;
  assertEquals(checkDpaCompleteness(doc), []);
  // Ratified core intact (representative bytes).
  assertStringIncludes(t, "4.1 (Documented instructions — Art. 28(3)(a).)");
  assertStringIncludes(t, "8.1 The Parties have recorded that the processing involves no transfer of Personal Data across the recorded jurisdictions or onward to a third country.");
  // Supplement follows 11 with contiguous numbering.
  const hs = headings(t).map((h) => Number(h.split(".")[0]));
  assertEquals(hs, hs.map((_, i) => i + 1), `non-contiguous section numbering: ${hs.join(",")}`);
  assertStringIncludes(t, "12. DATA PROTECTION ASSESSMENTS AND REGULATORY ASSISTANCE");
  assertStringIncludes(t, "18. GENERAL PROVISIONS");
  assertStringIncludes(t, "19. JURISDICTION-SPECIFIC ADDENDA AND TRANSFER EXHIBITS");
  assertStringIncludes(t, "No jurisdiction-specific addendum or transfer exhibit is engaged by the record.");
  assertStringIncludes(t, "20. OPTIONAL PROVISIONS");
  assertStringIncludes(t, "(Optional provision — 24-hour initial breach notification.)");
  assertEquals(doc.contract.addenda.length, 0);
  assertEquals(doc.contract.engagement.gdprEngaged, true);
  assertEquals(doc.contract.engagement.californiaEngaged, false);
  // Category-gated prose is absent on this record.
  assert(!RE_CHILDRENS_SIGNAL.test(t), "children's vocabulary on a record without the category");
  assert(!/biometric/i.test(t), "biometric clause on a record without the category");
  assert(!/\{[a-zA-Z]+\}/.test(t));
  assertLintSilent(t, BASE.controllerJurisdiction, BASE.processorJurisdiction, "gdpr");
  assertEquals(DPA_ASSEMBLER_STAMP, "dpa-assembler@s-d1-2026-08-27+v2-2026-09-04");
});

Deno.test("doc182 — RULING 9.2 invariant survives: contract.sections mirrors sections through the supplement and the CCPA terms", () => {
  for (const input of [BASE, { ...BASE, documentType: "dual-eu-us" as const, processorJurisdiction: "California", californiaEngaged: true }, { ...BASE, documentType: "us-state" as const, controllerJurisdiction: "California", processorJurisdiction: "Texas", californiaEngaged: true }]) {
    const doc = assembleDpaDocument(input);
    assertEquals(doc.contract.sections.length, doc.sections.length);
    doc.sections.forEach((flat, i) => {
      assertEquals(doc.contract.sections[i].heading, flat.heading);
      assertEquals(doc.contract.sections[i].clauses.join("\n"), flat.body);
    });
    assertEquals(JSON.stringify(doc.contract).match(/\{[a-zA-Z]+\}/g), null);
  }
});

Deno.test("doc182 — dual-eu-us with a California processor and an SCC transfer attaches the CCPA addendum and the EU SCC exhibit", () => {
  const input: DpaAssembleInput = {
    ...BASE,
    documentType: "dual-eu-us",
    processorName: "Golden State Cloud, Inc.",
    processorJurisdiction: "California",
    includeTransferClause: true,
    transferMechanism: "EU Standard Contractual Clauses (SCCs)",
    californiaEngaged: true,
  };
  const doc = assembleDpaDocument(input);
  const t = doc.document_text;
  assertStringIncludes(t, "12. PROHIBITED PROCESSING AND CCPA REQUIRED TERMS");
  assertStringIncludes(t, "13. DATA PROTECTION ASSESSMENTS AND REGULATORY ASSISTANCE");
  assertEquals(doc.contract.addenda.map((a) => a.id), ["ccpa", "eu-scc"]);
  const ccpa = doc.contract.addenda[0];
  assertStringIncludes(ccpa.sections[2].clauses[0], "set out in Section 12 of the DPA");
  assertStringIncludes(t, "CCPA SERVICE PROVIDER ADDENDUM");
  assertStringIncludes(t, "EU STANDARD CONTRACTUAL CLAUSES — MODULE TWO IMPLEMENTATION EXHIBIT");
  // Schedule A's first row carries the record's own facts.
  const schedA = ccpa.schedules[0];
  assertEquals(schedA.rows[0][0], input.services);
  assertEquals(schedA.rows[0][1], "General personal data, Employee / HR data");
  assertStringIncludes(schedA.rows[0][2], "For the duration of the principal agreement");
  // Schedule B mirrors Annex D's parsed rows.
  assertEquals(ccpa.schedules[1].rows[0].slice(0, 3), ["Hetzner Online GmbH", "Hosting", "Germany"]);
  // Clause 9 election follows the record: general + 30 days.
  const scc = doc.contract.addenda[1];
  assertStringIncludes(scc.sections[1].clauses[1], "Option 2 (general written authorisation), with an advance-notice period of 30 days");
  assertStringIncludes(scc.schedules[4].rows[0][0], "Option 2 (general written authorisation) is selected");
  // The core's addenda section names exactly what is attached.
  assertStringIncludes(t, "(California Addendum.) The CCPA Service Provider Addendum attached to this DPA applies");
  assertStringIncludes(t, "(EU SCC Module 2 Exhibit.)");
  assert(!t.includes("(US Multi-State Addendum.)"));
  assert(!t.includes("(UK Addendum Exhibit.)"));
  assertLintSilent(t, input.controllerJurisdiction, input.processorJurisdiction, "dual-eu-us CA");
});

Deno.test("doc182 — a Texas processor attaches the multi-state addendum with Schedule 1 limited to Texas and no California vocabulary", () => {
  const input: DpaAssembleInput = { ...BASE, documentType: "dual-eu-us", processorName: "Lone Star Data LLC", processorJurisdiction: "Texas" };
  const doc = assembleDpaDocument(input);
  const t = doc.document_text;
  assertEquals(doc.contract.addenda.map((a) => a.id), ["us-multistate"]);
  assertEquals(doc.contract.engagement.usStatesEngaged, ["Texas"]);
  const ms = doc.contract.addenda[0];
  assertEquals(ms.schedules[0].rows.map((r) => r[0]), ["Texas"]);
  assertStringIncludes(ms.schedules[0].rows[0][1], "Tex. Bus. & Com. Code Ch. 541");
  assertEquals(ms.schedules[2].rows.map((r) => r[0]), ["Texas", "Other Covered State"]);
  assert(!t.includes("CCPA"), "California vocabulary on a record that does not engage California");
  assert(!t.includes("Oregon"), "a non-engaged state named");
  assert(!t.includes("PROHIBITED PROCESSING AND CCPA REQUIRED TERMS"));
  assertLintSilent(t, input.controllerJurisdiction, input.processorJurisdiction, "dual-eu-us TX");
});

Deno.test("doc182 — the UK Addendum mechanism attaches both transfer exhibits; specific authorisation populates SCC Annex III", () => {
  const input: DpaAssembleInput = {
    ...BASE,
    documentType: "uk",
    controllerName: "Frostbyte Payroll Ltd",
    controllerJurisdiction: "United Kingdom",
    processorName: "Rocky Mountain Systems Inc",
    processorJurisdiction: "United States",
    includeTransferClause: true,
    transferMechanism: "UK IDTA / UK Addendum to EU SCCs",
    subprocessorAuthorizationModel: "specific",
  };
  const doc = assembleDpaDocument(input);
  const t = doc.document_text;
  assertEquals(doc.contract.addenda.map((a) => a.id), ["eu-scc", "uk-addendum"]);
  assertEquals(doc.contract.engagement.ukEngaged, true);
  const scc = doc.contract.addenda[0];
  assertStringIncludes(scc.sections[1].clauses[1], "Option 1 (specific prior authorisation)");
  assertEquals(scc.schedules[4].title, "Annex III — List of Sub-processors (specific authorisation)");
  assertEquals(scc.schedules[4].rows[0][0], "Hetzner Online GmbH");
  const uk = doc.contract.addenda[1];
  assertStringIncludes(uk.sections[1].clauses[0], "Part 2: Mandatory Clauses of the Approved Addendum, being the template Addendum B.1.0");
  assertStringIncludes(uk.schedules[1].rows[3][1], "Option 1 — specific prior authorisation");
  assertStringIncludes(t, "(UK Addendum Exhibit.)");
  // The UK mode keeps its domestic-law variant in the core.
  assert(!/Union or Member State/.test(t.split("12. DATA PROTECTION ASSESSMENTS")[0]));
  assertLintSilent(t, input.controllerJurisdiction, input.processorJurisdiction, "uk");
});

Deno.test("doc182 — us-state mode takes the jurisdiction-neutral skeleton: ten required headings, no Art. 28 citations, CCPA terms and both US addenda", () => {
  const input: DpaAssembleInput = {
    ...BASE,
    documentType: "us-state",
    controllerName: "Pacific Retail Corp",
    controllerJurisdiction: "California",
    processorName: "Lone Star Data LLC",
    processorJurisdiction: "Texas",
    californiaEngaged: true,
    dataCategories: ["General personal data", "Children's data (under 18)", "Biometric data"],
  };
  const doc = assembleDpaDocument(input);
  const t = doc.document_text;
  assertEquals(checkDpaCompleteness(doc), []);
  const core = t.split("12. PROHIBITED PROCESSING")[0];
  assert(!/Art\. 28|Article 28|Article 32|Articles 32 to 36/.test(core), "GDPR citations in the neutral skeleton");
  assertStringIncludes(core, `"Applicable Data Protection Law" means the applicable US state privacy laws identified in this DPA`);
  assertStringIncludes(core, "6. DATA SUBJECT RIGHTS AND CONSUMER RIGHTS");
  assertStringIncludes(core, "7. SECURITY AND PERSONAL DATA BREACH");
  assertStringIncludes(t, "12. PROHIBITED PROCESSING AND CCPA REQUIRED TERMS");
  assertEquals(doc.contract.addenda.map((a) => a.id), ["ccpa", "us-multistate"]);
  // Category-gated prose renders when the record carries the category.
  assertStringIncludes(t, "(Children and teenagers.) The record identifies Personal Data concerning children or teenagers.");
  assertStringIncludes(t, "(Biometric data.) The record identifies biometric data.");
  assert(!/\{[a-zA-Z]+\}/.test(t));
  // Numbering contiguous through the supplement.
  const hs = headings(core + t.slice(core.length).split("\nEXECUTION\n")[0]).map((h) => Number(h.split(".")[0]));
  assertEquals(hs, hs.map((_, i) => i + 1), `non-contiguous: ${hs.join(",")}`);
  const lint = lintReportText(t, { checkClauseNumbering: false });
  assert(!hasHardViolations(lint), JSON.stringify(lint.violations.filter((v) => v.severity === "hard").slice(0, 5)));
  assertEquals(detectBlacklistPhrases(t), []);
  assertEquals(detectNonEngagedStateAssertions(t, new Set(["California", "Texas"])), []);
});

Deno.test("doc182 — canada mode is untouched: no supplement, no addenda, the accountability clause intact", () => {
  const doc = assembleDpaDocument({ ...BASE, documentType: "canada", controllerJurisdiction: "Canada (federal / PIPEDA)", processorJurisdiction: "Ontario (PHIPA)" });
  const t = doc.document_text;
  assertStringIncludes(t, "4.7 (Accountability — PIPEDA Schedule 1, Principle 1");
  assert(!t.includes("OPTIONAL PROVISIONS"));
  assert(!t.includes("DATA PROTECTION ASSESSMENTS AND REGULATORY ASSISTANCE"));
  assertEquals(doc.contract.addenda.length, 0);
  assertEquals(checkDpaCompleteness(doc), []);
});

Deno.test("doc182 — engagement derivation: aliases, sectoral-only states, Ukraine, mechanisms", () => {
  const e1 = deriveDpaEngagement({ documentType: "dual-eu-us", controllerJurisdiction: "Germany", processorJurisdiction: "ca", includeTransferClause: true, transferMechanism: "Binding Corporate Rules" });
  assertEquals(e1.californiaEngaged, true);
  assertEquals(e1.euSccExhibit, false);
  assertEquals(e1.ukAddendumExhibit, false);
  const e2 = deriveDpaEngagement({ documentType: "dual-eu-us", controllerJurisdiction: "France", processorJurisdiction: "New York", includeTransferClause: false, transferMechanism: "" });
  assertEquals(e2.usStatesEngaged, []);
  assertEquals(e2.usStatesWithoutComprehensiveLaw, ["New York"]);
  assertEquals(assembleDpaDocument({ ...BASE, documentType: "dual-eu-us", processorJurisdiction: "New York" }).contract.addenda.length, 0, "a sectoral-only state attaches no addendum");
  const e3 = deriveDpaEngagement({ documentType: "gdpr", controllerJurisdiction: "Ukraine", processorJurisdiction: "Germany", includeTransferClause: false, transferMechanism: "" });
  assertEquals(e3.ukEngaged, false);
  const e4 = deriveDpaEngagement({ documentType: "gdpr", controllerJurisdiction: "Germany", processorJurisdiction: "Germany", includeTransferClause: true, transferMechanism: "UK IDTA / UK Addendum to EU SCCs" });
  assertEquals([e4.euSccExhibit, e4.ukAddendumExhibit], [true, true]);
  const e5 = deriveDpaEngagement({ documentType: "gdpr", controllerJurisdiction: "Germany", processorJurisdiction: "Germany", includeTransferClause: true, transferMechanism: "Adequacy decision or regulations" });
  assertEquals([e5.euSccExhibit, e5.ukAddendumExhibit], [false, false]);
});

Deno.test("doc182 — the covered-law table omits the four unverified 2026 enactments and the sectoral-only states", () => {
  const states = DPA_US_COVERED_STATE_LAWS.map((l) => l.state);
  for (const absent of ["Alabama", "Louisiana", "Oklahoma", "Vermont", "New York", "Washington", "Illinois", "Massachusetts"]) {
    assert(!states.includes(absent), `${absent} must not be in the covered-law table`);
  }
  assertEquals(states.length, 13);
  assertStringIncludes(DPA_US_COVERED_STATE_LAWS.find((l) => l.state === "Virginia")!.citation, "59.1-575");
  assertStringIncludes(DPA_US_COVERED_STATE_LAWS.find((l) => l.state === "Tennessee")!.citation, "47-18-3201");
});

Deno.test("doc182 — the formal-instrument renderer: Georgia, prompts converted and counted, addenda rendered, no chrome, no draft", () => {
  const doc = assembleDpaDocument({
    ...BASE,
    documentType: "dual-eu-us",
    processorJurisdiction: "California",
    californiaEngaged: true,
    includeTransferClause: true,
    transferMechanism: "EU Standard Contractual Clauses (SCCs)",
  });
  const html = buildDpaFormalInstrumentHTML(doc.contract, { title: "Your Custom DPA — Acme GmbH / CloudOps GmbH", metaLine: "Generated September 4, 2026 · Dual EU/US", scheduleHtml: "<div>SCHEDULE-STUB</div>" });
  assertStringIncludes(html, "font-family: Georgia");
  assertStringIncludes(html, "<h1>Data Processing Agreement</h1>");
  assertStringIncludes(html, "CUSTOMER COMPLETION REQUIRED");
  assert(!html.includes("[TO BE COMPLETED:"), "raw placeholder token reached the rendered instrument");
  assertStringIncludes(html, '<em class="fi-fill">[jurisdiction of formation]</em>');
  const tbcInSource = (JSON.stringify(doc.contract).match(/\[TO BE COMPLETED:/g) ?? []).length;
  assertEquals(countFills(html), tbcInSource, "every placeholder becomes exactly one prompt");
  assertStringIncludes(html, "<h1>CCPA Service Provider Addendum</h1>");
  assertStringIncludes(html, "<h1>EU Standard Contractual Clauses — Module Two Implementation Exhibit</h1>");
  assertStringIncludes(html, "Schedule A — Specific Business Purposes and California Personal Information");
  assertStringIncludes(html, "SCHEDULE-STUB");
  assertStringIncludes(html, "<h2>4. Data Processing — Obligations of the Processor</h2>");
  assert(!html.includes("eup-bar") && !html.includes("logo.png") && !html.includes("Privacy Intelligence"), "navy chrome in contract mode");
  assert(!/\bdraft\b/i.test(html));
  assert(!html.includes("&amp;amp;"));
});

Deno.test("doc182 — the handler skips the clause-numbering net on the deterministic path and keeps the fail-loud gate", () => {
  const src = Deno.readTextFileSync(new URL("../../../supabase/functions/generate-dpa/index.ts", import.meta.url));
  assertStringIncludes(src, "lintReportText(parsed.dpa_text, { checkClauseNumbering: !dpaDeterministicPath })");
  assertStringIncludes(src, "if (dpaDeterministicPath && hasHardViolations(lint)) {");
});

Deno.test("doc182 — promptify escapes once and marks negotiable numbers", () => {
  assertEquals(promptify("within [48] hours & [TO BE COMPLETED: the <event>]"), `within <span class="fi-neg">[48]</span> hours &amp; <em class="fi-fill">[the &lt;event&gt;]</em>`);
});
