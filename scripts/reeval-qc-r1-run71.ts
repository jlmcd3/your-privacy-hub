// Offline re-evaluation of QC-R1 checks against run #71 stored data.
import {
  computeTestStates as computeRiskTestStates,
  classifyRevenueBand,
} from "../supabase/functions/_shared/cppa-test-states.ts";
import { resolveIntakeForTestStates } from "../supabase/functions/_shared/cppa-risk-normalise.ts";

const isResolved = (s: string) =>
  s === "resolved_met" || s === "resolved_not_met" || s === "resolved_not_applicable";

function collectInfoNeeded(report: any): any[] {
  const out: any[] = [];
  const push = (v: any) => { if (v) out.push(v); };
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node?.information_needed)) node.information_needed.forEach(push);
    if (Array.isArray(node)) node.forEach(walk);
    else if (typeof node === "object") for (const k of Object.keys(node)) if (k !== "information_needed") walk(node[k]);
  };
  walk(report);
  return out;
}
function rationaleText(report: any): string {
  const chunks: string[] = [];
  const walk = (node: any, key = "") => {
    if (node == null) return;
    if (typeof node === "string") { if (/rationale|audit|cybersecurity|analysis|reasoning|basis/i.test(key)) chunks.push(node); return; }
    if (Array.isArray(node)) { node.forEach((v) => walk(v, key)); return; }
    if (typeof node === "object") for (const k of Object.keys(node)) walk(node[k], k);
  };
  walk(report);
  return chunks.join("\n").toLowerCase();
}
const HEDGE = /(cannot be determined|cannot determine|unable to (?:confirm|verify|resolve)|please (?:confirm|verify|clarify)|to (?:be )?confirm(?:ed)?|pending confirmation|no basis to assess|insufficient (?:basis|information))/i;
const STAT_ANCHOR = /(§|11 CCR|1798\.|Article\s+\d|Recital\s+\d|GDPR|EDPB|DPA\s?2018|Schedule|BIPA|CUBI|MHMD)/i;
const OPTIONAL_TONE = /(could strengthen|would strengthen|consider adding|for completeness|optionally|nice to have|would enhance|could enhance)/i;

function qcR1_1(intake: any, report: any) {
  const r = resolveIntakeForTestStates(intake);
  const states = computeRiskTestStates(r.fiveStage, r.rawForStates);
  const resolvedFields = new Set<string>();
  const resolvedIds: string[] = [];
  for (const [id, s] of Object.entries(states)) {
    if (isResolved((s as any).state)) {
      resolvedIds.push(id);
      ((s as any).source_fields ?? []).forEach((f: string) => resolvedFields.add(f));
    }
  }
  const infoNeeded = collectInfoNeeded(report);
  for (const entry of infoNeeded) {
    const fields = [
      ...(Array.isArray(entry?.source_fields) ? entry.source_fields : []),
      entry?.field, entry?.source_field, entry?.field_id,
    ].filter(Boolean).map((s: any) => String(s));
    const hit = fields.find((f) => resolvedFields.has(f));
    if (hit) return { passed: false, evidence: `information_needed asks for resolved field "${hit}"`, resolvedIds };
  }
  const rat = rationaleText(report);
  for (const id of resolvedIds) {
    if (rat.includes(id.toLowerCase()) && HEDGE.test(rat)) {
      return { passed: false, evidence: `hedge near resolved ${id}`, resolvedIds };
    }
  }
  return { passed: true, resolvedIds };
}
function qcR1_2(intake: any, report: any) {
  const r = resolveIntakeForTestStates(intake);
  const q15 = String(r.rawForStates.q15_sensitive_pi ?? "").trim();
  const q15c = String(r.rawForStates.q15c_spi_volume ?? "").trim();
  if (!q15c && q15 !== "No") return { passed: true, note: "absent-variant" };
  const states = computeRiskTestStates(r.fiveStage, r.rawForStates);
  const m4 = states.M4;
  if (!m4 || !isResolved(m4.state)) return { passed: true, note: `M4=${m4?.state}` };
  const s = JSON.stringify(report ?? "").toLowerCase();
  if (!/7120\s*\(b\)\s*\(2\)\s*\(b\)/.test(s)) return { passed: false, evidence: `§7120(b)(2)(B) missing, M4=${m4.state}` };
  const expected =
    m4.state === "resolved_met" ? /(met|threshold\s+met|exceeds|50,?000\s+or\s+more)/
    : m4.state === "resolved_not_met" ? /(not\s+met|below|fewer than 50,?000)/
    : /(not\s+applicable|inapplicable|n\/?a|no\s+spi)/;
  if (!expected.test(s)) return { passed: false, evidence: `resolution mismatch M4=${m4.state}` };
  return { passed: true, note: `M4=${m4.state}` };
}
function qcR1_3(intake: any, report: any) {
  const r = resolveIntakeForTestStates(intake);
  const q5 = String(r.rawForStates.q5_sell_share ?? "").trim();
  const q5c = String(r.rawForStates.q5c_share_revenue_50pct ?? "").trim();
  if (!q5c && q5 !== "No") return { passed: true, note: "absent-variant" };
  const states = computeRiskTestStates(r.fiveStage, r.rawForStates);
  const m5 = states.M5;
  if (!m5 || !isResolved(m5.state)) return { passed: true, note: `M5=${m5?.state}` };
  const s = JSON.stringify(report ?? "").toLowerCase();
  if (!/7120\s*\(b\)\s*\(1\)/.test(s)) return { passed: false, evidence: `§7120(b)(1) missing, M5=${m5.state}` };
  const expected =
    m5.state === "resolved_met" ? /(met|threshold\s+met|50%|fifty percent)/
    : m5.state === "resolved_not_met" ? /(not\s+met|below|no\s+sale|inapplicable)/
    : /(not\s+applicable|inapplicable|n\/?a)/;
  if (!expected.test(s)) return { passed: false, evidence: `resolution mismatch M5=${m5.state}` };
  return { passed: true, note: `M5=${m5.state}` };
}
function qcR1_4(intake: any, report: any) {
  const r = resolveIntakeForTestStates(intake);
  const band = classifyRevenueBand(r.rawForStates.q1_revenue);
  const s = JSON.stringify(report ?? "").toLowerCase();
  if (band.audit_cohort === "indeterminate") {
    const twoCohort = /(2029-04-01[\s\S]{0,80}2030-04-01|2030-04-01[\s\S]{0,80}2029-04-01|two[- ]cohort|either\s+2029|2029\s+or\s+2030)/i.test(s);
    if (!twoCohort) return { passed: false, evidence: `indeterminate band, two-cohort treatment missing`, band: band.label };
    return { passed: true, band: band.label };
  }
  const cohort = band.audit_cohort;
  if (!s.includes(cohort)) return { passed: false, evidence: `resolved band ${band.label} needs cohort ${cohort}; missing`, band: band.label };
  const idx = s.indexOf(cohort);
  const win = s.slice(Math.max(0, idx - 200), idx + 200);
  if (/(cannot be determined|indeterminate|unable to (?:confirm|resolve))/i.test(win)) {
    return { passed: false, evidence: `cohort ${cohort} hedged near cite window`, band: band.label };
  }
  return { passed: true, band: band.label, cohort };
}
function qcR1_5(intake: any, report: any) {
  const r = resolveIntakeForTestStates(intake);
  const exceptions = (r.fiveStage.exceptions ?? {}) as Record<string, any>;
  const targets: any[] = [];
  for (const [k, v] of Object.entries(exceptions)) {
    if (!v?.claimed) continue;
    const ab = String(v?.authority_basis ?? "").trim();
    const rp = String(v?.retention_period ?? "").trim();
    if (ab || rp) targets.push({ key: k, ab, rp });
  }
  if (targets.length === 0) return { passed: true, note: "no claimed exceptions with ab/rp" };
  const s = JSON.stringify(report ?? "").toLowerCase();
  for (const t of targets) {
    if (t.ab && !s.includes(t.ab.toLowerCase())) return { passed: false, evidence: `exception ${t.key} authority_basis not referenced` };
    if (t.rp && !s.includes(t.rp.toLowerCase())) return { passed: false, evidence: `exception ${t.key} retention_period not referenced` };
  }
  return { passed: true, note: `${targets.length} claim(s) referenced` };
}
function qcR1_7(_intake: any, report: any) {
  const infoNeeded = collectInfoNeeded(report);
  for (const entry of infoNeeded) {
    const dims = String(entry?.dimensions ?? entry?.dimension ?? entry?.reason ?? entry?.rationale ?? "");
    if (!dims) continue;
    if (OPTIONAL_TONE.test(dims) && !STAT_ANCHOR.test(dims)) {
      return { passed: false, evidence: `optional-tone without statutory anchor: "${dims.slice(0, 120)}"` };
    }
  }
  return { passed: true };
}

const text = await Deno.readTextFile("/tmp/reeval/docs.jsonl");
const docs = text.trim().split("\n").map((l) => JSON.parse(l));
const results: Record<string, { pass: number; fail: number; details: any[] }> = {};
const ids = ["qc_r1_1", "qc_r1_2", "qc_r1_3", "qc_r1_4", "qc_r1_5", "qc_r1_7"];
for (const id of ids) results[id] = { pass: 0, fail: 0, details: [] };
const runners: Record<string, any> = { qc_r1_1: qcR1_1, qc_r1_2: qcR1_2, qc_r1_3: qcR1_3, qc_r1_4: qcR1_4, qc_r1_5: qcR1_5, qc_r1_7: qcR1_7 };

for (const d of docs) {
  const { doc_number, intake_data, report_data } = d;
  // Diagnostic: resolved states for this doc
  const r = resolveIntakeForTestStates(intake_data);
  const states = computeRiskTestStates(r.fiveStage, r.rawForStates);
  const summary: Record<string, string> = {};
  for (const [id, v] of Object.entries(states)) summary[id] = (v as any).state;
  console.log(`\n=== doc ${doc_number} — resolved M-states ===`);
  console.log(JSON.stringify(summary));
  console.log(`band(raw q1_revenue=${JSON.stringify(intake_data?.q1_revenue)} org.annual_revenue_threshold=${JSON.stringify(intake_data?.org_context?.annual_revenue_threshold)}) => q1_resolved=${JSON.stringify(r.rawForStates.q1_revenue)}`);

  for (const id of ids) {
    const res = runners[id](intake_data, report_data);
    if (res.passed) results[id].pass++;
    else results[id].fail++;
    results[id].details.push({ doc: doc_number, ...res });
  }
}

console.log("\n\n===== FINAL COUNTS =====");
for (const id of ids) {
  const r = results[id];
  console.log(`${id}: pass=${r.pass}/${r.pass + r.fail}  fail=${r.fail}`);
  for (const d of r.details) if (!d.passed) console.log(`  doc ${d.doc}: FAIL — ${d.evidence}`);
}
