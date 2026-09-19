// /all-ptest v2 (DOC 261, 2026-09-14) — STAGE 1 LINT: rule tests and the
// PERFECT-panel gate.
//
// Part 1 — every rule fires on a synthetic document built to violate it, and
//          stays silent on the matching clean shape (positive + negative per
//          rule, so a regex edit cannot silently blind a rule).
// Part 2 — the lint profiles' pinned registry-section lists equal what the
//          live verified-authority registries cover (drift fails the build).
// Part 3 — the PERFECT golden panel of all three products, rendered through
//          the production call chains, produces ZERO defect-severity hits.
//          Review-severity hits (registry gaps, empty cells outside the
//          exempt list) are printed, not asserted, so a registry gap is
//          visible without blocking the panel.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { RenderedSkeletonDocument } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { LINT_RULE_IDS, lintDocument, type LintHit, type LintProfile } from "../../../supabase/functions/ptest-run-driver/_local/review/lint.ts";
import {
  ADMT_LINT_PROFILE,
  ADMT_REGISTRY_SECTIONS,
  CYBER_LINT_PROFILE,
  CYBER_REGISTRY_SECTIONS,
  RISK_LINT_PROFILE,
  RISK_REGISTRY_SECTIONS,
} from "../../../supabase/functions/ptest-run-driver/_local/review/lint-profiles.ts";
import { RISK_VERIFIED_AUTHORITY_ROWS } from "../../../supabase/functions/_shared/registry/risk-verified-authorities.ts";
import { ADMT_VERIFIED_AUTHORITY_ROWS } from "../../../supabase/functions/run-admt-checker-v2/_local/registry/admt-verified-authorities.ts";
import { CYBER_AUTHORITY_LOCATORS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/registry/cyber-verified-authorities.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts";
import { ADMT_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { CYBER_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { gatherCitations } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-citations.ts";
import { vaRegistryAsProvisions } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-corpus.ts";
import { buildAuthorityExhibit } from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import {
  buildCyberComponentRecommendations,
  buildCyberNextSteps,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";

type Bag = Record<string, unknown>;

// ── Synthetic document builder ──────────────────────────────────────────────

type Para = string | { table: { key: string; title?: string; columns: string[]; rows: string[][] } };

function doc(sections: Array<{ id: string; title: string; paragraphs: Para[] }>): RenderedSkeletonDocument {
  return {
    _typed: "skeleton-document@so-wire-in",
    spine_version: "test",
    title: "Test Document",
    subtitle: "",
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      paragraphs: s.paragraphs.map((p) =>
        typeof p === "string"
          ? { kind: "generated", text: p }
          : { kind: "table", text: "", table: { key: p.table.key, surface: "", title: p.table.title ?? "", columns: p.table.columns, rows: p.table.rows } }
      ),
    })),
  };
}

const BARE: LintProfile = {
  product: "test",
  registrySections: [7150, 7152],
  citeAllowlist: [7001],
  byDesignDuplicates: [],
  labelPairs: [],
  emptyCellExemptTables: [],
};

const hitsFor = (rule: string, hits: readonly LintHit[]) => hits.filter((h) => h.rule === rule);

// Minimal clean shell: two numbered sections, one appendix, one lettered subsection.
const CLEAN_SECTIONS = [
  { id: "cover", title: "Assessment Profile", paragraphs: [{ table: { key: "cover:0", columns: ["Field", "Value"], rows: [["Assessment date", "2026-09-14"]] } }] },
  { id: "s1", title: "1. Method", paragraphs: ["A. The Question. This assessment asks one question."] },
  { id: "s2", title: "2. Analysis", paragraphs: ["B. The Facts. See § 1.A, Section 1 and Appendix A for the record."] },
  { id: "ax", title: "Appendix A — Record", paragraphs: ["The record."] },
];

// ── Part 1: one positive and one negative per rule ──────────────────────────

Deno.test("lint — the clean shell produces no hits", () => {
  const r = lintDocument(doc(CLEAN_SECTIONS), BARE);
  assertEquals(r.hits, []);
  assertEquals(LINT_RULE_IDS.length, 10);
});

Deno.test("L-XREF — unresolved section / subsection / appendix / step and Roman numerals fire; resolved ones do not", () => {
  const d = doc([
    ...CLEAN_SECTIONS,
    { id: "s3", title: "3. Refs", paragraphs: [
      "See § 4.C and Sections 2 and 9 and Appendix Q.",
      "Step 1 — Triggers. See Step 3.",
      "See Section II and § IV.A.",
      "Statutory references are untouched: Section 7152(a)(5) and § 7150(b)(3).",
    ] },
  ]);
  const x = hitsFor("L-XREF", lintDocument(d, BARE).hits);
  const checks = x.map((h) => `${h.check}:${h.quote}`);
  assert(checks.some((c) => c.startsWith("unresolved_subsection:§ 4.C")), JSON.stringify(checks));
  assert(checks.some((c) => c.startsWith("unresolved_section:Sections 2 and 9")), JSON.stringify(checks));
  assert(checks.some((c) => c.startsWith("unresolved_appendix:Appendix Q")), JSON.stringify(checks));
  assert(checks.some((c) => c.startsWith("unresolved_step:Step 3")), JSON.stringify(checks));
  assertEquals(x.filter((h) => h.check === "roman_numeral_scheme").length, 2, JSON.stringify(checks));
  assert(!checks.some((c) => c.includes("7152") || c.includes("7150")), "statutory sections must never be treated as cross-references");
  // Section 2 resolves (it is in the list with 9) — only 9 is reported.
  assert(!checks.some((c) => c.includes("Section 2 names no")), JSON.stringify(checks));
});

Deno.test("L-QUOTE — unbalanced curly quotes and an odd straight quote fire", () => {
  const d = doc([...CLEAN_SECTIONS, { id: "q", title: "3. Quotes", paragraphs: [
    "The Company answers “Yes to the question.",
    "The Company answers \"Yes to the question.",
    "Balanced: “Yes” and \"No\".",
  ] }]);
  const q = hitsFor("L-QUOTE", lintDocument(d, BARE).hits);
  assertEquals(q.map((h) => h.check).sort(), ["odd_straight", "unbalanced_curly"]);
});

Deno.test("L-CITE — nested en-dash range, §§ before a single cite and a three-digit section fire; ranges, lists and Civil Code decimals do not", () => {
  const d = doc([...CLEAN_SECTIONS, { id: "c", title: "3. Cites", paragraphs: [
    "Bad: 11 CCR § 7222(b)(3)–(b)(3)(A).",
    "Bad: §§ 7150(a) alone.",
    "Bad: § 715.",
    "Fine: 11 CCR §§ 7150–7157; §§ 7152(a)(5)–(6); § 7220(b)(2)–(3); §§ 7001(ddd), 7200(a); § 7221(c)–(h), (n).",
    "Fine: Cal. Civ. Code § 1798.140(ae) and Civ. Code § 3426.1 are Civil Code sections, not CCR.",
    "Review: 11 CCR § 7300 has no registry row.",
  ] }]);
  const c = hitsFor("L-CITE", lintDocument(d, { ...BARE, registrySections: [7150, 7152, 7157, 7200, 7220, 7221, 7222] }).hits);
  const checks = c.map((h) => `${h.check}:${h.quote}`);
  assert(checks.some((x) => x.startsWith("nested_range:")), JSON.stringify(checks));
  assert(checks.some((x) => x.startsWith("plural_single:§§ 7150(a)")), JSON.stringify(checks));
  assert(checks.some((x) => x.startsWith("malformed:§ 715")), JSON.stringify(checks));
  assert(checks.some((x) => x.startsWith("cite_not_in_registry:") && x.includes("7300")), JSON.stringify(checks));
  assert(!checks.some((x) => x.includes("1798") || x.includes("3426")), `Civil Code cites must not be linted as CCR: ${JSON.stringify(checks)}`);
  assert(!checks.some((x) => x.includes("7152(a)(5)–(6)") || x.includes("7220(b)(2)–(3)") || x.includes("7150–7157")), JSON.stringify(checks));
  assertEquals(c.filter((h) => h.severity === "defect").length, 3, JSON.stringify(checks));
});

Deno.test("L-PROMISE — a body pointer to the Follow-Ups fires when § 4.D renders no Follow-Ups list, and not when it does", () => {
  const profile: LintProfile = { ...BARE, promise: RISK_LINT_PROFILE.promise };
  const body = { id: "s3", title: "3. Body", paragraphs: ["The category remains to be identified (Follow-Ups, § 4.D)."] };
  const withList = { id: "iv_determination", title: "4. Determination", paragraphs: ["D. Conditions, Follow-Ups, and Recommendations.", "Follow-Ups.\n1. Identify the category."] };
  const withoutList = { id: "iv_determination", title: "4. Determination", paragraphs: ["D. Conditions, Follow-Ups, and Recommendations.", "No follow-ups are identified."] };
  assertEquals(hitsFor("L-PROMISE", lintDocument(doc([...CLEAN_SECTIONS, body, withList]), profile).hits).length, 0);
  const bad = hitsFor("L-PROMISE", lintDocument(doc([...CLEAN_SECTIONS, body, withoutList]), profile).hits);
  assertEquals(bad.length, 1);
  assertEquals(bad[0].check, "unkept_promise");
});

Deno.test("L-LABEL — a status that differs between the executive table and the body table fires; a parenthetical qualifier does not", () => {
  const profile: LintProfile = { ...BARE, labelPairs: [{ name: "t", a: { table: "exec:1", joinCol: 0, valueCol: 1 }, b: { table: "body:1", joinCol: 0, valueCol: 1 } }] };
  const mk = (execVal: string, bodyVal: string) => doc([...CLEAN_SECTIONS,
    { id: "exec", title: "3. Exec", paragraphs: [{ table: { key: "exec:1", columns: ["Risk", "Residual"], rows: [["(A) Access", execVal]] } }] },
    { id: "body", title: "4. Body", paragraphs: [{ table: { key: "body:1", columns: ["Risk", "Remaining"], rows: [["(A) Access", bodyVal]] } }] },
  ]);
  assertEquals(hitsFor("L-LABEL", lintDocument(mk("Moderate (reduced)", "Moderate"), profile).hits).length, 0);
  const bad = hitsFor("L-LABEL", lintDocument(mk("Low", "Moderate"), profile).hits);
  assertEquals(bad.length, 1);
  assertEquals(bad[0].check, "status_mismatch");
});

Deno.test("L-LEADIN — a colon lead-in followed by prose or ending its section fires; one followed by a table or list does not", () => {
  const d = doc([...CLEAN_SECTIONS, { id: "l", title: "3. Lead-ins", paragraphs: [
    "The triggers are the following:",
    { table: { key: "l:1", columns: ["Trigger", "Result"], rows: [["x", "y"]] } },
    "The steps are the following:",
    "1. First step.",
    "The problem is this:",
    "Prose follows the lead-in without a list.",
    "And this ends the section:",
  ] }]);
  const l = hitsFor("L-LEADIN", lintDocument(d, BARE).hits);
  assertEquals(l.length, 2, JSON.stringify(l));
  assert(l[0].quote.endsWith("this:") && l[1].quote.endsWith("section:"));
});

Deno.test("L-LEADIN — a lead-in answered by prose items with different openers, closed by the next lettered sub-heading, is the announced list (run 6001444d)", () => {
  const d = doc([...CLEAN_SECTIONS, { id: "l", title: "3. Lead-ins", paragraphs: [
    "F. Benefits. Here, the Company has identified the following benefits:",
    "The consumer benefit carries material weight: the Company identifies “faster checkout”.",
    "No business benefit is identified, and none is credited.",
    "The other-stakeholder benefit carries limited weight: the Company identifies “fewer disputes”.",
    "G. Material privacy risks. The record identifies two.",
    "The dangling one is this:",
    "One paragraph of prose.",
    "Another paragraph of prose.",
    "Yet another paragraph.",
    "Still more prose here.",
    "Further prose follows.",
    "More text again.",
    "Additional prose here.",
    "Nearly the last paragraph.",
    "Finally the ninth paragraph.",
  ] }]);
  const l = hitsFor("L-LEADIN", lintDocument(d, BARE).hits);
  assertEquals(l.length, 1, JSON.stringify(l));
  assert(l[0].quote.endsWith("is this:"));
});

Deno.test("L-ENUM — snake_case tokens, UPPER_SNAKE, runtime values, unfilled slots and UUIDs fire; URLs and e-mails do not", () => {
  const d = doc([...CLEAN_SECTIONS, { id: "e", title: "3. Enums", paragraphs: [
    "The value q4_pi_categories leaked, and so did NOT_RECORDED and undefined and {entity_name} and 3f2504e0-4f89-11d3-9a0c-0305e82c3301.",
    "Fine: https://www.example.com/privacy_policy and privacy_team@example.com and policy_v2.pdf.",
  ] }]);
  const e = hitsFor("L-ENUM", lintDocument(d, BARE).hits);
  assertEquals(e.map((h) => h.check).sort(), ["runtime_value_leak", "snake_case_token", "unfilled_slot", "upper_snake_token", "uuid"], JSON.stringify(e));
});

Deno.test("L-DUP — a sentence rendered twice in one section fires; by-design repeats and cross-section repeats do not", () => {
  const S = "The Company reports that it does not use a third-party ADMT for this System and no vendor analysis applies.";
  const d = doc([...CLEAN_SECTIONS,
    { id: "d", title: "3. Dup", paragraphs: [S, `Context. ${S}`] },
    { id: "d2", title: "4. Other", paragraphs: [S] },
  ]);
  assertEquals(hitsFor("L-DUP", lintDocument(d, BARE).hits).length, 1);
  assertEquals(hitsFor("L-DUP", lintDocument(d, { ...BARE, byDesignDuplicates: [/third-party ADMT/] }).hits).length, 0);
});

Deno.test("L-CELL — a colon lead-in cell fires as a defect; an empty non-first cell is a review unless the table is exempt", () => {
  const mk = (key: string) => doc([...CLEAN_SECTIONS, { id: "t", title: "3. Table", paragraphs: [
    { table: { key, columns: ["Element", "Determination", "Basis"], rows: [["Purpose", "The basis is:", ""], ["Scope", "Met", "Record"]] } },
  ] }]);
  const hits = hitsFor("L-CELL", lintDocument(mk("t:1"), BARE).hits);
  assertEquals(hits.map((h) => `${h.check}/${h.severity}`).sort(), ["colon_lead_in_cell/defect", "empty_cell/review"]);
  const exempt = hitsFor("L-CELL", lintDocument(mk("signature:1"), { ...BARE, emptyCellExemptTables: [/^signature:/] }).hits);
  assertEquals(exempt.map((h) => h.check), ["colon_lead_in_cell"]);
});

Deno.test("L-DATE — an approval date before the assessment date fires without the qualifier; 'prior version' fires without a recorded prior date", () => {
  const profile: LintProfile = { ...BARE, dateRule: RISK_LINT_PROFILE.dateRule };
  const gov = (text: string) => doc([...CLEAN_SECTIONS, { id: "v_governance", title: "5. Governance", paragraphs: [text] }]);
  const unqualified = gov("A. Approval. The Company records approval by L. Whitcomb on 2025-08-01.");
  const qualified = gov("A. Approval. The Company records approval by L. Whitcomb on 2025-08-01. That date precedes the date of this assessment (2026-09-14); which version it approves remains to be confirmed.");
  assertEquals(hitsFor("L-DATE", lintDocument(unqualified, profile).hits).map((h) => h.check), ["approval_before_assessment_unqualified"]);
  assertEquals(hitsFor("L-DATE", lintDocument(qualified, profile).hits).length, 0);
  const prior = gov("This is a prior version of the assessment.");
  assertEquals(hitsFor("L-DATE", lintDocument(prior, profile, {}).hits).map((h) => h.check), ["prior_language_without_prior_date"]);
  assertEquals(hitsFor("L-DATE", lintDocument(prior, profile, { prior_risk_assessment_date: "2025-01-01" }).hits).length, 0);
  assertEquals(hitsFor("L-DATE", lintDocument(prior, profile).hits).length, 0, "intake-gated: skipped when no intake is supplied");
});

// ── Part 2: pinned registry coverage equals the live registries ─────────────

// 11 CCR citations only — the risk and ADMT registries also carry two Civil
// Code rows (§§ 1798.140, 1798.185), which L-CITE form-checks but never
// tests for membership.
const sectionsOf = (cites: readonly string[]): number[] =>
  Array.from(new Set(cites.filter((c) => /^11\s?CCR/.test(c)).map((c) => Number(/§\s?(\d{4})/.exec(c)?.[1] ?? 0)).filter((n) => n > 0))).sort((a, b) => a - b);

Deno.test("lint profiles — pinned registry sections equal the live verified-authority registries", () => {
  assertEquals([...RISK_REGISTRY_SECTIONS].sort((a, b) => a - b), sectionsOf(RISK_VERIFIED_AUTHORITY_ROWS.map((r) => r.citation)));
  assertEquals([...ADMT_REGISTRY_SECTIONS].sort((a, b) => a - b), sectionsOf(ADMT_VERIFIED_AUTHORITY_ROWS.map((r) => r.citation)));
  assertEquals([...CYBER_REGISTRY_SECTIONS].sort((a, b) => a - b), sectionsOf(CYBER_AUTHORITY_LOCATORS.map((r) => r.citation)));
});

// ── Part 3: the PERFECT panel renders with zero defect-severity hits ────────

const DATE = "2026-09-14";

async function riskDoc(intake: Bag): Promise<RenderedSkeletonDocument> {
  const gen = await generateCppaRiskReport(intake, {
    buildStamp: "ptest-lint", pass1: "deterministic", pass2rEnabled: false, refinementEnabled: false, euCorpus: [], reportDate: DATE,
  });
  return gen.report.skeleton_document as RenderedSkeletonDocument;
}

function admtDoc(intake: Bag): RenderedSkeletonDocument {
  const computed = computeAdmtV2(intake);
  const citations = gatherCitations(computed.allFindings.map((f) => f.authority).filter(Boolean));
  const exhibit = buildAuthorityExhibit(citations, vaRegistryAsProvisions());
  return assembleAdmtV2Document({
    intake, computed, exhibit,
    organizationName: String(intake.organization_name ?? "").trim(),
    systemName: String(intake.system_name ?? "").trim(),
  }) as unknown as RenderedSkeletonDocument;
}

function cyberDoc(intake: Bag): RenderedSkeletonDocument {
  const d = buildCyberDeliverables(intake);
  const recommendations = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, [], DATE);
  const nextSteps = buildCyberNextSteps(recommendations, String(((intake.profile ?? {}) as Bag).remediation_owner ?? ""));
  const report: Bag = {
    ...(d as unknown as Bag),
    authority_exhibit: { entries: [] },
    _meta: { internal: { cyber_recommendations: { recommendations, next_steps: nextSteps } } },
  };
  return assembleCyberSkeletonDocumentV4(report, intake, "", DATE).document;
}

function report(id: string, hits: readonly LintHit[]): void {
  for (const h of hits) console.log(`  [${id}] ${h.rule}/${h.check}/${h.severity} ${h.block_key} — ${h.detail} :: "${h.quote.slice(0, 120)}"`);
}

// KNOWN DEFECTS ON THE PERFECT PANEL. Genuine class-(d) hits the lint found
// on first run are pinned here so the gate is "no NEW defects" until the
// product is fixed; each entry is a CEO fix decision, not a lint exemption.
// Remove an entry when its fix lands — the gate then enforces zero.
//   admt/access#p2 (2026-09-14) — fixed 2026-09-16 (CEO, doc 262 §2.3): the
//   determination sentence now precedes the lead-in. No entry remains.
const KNOWN_DEFECTS: Readonly<Record<string, readonly string[]>> = {};

const defectKeys = (hits: readonly LintHit[]): string[] =>
  hits.filter((h) => h.severity === "defect").map((h) => `${h.rule}/${h.check}@${h.block_key}`).sort();

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`lint gate [cppa-risk] ${c.id} — no defect-severity hits on the PERFECT panel beyond the pinned known list`, async () => {
    const r = lintDocument(await riskDoc(c.intake), RISK_LINT_PROFILE, c.intake);
    report(c.id, r.hits);
    assertEquals(defectKeys(r.hits), [...(KNOWN_DEFECTS[c.id] ?? [])].sort());
  });
}
for (const c of ADMT_PERFECT) {
  Deno.test(`lint gate [cppa-admt] ${c.id} — no defect-severity hits on the PERFECT panel beyond the pinned known list`, () => {
    const r = lintDocument(admtDoc(c.intake), ADMT_LINT_PROFILE, c.intake);
    report(c.id, r.hits);
    assertEquals(defectKeys(r.hits), [...(KNOWN_DEFECTS[c.id] ?? [])].sort());
  });
}
for (const c of CYBER_PERFECT) {
  Deno.test(`lint gate [cppa-cyber] ${c.id} — no defect-severity hits on the PERFECT panel beyond the pinned known list`, () => {
    const r = lintDocument(cyberDoc(c.intake), CYBER_LINT_PROFILE, c.intake);
    report(c.id, r.hits);
    assertEquals(defectKeys(r.hits), [...(KNOWN_DEFECTS[c.id] ?? [])].sort());
  });
}
