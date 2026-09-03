// DOC 159 (2026-09-03) — CPPA Cyber model-vs-law build: the deterministic
// path (CYBER_DETERMINISTIC_ENABLED) read against 11 CCR §§ 7120–7124 and
// § 7001, with the seven audits of doc 154 Part A. One test per designed
// state the build introduced; each names the provision it applies.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  cppaCybersecurityContract,
  CYBER_INCIDENT_NOTIFICATION_OPTIONS,
  CYBER_MATURITY_OPTIONS,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-cybersecurity.ts";
import {
  CYBER_INCIDENT_NOTIFICATION_OPTIONS as FORM_NOTIFICATION_OPTIONS,
  MATURITY as FORM_MATURITY,
} from "../../../src/pages/CPPACybersecurity.enums.ts";
import { FIELD_ENUM_MIRROR } from "../../../supabase/functions/_shared/field-enums.ts";
import { FIELD_LABELS } from "../../../supabase/functions/_shared/customer-messages.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";
import { CYBER_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import { emptyAskedKeys } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import {
  buildCyberFactors,
  buildRecordCompletionExtras,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";
import {
  buildCyberComponentRecommendations,
  buildCyberNextSteps,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import {
  NOT_APPLICABLE_MATURITY,
  countWord,
  frameworkFact,
  priorAuditFact,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/record-facts.ts";
import { attachCyberCorpus } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-corpus-attach.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { buildCyberApplicabilityTable } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-applicability.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
const base = (): Bag => clone(CYBER_PERFECT[0].intake as Bag);
const profile = (i: Bag): Bag => i.profile as Bag;
const control = (i: Bag, slug: string): Bag => (i.controls as Bag[]).find((c) => c.key === slug)!;

function assemble(intake: Bag) {
  const d = buildCyberDeliverables(intake);
  const s4 = attachCyberCorpus();
  const recs = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, s4);
  const next = buildCyberNextSteps(recs, String(profile(intake).remediation_owner ?? ""));
  const view: Bag = {
    ...(d as unknown as Bag),
    _meta: { internal: { cyber_corpus_s4: s4, cyber_recommendations: { recommendations: recs, next_steps: next } } },
  };
  const sk = assembleCyberSkeletonDocumentV4(view, intake, "", "2026-09-03");
  return { d, recs, next, sk, text: skeletonDocumentToText(sk.document) };
}

function factors(intake: Bag) {
  const d = buildCyberDeliverables(intake);
  const s4 = attachCyberCorpus();
  const recs = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, s4);
  const next = buildCyberNextSteps(recs, "");
  return { d, f: buildCyberFactors(intake, d, recs, next, new Map(s4.map((e) => [e.slug, e.commentary]))) };
}

// ── Contract, form, mirrors ──────────────────────────────────────────────

Deno.test("doc159 — the not-applicable maturity is the sixth option, verbatim in contract, form and mirror", () => {
  assertEquals(CYBER_MATURITY_OPTIONS[5], NOT_APPLICABLE_MATURITY);
  assertEquals([...CYBER_MATURITY_OPTIONS], [...FORM_MATURITY]);
  assertEquals([...FIELD_ENUM_MIRROR["cppa_cybersecurity:maturity"]!], [...CYBER_MATURITY_OPTIONS]);
});

Deno.test("doc159 — the notification options match across contract, form and mirror; the field is conditional on an incident", () => {
  assertEquals([...CYBER_INCIDENT_NOTIFICATION_OPTIONS], [...FORM_NOTIFICATION_OPTIONS]);
  assertEquals([...FIELD_ENUM_MIRROR["cppa_cybersecurity:incident_notifications"]!], [...CYBER_INCIDENT_NOTIFICATION_OPTIONS]);
  const f = cppaCybersecurityContract.fields.find((x) => x.key === "profile.incident_notifications")!;
  assertEquals(f.required, "conditional");
  assertEquals(f.trigger?.key, "profile.incidents_12mo");
  assertEquals([...(f.trigger?.equals ?? [])], ["1", "2–5", "More than 5"]);
});

Deno.test("doc159 — the not-applicable basis is conditional on the maturity value, over the array rows", () => {
  const f = cppaCybersecurityContract.fields.find((x) => x.key === "controls[].na_reason")!;
  assertEquals(f.required, "conditional");
  assertEquals(f.trigger?.key, "controls[].maturity");
  assertEquals([...(f.trigger?.equals ?? [])], [NOT_APPLICABLE_MATURITY]);
  // Perfect record (no incident notification asked away, no N/A): still zero empty asked keys.
  assertEquals(emptyAskedKeys(cppaCybersecurityContract, CYBER_PERFECT[0].intake), []);
  // An N/A control without a basis is an empty asked key; with one, it is not.
  const i = base();
  control(i, "c14_secure_dev").maturity = NOT_APPLICABLE_MATURITY;
  assert(emptyAskedKeys(cppaCybersecurityContract, i).includes("controls[].na_reason"));
  control(i, "c14_secure_dev").na_reason = "The Company writes no software.";
  assert(!emptyAskedKeys(cppaCybersecurityContract, i).includes("controls[].na_reason"));
});

Deno.test("doc159 — labels and the grader instrument carry the build", () => {
  assert("profile.incident_notifications" in FIELD_LABELS);
  assert("controls[].na_reason" in FIELD_LABELS);
  assert(GRADER_CONTEXT_VERSION.includes("+cyber-law-map-2026-09-03"), GRADER_CONTEXT_VERSION);
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-2026-08-28-skeleton-cal-3-item204["), "prefix kept");
});

// ── § 7123(b)(2) — the Company's not-applicable position ─────────────────

Deno.test("doc159 — § 7123(b)(2): a not-applicable component is recorded, cited, and outside every readiness count", () => {
  const i = base();
  control(i, "c14_secure_dev").maturity = NOT_APPLICABLE_MATURITY;
  control(i, "c14_secure_dev").na_reason = "The Company writes no software; every application is vendor-hosted SaaS.";
  const d = buildCyberDeliverables(i);
  const cov = d.component_coverage.find((c) => c.slug === "c14_secure_dev")!;
  assertEquals(cov.verdict, "not_applicable");
  assertEquals(cov.status, "analysed");
  assertEquals(cov.in_scope, false);
  assertStringIncludes(cov.application, "11 CCR § 7123(b)(2)");
  assertStringIncludes(cov.record_fact, "writes no software");
  const ev = d.evidence_sufficiency.find((e) => e.slug === "c14_secure_dev")!;
  assertEquals(ev.sufficiency, "not_applicable");
  const rd = d.readiness_determination;
  assertEquals(rd.conclusion, "ready");
  assertEquals(rd.blocking_components.length, 0);
  assertEquals(rd.unassessable_components.length, 0);
  assertEquals(rd.not_applicable_components?.map((x) => x.slug), ["c14_secure_dev"]);
  assertStringIncludes(rd.headline, "all 17 applicable § 7123(c) components");
  assertStringIncludes(rd.headline, "one component as not applicable");
  // No recommendation is minted for it; the position is not a gap.
  const recs = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, []);
  assert(!recs.some((r) => r.slug === "c14_secure_dev"));
});

Deno.test("doc159 — § 7123(b)(2): the same answer as 'Not implemented' would have blocked readiness (the defect the option closes)", () => {
  const i = base();
  control(i, "c14_secure_dev").maturity = "Not implemented";
  const d = buildCyberDeliverables(i);
  assertEquals(d.readiness_determination.conclusion, "not_ready");
});

Deno.test("doc159 — § 7123(b)(2): a blank basis is a record-completion item, never a gap", () => {
  const i = base();
  control(i, "c14_secure_dev").maturity = NOT_APPLICABLE_MATURITY;
  control(i, "c14_secure_dev").na_reason = "";
  const { d, f } = factors(i);
  assertEquals(d.readiness_determination.conclusion, "ready");
  const extras = buildRecordCompletionExtras(i, d);
  assert(extras.some((x) => x.label === "Secure development and coding best practices" && /§ 7123\(b\)\(2\)/.test(x.action)));
  assertStringIncludes(f.record_sufficiency.follow_up, "state the basis for the component reported as not applicable");
  const mod = f.component_analyses.find((c) => c.slug === "c14_secure_dev")!;
  assertStringIncludes(mod.narrative, "Basis stated. None recorded");
});

Deno.test("doc159 — § 7123(b)(2): the assembled document carries the position in the snapshot, the module and the matrix, register-clean", () => {
  const i = base();
  control(i, "c14_secure_dev").maturity = NOT_APPLICABLE_MATURITY;
  control(i, "c14_secure_dev").na_reason = "The Company writes no software; every application is vendor-hosted SaaS.";
  const { sk, text } = assemble(i);
  assertEquals(sk.register_findings, []);
  assertEquals(sk.conformance.length, 0);
  assertStringIncludes(text, "Components reported not applicable | one — Secure development and coding best practices");
  assertStringIncludes(text, "Status. Reported by the Company as not applicable to its information system");
  assertStringIncludes(text, "Not applicable (Company's position)");
  assertStringIncludes(text, "Testable operating evidence identified for 17 of 17 applicable components");
  assert(!/\bnot_applicable\b/.test(text), "no raw enum token reaches the document");
});

// ── § 7122(g) — retention is reported, never rolled into the § 7122 verdict ──

Deno.test("doc159 — § 7122(g): a first-time auditee with a confirmed external auditor is not 'record insufficient' on auditor engagement", () => {
  const i = base();
  profile(i).last_audit = "Never";
  delete profile(i).prior_audit_scope;
  const d = buildCyberDeliverables(i);
  const ind = d.independence_determination;
  assertEquals(ind.verdict, "satisfied");
  assertEquals(ind.status, "analysed");
  const ret = ind.findings.find((x) => x.condition_key === "five_year_retention")!;
  assertEquals(ret.verdict, "not_applicable");
  assertEquals(ret.applies, false);
  assertStringIncludes(ret.record_fact, "has not had an independent cybersecurity audit");
  assertEquals(d.readiness_determination.conclusion, "ready");
});

Deno.test("doc159 — § 7122(g): a recorded audit with no described scope keeps the retention ask but no longer degrades the verdict", () => {
  const i = base();
  delete profile(i).prior_audit_scope;
  const d = buildCyberDeliverables(i);
  const ind = d.independence_determination;
  assertEquals(ind.verdict, "satisfied");
  const ret = ind.findings.find((x) => x.condition_key === "five_year_retention")!;
  assertEquals(ret.status, "record_insufficient");
  assertStringIncludes(ret.information_needed ?? "", "what the prior audit covered");
});

Deno.test("doc159 — § 7122(a): on the perfect record the confirmed external engagement is satisfied, and the summary no longer speaks of retention practice", () => {
  const d = buildCyberDeliverables(base());
  assertEquals(d.independence_determination.verdict, "satisfied");
  assert(!/retention practice/.test(d.independence_determination.summary));
});

// ── "Never" and the framework answers are read as answers ─────────────────

Deno.test("doc159 — 'Never' is no prior audit: context, reliance, cross-cutting, preservation and the register agree", () => {
  const i = base();
  profile(i).last_audit = "Never";
  delete profile(i).prior_audit_scope;
  const { d, f } = factors(i);
  assertStringIncludes(f.company_context_analysis, "has not had an independent cybersecurity audit");
  assert(!/recorded as Never|most recent: Never/.test(f.company_context_analysis));
  assertStringIncludes(f.prior_audit_reliance_analysis, "reports no prior independent cybersecurity audit");
  assert(!/record what the prior audit covered/.test(f.record_sufficiency.follow_up));
  assertStringIncludes(f.cross_cutting.prior_audit_dependency_gaps, "No prior audit coverage is recorded");
  assertStringIncludes(f.evidence_preservation.observations, "this first cycle");
  assert(!buildRecordCompletionExtras(i, d).some((x) => x.label === "Prior audit coverage"));
  assertEquals(priorAuditFact("Never", "some text").recorded, false);
});

Deno.test("doc159 — 'None / informal' and 'Other' are never spliced as framework names", () => {
  for (const [answer, needle] of [["None / informal", "no published framework"], ["Other", "a framework outside the listed set"]] as const) {
    const i = base();
    profile(i).framework = answer;
    const { d, f } = factors(i);
    assert(!f.company_context_analysis.includes(`organized around ${answer}`), answer);
    assertStringIncludes(f.company_context_analysis, needle);
    assertStringIncludes(f.program_readiness.analysis, needle);
    const est = d.program_obligation_findings.find((x) => x.key === "program_establishment")!;
    assert(!est.record_fact.includes(`identifies ${answer} as`), est.record_fact);
  }
  assertEquals(frameworkFact("ISO 27001").kind, "named");
  assertEquals(frameworkFact("").kind, "blank");
});

// ── § 7123(b)(1) — documentation from the evidence checklist ──────────────

Deno.test("doc159 — § 7123(b)(1): written documentation is counted from the evidence checklist, not the notes box", () => {
  const full = buildCyberDeliverables(base());
  const est = full.program_obligation_findings.find((x) => x.key === "program_establishment")!;
  assertEquals(est.verdict, "satisfied");
  assertStringIncludes(est.record_fact, "policy, procedure, runbook or SOP");
  // Every control keeps its notes but loses its policy/runbook evidence.
  const i = base();
  for (const c of i.controls as Bag[]) c.evidence = ["Screenshot / config export"];
  const stripped = buildCyberDeliverables(i);
  const est2 = stripped.program_obligation_findings.find((x) => x.key === "program_establishment")!;
  assertEquals(est2.verdict, "not_satisfied");
  // No evidence identified anywhere: the record cannot answer the question.
  const j = base();
  for (const c of j.controls as Bag[]) c.evidence = [];
  const est3 = buildCyberDeliverables(j).program_obligation_findings.find((x) => x.key === "program_establishment")!;
  assertEquals(est3.verdict, "record_insufficient");
  // One component documented: partial, naming the remaining count in words.
  const k = base();
  for (const c of k.controls as Bag[]) c.evidence = c.key === "c1_auth" ? ["Policy / procedure document"] : ["Sample log / report"];
  const est4 = buildCyberDeliverables(k).program_obligation_findings.find((x) => x.key === "program_establishment")!;
  assertEquals(est4.verdict, "partially_satisfied");
  assertStringIncludes(est4.information_needed ?? "", "17 applicable components");
});

// ── "Ready subject to named remediation" names its items ───────────────────

Deno.test("doc159 — the named-remediation conclusion names the items and carries no code identifiers", () => {
  const i = base();
  control(i, "c6_vuln_mgmt").maturity = "Documented, partially implemented";
  const { d, f } = factors(i);
  const rd = d.readiness_determination;
  assertEquals(rd.conclusion, "ready_subject_to_named_remediation");
  assertEquals(rd.remediation_items, ["Internal and external vulnerability scans, penetration testing, and vulnerability disclosure and reporting (documented, partially implemented)"]);
  assertStringIncludes(rd.headline, "subject to one named remediation item: Internal and external vulnerability scans");
  assert(!/`|component_coverage|evidence_sufficiency/.test(rd.reasoning), rd.reasoning);
  assertStringIncludes(rd.reasoning, "The named items are: Internal and external vulnerability scans");
  assertStringIncludes(f.overall.narrative, "once the named items are closed: Internal and external vulnerability scans");
  assert(!/closed: \./.test(f.overall.narrative));
});

Deno.test("doc159 — a policy-only component is a named item too", () => {
  const i = base();
  control(i, "c9_anti_malware").evidence = ["Policy / procedure document"];
  const d = buildCyberDeliverables(i);
  assertEquals(d.readiness_determination.conclusion, "ready_subject_to_named_remediation");
  assertStringIncludes(d.readiness_determination.remediation_items?.[0] ?? "", "Antivirus and antimalware protections (implemented, evidenced by policy documentation only)");
});

// ── § 7123(c)(1)(B) — the password predicate is read ──────────────────────

Deno.test("doc159 — § 7123(c)(1)(B): the Authentication module applies the password condition from the Company's own answer", () => {
  for (const [answer, needle] of [
    ["No", "does not apply on that answer"],
    ["Yes", "applies: strong, unique passwords or passphrases must be evidenced"],
    ["", "applies only if they are"],
  ] as const) {
    const i = base();
    profile(i).password_auth_used = answer;
    const { f } = factors(i);
    const mod = f.component_analyses.find((c) => c.slug === "c1_auth")!;
    assertStringIncludes(mod.narrative, "Passwords. ");
    assertStringIncludes(mod.narrative, needle);
    assertStringIncludes(mod.narrative, "11 CCR § 7123(c)(1)(B)");
  }
});

// ── § 7123(e)(9)/(10) — notifications ─────────────────────────────────────

Deno.test("doc159 — § 7123(e)(9)/(10): the notification answer decides the audit-report material named in Section 5", () => {
  const cases: Array<[string, string[], string]> = [
    ["No notification was required", ["call for no notification material"], ""],
    ["Affected consumers were notified (Civ. Code § 1798.82(a))", ["11 CCR § 7123(e)(9)", "sample copy of the notification"], "Notification material for the audit report"],
    ["An agency with jurisdiction over privacy laws in California was notified", ["11 CCR § 7123(e)(10)", "dates and details"], "Notification material for the audit report"],
    ["Both affected consumers and an agency were notified", ["11 CCR § 7123(e)(9)", "11 CCR § 7123(e)(10)"], "Notification material for the audit report"],
    ["Unsure", ["is unsure whether any reported incident required notification", "record-completion item"], "Notification record"],
    ["", ["is not recorded; 11 CCR § 7123(e)(9) and (e)(10) turn on it"], "Notification record"],
  ];
  for (const [answer, needles, extra] of cases) {
    const i = base();
    profile(i).incidents_12mo = "1";
    profile(i).incident_notifications = answer;
    const { d, f } = factors(i);
    for (const n of needles) assertStringIncludes(f.incident_readiness.analysis, n, `${answer || "(blank)"} → ${n}`);
    const extras = buildRecordCompletionExtras(i, d);
    if (extra) assert(extras.some((x) => x.label === extra), `${answer || "(blank)"} → ${extra}`);
    else assert(!extras.some((x) => /^Notification/.test(x.label)), answer);
    assertStringIncludes(f.incident_readiness.analysis, "nothing is inferred from the count alone");
  }
});

Deno.test("doc159 — § 7123(e)(9)/(10): with no incident the notification question is neither asked nor mentioned", () => {
  const i = base();
  profile(i).incidents_12mo = "None";
  delete profile(i).incident_notifications;
  assertEquals(emptyAskedKeys(cppaCybersecurityContract, i), []);
  const { d, f } = factors(i);
  assert(!/11 CCR § 7123(e)(9)|is unsure whether any reported incident|is not recorded; 11 CCR/.test(f.incident_readiness.analysis), f.incident_readiness.analysis);
  assert(!buildRecordCompletionExtras(i, d).some((x) => /^Notification/.test(x.label)));
});

// ── Applicability note, ad hoc prose, counts ───────────────────────────────

Deno.test("doc159 — the § 7120 table states the duty-bearer as law, without inferring the Company's status", () => {
  const t = buildCyberApplicabilityTable(profile(base()));
  assertStringIncludes(t.note ?? "", "a nonbusiness under 11 CCR § 7001(v)");
  assertStringIncludes(t.note ?? "", "Civ. Code § 1798.140(d)");
});

Deno.test("doc159 — 'Ad hoc / informal' is named as a documentation gap, and the verdict is unchanged", () => {
  const i = base();
  control(i, "c12_awareness").maturity = "Ad hoc / informal";
  const d = buildCyberDeliverables(i);
  const cov = d.component_coverage.find((c) => c.slug === "c12_awareness")!;
  assertEquals(cov.verdict, "not_satisfied");
  assertStringIncludes(cov.application, "11 CCR § 7123(b)(1)");
  assertStringIncludes(cov.application, "operates informally, without the written policies and procedures");
  assertStringIncludes(cov.remediation, "Document Cybersecurity awareness in written policies and procedures");
});

Deno.test("doc159 — counts under ten print as words in the readiness prose", () => {
  assertEquals(countWord(1), "one");
  assertEquals(countWord(17), "17");
  const i = base();
  control(i, "c14_secure_dev").maturity = "Not implemented";
  control(i, "c15_third_party").maturity = "Not implemented";
  const d = buildCyberDeliverables(i);
  assertStringIncludes(d.readiness_determination.headline, "two § 7123(c) components would be reported");
  assert(!/On this record/.test(d.readiness_determination.headline));
});

// ── The five renders stay register-clean ──────────────────────────────────

Deno.test("doc159 — every golden record and the first-time, informal and named-remediation variants render register-clean", () => {
  const variants: Bag[] = [base()];
  const a = base(); profile(a).last_audit = "Never"; delete profile(a).prior_audit_scope; variants.push(a);
  const b = base(); profile(b).framework = "None / informal"; variants.push(b);
  const c = base(); control(c, "c6_vuln_mgmt").maturity = "Documented, partially implemented"; variants.push(c);
  for (const v of variants) {
    const { sk, text } = assemble(v);
    assertEquals(sk.register_findings, []);
    assertEquals(sk.conformance.length, 0);
    assert(!/`/.test(text), "no backticks");
    assert(!/\bNone \/ informal\b(?!\")/.test(text.replace(/Primary (cybersecurity )?framework(:| \|) None \/ informal/g, "")), "framework answer never spliced into prose");
    assert(!/as Never\b|most recent: Never/.test(text), "'Never' never spliced as a date");
  }
});
