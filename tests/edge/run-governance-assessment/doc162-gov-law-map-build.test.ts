// DOC 162 (2026-09-03) — Governance model-vs-law build: the deterministic
// path (GOVERNANCE_DETERMINISTIC_ENABLED: typed domain tables →
// attachGovernanceDeliverables → readiness → assembleGovernanceSkeletonDocument)
// read against GDPR Arts. 5(2), 24, 30, 37–39 (verbatim from gdpr_articles),
// with the seven audits of doc 154 Part A. One test per designed state.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  governanceContract,
  RETENTION_SCHEDULE_STATUS,
} from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import { FIELD_LABELS } from "../../../supabase/functions/_shared/customer-messages.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";
import { GOVERNANCE_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/governance.ts";
import { GOVERNANCE_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/governance-perfect.ts";
import {
  attachGovernanceDeliverables,
  buildArt30ElementFindings,
  buildDemonstrabilityFindings,
  buildDpoDetermination,
  buildReviewAndUpdateFinding,
  questionNotAsked,
  sizeProse,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import {
  buildDomainFindingsTyped,
  composeExecutiveSummaryTyped,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";
import { assembleGovernanceSkeletonDocument, buildGovernanceSlotValues } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import { attachReadinessDetermination } from "../../../supabase/functions/_shared/ltp/governance-readiness.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
const PERFECT = () => clone(GOVERNANCE_PERFECT[0].intake);

function render(intake: Bag) {
  const report: Bag = { authority_exhibit: { entries: [] } };
  const domains = buildDomainFindingsTyped(intake);
  report.domain_findings = domains;
  report.executive_summary = composeExecutiveSummaryTyped(domains);
  attachGovernanceDeliverables(report, intake);
  attachReadinessDetermination(report);
  const sk = assembleGovernanceSkeletonDocument(report, intake);
  return { report, sk, text: skeletonDocumentToText(sk.document) };
}

function usOnly(): Bag {
  const i = PERFECT();
  i.jurisdictions = ["California (CCPA/CPRA)", "Other US States"];
  i.eu_uk_data = "No";
  i.org_size = "51-250";
  i.dpo_status = "n/a";
  i.dpa_status = "n/a";
  i.dpa_art28_verified = "n/a";
  i.transfer_status = "n/a";
  i.transfer_mechanism = "n/a";
  return i;
}

// ── R2: a gated-off question is not an unanswered one ───────────────────────

Deno.test("doc162 — the gate resolver reads the form's own gates", () => {
  const us = usOnly();
  assert(questionNotAsked(us, "dpo_status"));
  assert(questionNotAsked(us, "dpa_status"));
  assert(questionNotAsked(us, "transfer_status"));
  assert(!questionNotAsked(us, "privacy_policy"));
  const large = { ...us, org_size: "251-1000" };
  assert(!questionNotAsked(large, "dpo_status"), "the DPO question is asked of large organisations regardless");
  assert(!questionNotAsked(PERFECT(), "dpo_status"));
});

Deno.test("doc162 — a US-only record's DPO findings say the question was not put, and raise no remediation item", () => {
  const { report, text } = render(usOnly());
  const dpo = report.dpo_determination as Bag;
  for (const k of ["designation_trigger", "position_and_independence", "task_coverage"]) {
    const f = dpo[k] as Bag;
    assertStringIncludes(String(f.record_fact), "was not put to the company");
    assert(!String(f.record_fact).includes("does not match a designation state"), k);
  }
  assertEquals((dpo.position_and_independence as Bag).verdict, "not_applicable");
  assertEquals((dpo.task_coverage as Bag).verdict, "not_applicable");
  const plan = report.remediation_plan as Bag[];
  assert(!plan.some((p) => String(p.finding_key).startsWith("dpo_")), JSON.stringify(plan.map((p) => p.finding_key)));
  assert(!plan.some((p) => p.finding_key === "processor_contracts"), "processor-contract duty was not asked");
  assert(!text.includes("does not match a designation state this assessment recognises"));
  assert(!text.includes('The company reports "n/a"'));
});

Deno.test("doc162 — a US-only large organisation is still asked the DPO question, so an empty answer stays a gap", () => {
  const i = usOnly();
  i.org_size = "251-1000";
  i.dpo_status = "";
  const dpo = buildDpoDetermination(i);
  assertEquals((dpo.designation_trigger as Bag).verdict, "record_insufficient");
});

Deno.test("doc162 — an unrecognised (not gated) designation answer keeps the GOV-2 wording", () => {
  const dpo = buildDpoDetermination({ dpo_status: "Privacy lead appointed", org_size: "201-1000", sector: "AdTech", eu_uk_data: "Yes" }) as unknown as Bag;
  assertStringIncludes(String((dpo.position_and_independence as Bag).record_fact), "does not match a designation state this assessment recognises");
});

Deno.test("doc162 — the processor-contract duty and Art. 30(1)(a)/(e) evidence treat a gated-off key as answered by the gate", () => {
  const us = usOnly();
  const demo = buildDemonstrabilityFindings(us);
  const pc = demo.find((d) => d.key === "processor_contracts")!;
  assertEquals(pc.verdict, "not_applicable");
  assertEquals(pc.status, "analysed");
  assert(!pc.information_needed);
  const art30 = buildArt30ElementFindings(us);
  const a = art30.find((e) => e.element === "a")!;
  assertStringIncludes(a.record_fact, "not requested (no EU or UK personal data indicated)");
  assertEquals(a.verdict, "satisfied");
  const e = art30.find((e) => e.element === "e")!;
  assert(!String(e.information_needed ?? "").includes("the transfer status"), e.information_needed);
});

Deno.test("doc162 — no officer and none required rolls up to not applicable, and the crosswalk never says a designation is evidenced", () => {
  const i = PERFECT();
  i.org_size = "11-50";
  i.data_categories = ["Contact details"];
  i.special_category = "No";
  i.special_categories_list = [];
  i.dpo_status = "No";
  const dpo = buildDpoDetermination(i) as unknown as Bag;
  assertEquals(dpo.verdict, "not_applicable");
  const { text } = render(i);
  assert(!text.includes("Formal DPO designation evidenced"), "crosswalk claims a designation the record denies");
  assertStringIncludes(text, "Leadership and oversight | The DPO determination is not applicable on the information provided");
});

// ── R3: "Unsure" is not a cadence ───────────────────────────────────────────

Deno.test("doc162 — an Unsure review cadence is additional information required, not an infrequent cadence", () => {
  const i = PERFECT();
  i.measures_review_cadence = "Unsure";
  const f = buildReviewAndUpdateFinding(i);
  assertEquals(f.verdict, "record_insufficient");
  assert(!f.application.includes("too infrequent"));
  assertStringIncludes(String(f.information_needed), "review cadence");
});

Deno.test("doc162 — review and accountability findings carry an ask on their adverse branches, so the register's Action column is never blank", () => {
  const i = PERFECT();
  i.measures_review_cadence = "Less often than every 2 years";
  const f = buildReviewAndUpdateFinding(i);
  assertEquals(f.verdict, "partially_satisfied");
  assertStringIncludes(String(f.information_needed), "event trigger");
  const nc = PERFECT();
  nc.measures_review_cadence = "No defined cadence";
  assertStringIncludes(String(buildReviewAndUpdateFinding(nc).information_needed), "Define a review cadence");
  const partial = PERFECT();
  partial.dpa_status = "Some vendors";
  partial.dpa_art28_verified = "n/a";
  const { report, text } = render(partial);
  const acct = report.accountability_determination as Bag;
  assertEquals(acct.verdict, "partially_satisfied");
  assertStringIncludes(String(acct.information_needed), "Engaging processors only under a written contract");
  const registerRows = text.split("\n").filter((l) => /^\d+ \| /.test(l));
  assert(registerRows.length > 0);
  for (const row of registerRows) assert(!/ \| — \| /.test(row), `blank Action cell: ${row.slice(0, 120)}`);
});

// ── R1: Art. 30(1)(f) is asked ──────────────────────────────────────────────

Deno.test("doc162 — the retention question exists on the contract with the form's options and a label", () => {
  const spec = governanceContract.fields.find((f) => f.key === "retention_schedule_status")!;
  assertEquals(spec.kind, "enum");
  assertEquals([...(spec.options ?? [])], [...RETENTION_SCHEDULE_STATUS]);
  assert(FIELD_LABELS.retention_schedule_status);
});

Deno.test("doc162 — a documented-retention answer evidences Art. 30(1)(f); Unsure and absence leave it open", () => {
  const yes = PERFECT();
  yes.retention_schedule_status = RETENTION_SCHEDULE_STATUS[0];
  const f = buildArt30ElementFindings(yes).find((e) => e.element === "f")!;
  assertEquals(f.verdict, "satisfied");
  assertStringIncludes(f.record_fact, "retention");
  const { text } = render(yes);
  assert(!text.includes("Envisaged retention time limits — The record carries nothing on this element."));
  const unsure = PERFECT();
  unsure.retention_schedule_status = "Unsure";
  assertEquals(buildArt30ElementFindings(unsure).find((e) => e.element === "f")!.verdict, "record_insufficient");
  assertEquals(buildArt30ElementFindings(PERFECT()).find((e) => e.element === "f")!.verdict, "record_insufficient");
  // The answer is read for its meaning, not its presence.
  const partial = PERFECT();
  partial.retention_schedule_status = RETENTION_SCHEDULE_STATUS[1];
  const fp = buildArt30ElementFindings(partial).find((e) => e.element === "f")!;
  assertEquals(fp.verdict, "partially_satisfied");
  assertStringIncludes(String(fp.information_needed), "each remaining category");
  const no = PERFECT();
  no.retention_schedule_status = RETENTION_SCHEDULE_STATUS[2];
  const fn = buildArt30ElementFindings(no).find((e) => e.element === "f")!;
  assertEquals(fn.verdict, "not_satisfied");
  assertStringIncludes(String(fn.information_needed), "Set and document");
});

// ── R4/R5: labels and the rights tested ─────────────────────────────────────

Deno.test("doc162 — the coverage enums render as reader labels, never as the raw option text", () => {
  const v = buildGovernanceSlotValues(PERFECT()) as Bag;
  assertEquals(v.privacyNoticeCoverage, "covering all current activities, transfers, retention and rights");
  assertEquals(v.TRAINING_AI_CLAUSE, ", with coverage of AI tools recorded as explicit coverage of the AI tools");
  const { text } = render(PERFECT());
  assert(!text.includes("describes as yes —"));
  assert(!text.includes("recorded as yes —"));
  assertStringIncludes(text, "for an organisation of 251 to 1,000 people");
  assertEquals(sizeProse("1001+"), "more than 1,000 people");
});

Deno.test("doc162 — the rights the company records as tested are named in the rights domain", () => {
  const f = buildDomainFindingsTyped(PERFECT());
  assertStringIncludes(f["subject_rights"].current_state, "tested end to end are Access, Erasure, Portability, Rectification");
  const none = PERFECT();
  none.dsr_rights_tested = [];
  assertStringIncludes(buildDomainFindingsTyped(none)["subject_rights"].current_state, "does not name which rights were tested");
});

Deno.test("doc162 — the Art. 30 remediation action keeps the element label's case", () => {
  const i = PERFECT();
  i.eu_uk_data = "Yes";
  i.dpo_status = "";
  const a = buildArt30ElementFindings(i).find((e) => e.element === "a")!;
  assertStringIncludes(String(a.information_needed), "Controller / representative / DPO contact details");
  assert(!String(a.information_needed).includes("dpo contact"));
});

// ── R7: Authorities Cited order ─────────────────────────────────────────────

Deno.test("doc162 — Authorities Cited lists articles in numeric order", () => {
  const { text } = render(PERFECT());
  const toa = text.slice(text.indexOf("Authorities Cited"));
  const arts = [...toa.matchAll(/^\s{4}GDPR Art\. (\d+)/gm)].map((m) => Number(m[1]));
  assert(arts.length >= 3, toa);
  for (let i = 1; i < arts.length; i++) assert(arts[i - 1] <= arts[i], JSON.stringify(arts));
});

// ── Instrument and the golden set ───────────────────────────────────────────

Deno.test("doc162 — grader instrument carries the Governance law-map amendment", () => {
  assert(GRADER_CONTEXT_VERSION.includes("+gov-law-map-2026-09-03"), GRADER_CONTEXT_VERSION);
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-2026-08-28-skeleton-cal-3-item204["));
});

Deno.test("doc162 — every golden record renders register-clean and conformance-clean", () => {
  for (const g of [...GOVERNANCE_GOLDEN, ...GOVERNANCE_PERFECT]) {
    const { sk, text } = render(clone(g.intake));
    assertEquals(sk.register_findings.length, 0, `${g.id}: ${JSON.stringify(sk.register_findings)}`);
    assertEquals(sk.conformance.length, 0, `${g.id}: ${JSON.stringify(sk.conformance)}`);
    assert(!text.includes(".."), `${g.id}: double stop`);
    assert(!/\bn\/a\b/.test(text), `${g.id}: raw n/a`);
  }
});
