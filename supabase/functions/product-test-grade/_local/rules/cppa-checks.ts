// product-test-grade — the eighteen CPPA CHECKS[] closures, lifted from
// `supabase/functions/run-quality-batch/index.ts` lines 476-1023 (doc 271
// §2 element 1; doc 272 §6.4). NOT a byte-identical mirror — the brief
// explicitly asks for the model imports removed, so this is a deliberate
// adaptation, not a copy (tests/edge/product-test/mirror.test.ts does not
// cover this file). Every check's LOGIC and check id are preserved
// verbatim; only:
//   - the surrounding harness type (`Check.run(intake, report)` ->
//     `Check` from ../types.ts, `rule_ref` = the original check id,
//     severity fixed to "high" per the brief) changed;
//   - `collectRationaleEntries` / `evaluateResolvedHedgePerField`
//     (originally imported from run-quality-batch/_local/grader/
//     qc-r1-per-field.ts — another function's `_local`, not importable
//     here) are reimplemented inline, byte-for-byte the same algorithm,
//     rather than mirrored as a separate file, since they are ~30 lines of
//     pure string logic with no model dependency of their own.
//
// Kept imports, all `_shared` (no model): `_shared/cppa-test-states.ts`
// (computeTestStates/computeCyberTestStates/classifyRevenueBand — the SAME
// module the cppa-risk and cppa-cyber generators use, per the original
// file's own comment) and `_shared/admt-scope-contract.ts` (readAdmtScope).

import {
  computeTestStates as computeRiskTestStates,
  classifyRevenueBand,
} from "../../../_shared/cppa-test-states.ts";
import { resolveIntakeForTestStates } from "../../../_shared/cppa-risk-normalise.ts";
import { readAdmtScope } from "../../../_shared/admt-scope-contract.ts";
import type { Check, ProductTestTool } from "../types.ts";

type Bag = Record<string, unknown>;

interface RawCheckResult {
  passed: boolean;
  evidence?: string;
}

interface RawCheck {
  id: string;
  tools?: ProductTestTool[];
  run: (intake: Bag, report: Bag) => RawCheckResult;
}

const ADMT_ONLY: ProductTestTool[] = ["cppa-admt"];
const CPPA_RISK_ONLY: ProductTestTool[] = ["cppa-risk"];
const GOVERNANCE_ONLY: ProductTestTool[] = ["governance"];
const ALL_QC_WS6_TOOLS: ProductTestTool[] = [
  "cppa-risk", "cppa-cyber", "cppa-admt", "dpia", "governance", "lia", "ir-playbook", "biometric", "dpa",
];

const isResolved = (s: string) =>
  s === "resolved_met" || s === "resolved_not_met" || s === "resolved_not_applicable";

const resolveForChecks = (intake: Bag) => resolveIntakeForTestStates(intake ?? {});

function collectInfoNeeded(report: Bag): Bag[] {
  const out: Bag[] = [];
  const push = (v: unknown) => { if (v) out.push(v as Bag); };
  const walk = (node: unknown): void => {
    if (!node) return;
    if (Array.isArray((node as Bag)?.information_needed)) ((node as Bag).information_needed as unknown[]).forEach(push);
    if (Array.isArray(node)) (node as unknown[]).forEach(walk);
    else if (typeof node === "object") for (const k of Object.keys(node as Bag)) if (k !== "information_needed") walk((node as Bag)[k]);
  };
  walk(report);
  return out;
}

// Reimplementation of run-quality-batch/_local/grader/qc-r1-per-field.ts
// (collectRationaleEntries + evaluateResolvedHedgePerField) — see file
// header. Same algorithm, same field-key vocabulary.
interface RationaleEntry { path: string; text: string }

function collectRationaleEntries(report: Bag): RationaleEntry[] {
  const out: RationaleEntry[] = [];
  const walk = (node: unknown, key = "", path = ""): void => {
    if (node == null) return;
    if (typeof node === "string") {
      if (/rationale|audit|cybersecurity|analysis|reasoning|basis/i.test(key)) out.push({ path: path || key, text: node });
      return;
    }
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, key, `${path}[${i}]`)); return; }
    if (typeof node === "object") for (const [k, v] of Object.entries(node as Bag)) walk(v, k, path ? `${path}.${k}` : k);
  };
  walk(report);
  return out;
}

function evaluateResolvedHedgePerField(
  entries: RationaleEntry[],
  resolvedIds: string[],
  resolvedFieldsById: Record<string, string[]>,
  hedge: RegExp,
): RawCheckResult {
  for (const { path, text } of entries) {
    const lower = text.toLowerCase();
    if (!hedge.test(lower)) continue;
    for (const id of resolvedIds) {
      const idLc = id.toLowerCase();
      const idRe = new RegExp(`\\b${idLc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (idRe.test(lower)) return { passed: false, evidence: `hedge co-occurs with resolved test id ${id} in field "${path}"` };
      for (const f of resolvedFieldsById[id] ?? []) {
        const fLc = f.toLowerCase();
        if (fLc.length >= 3 && lower.includes(fLc)) {
          return { passed: false, evidence: `hedge co-occurs with resolved source_field "${f}" (test ${id}) in field "${path}"` };
        }
      }
    }
  }
  return { passed: true };
}

const rationaleText = (report: Bag): string => {
  const chunks: string[] = [];
  const walk = (node: unknown, key = ""): void => {
    if (node == null) return;
    if (typeof node === "string") { if (/rationale|audit|cybersecurity|analysis|reasoning|basis/i.test(key)) chunks.push(node); return; }
    if (Array.isArray(node)) { (node as unknown[]).forEach((v) => walk(v, key)); return; }
    if (typeof node === "object") for (const k of Object.keys(node as Bag)) walk((node as Bag)[k], k);
  };
  walk(report);
  return chunks.join("\n").toLowerCase();
};
void rationaleText; // parity with the original file; unused by any check below but kept for fidelity to the source.

const HEDGE = /(cannot be determined|cannot determine|unable to (?:confirm|verify|resolve)|please (?:confirm|verify|clarify)|to (?:be )?confirm(?:ed)?|pending confirmation|no basis to assess|insufficient (?:basis|information))/i;
const OPTIONAL_TONE = /(could strengthen|would strengthen|consider adding|for completeness|optionally|nice to have|would enhance|could enhance)/i;
const STAT_ANCHOR = /(§|11 CCR|1798\.|Article\s+\d|Recital\s+\d|GDPR|EDPB|DPA\s?2018|Schedule|BIPA|CUBI|MHMD)/i;

export const CPPA_CHECKS: RawCheck[] = [
  {
    id: "adtech_not_significant_decision", tools: ADMT_ONLY,
    run: (intake, report) => {
      const domains: string[] = (intake?.decision_domains as string[]) ?? [];
      if (!domains.some((d) => /advertising|adtech|audience/i.test(d))) return { passed: true };
      const triggers = readAdmtScope(report, { context: "adtech_not_significant_decision" }).triggers_significant_decision;
      if (triggers === true) return { passed: false, evidence: `triggers_significant_decision=true for advertising domain` };
      return { passed: true };
    },
  },
  {
    id: "gaming_not_significant_decision", tools: ADMT_ONLY,
    run: (intake, report) => {
      const domains: string[] = (intake?.decision_domains as string[]) ?? [];
      const desc: string = (intake?.system_description as string) ?? "";
      if (!domains.some((d) => /entertainment|gaming/i.test(d)) && !/gaming|entertainment/i.test(desc)) return { passed: true };
      const triggers = readAdmtScope(report, { context: "gaming_not_significant_decision" }).triggers_significant_decision;
      if (triggers === true) return { passed: false, evidence: `triggers_significant_decision=true for gaming/entertainment` };
      return { passed: true };
    },
  },
  {
    id: "art11_gate_enforced", tools: ADMT_ONLY,
    run: (_intake, report) => {
      const triggers = readAdmtScope(report, { context: "art11_gate_enforced" }).triggers_significant_decision;
      if (triggers === true) return { passed: true };
      const gaps = [
        ...((report?.notice_gaps as Bag[]) ?? []),
        ...((report?.opt_out_gaps as Bag[]) ?? []),
        ...((report?.access_gaps as Bag[]) ?? []),
      ].filter((g) => g.status !== "compliant");
      if (gaps.length) return { passed: false, evidence: `${gaps.length} Article 11 gaps populated despite triggers_significant_decision=false` };
      return { passed: true };
    },
  },
  {
    id: "no_7221_c_5", tools: ADMT_ONLY,
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "");
      const idx = s.indexOf("7221(c)(5)");
      if (idx >= 0) return { passed: false, evidence: `§ 7221(c)(5) found: ...${s.slice(Math.max(0, idx - 40), idx + 60)}...` };
      return { passed: true };
    },
  },
  {
    id: "no_7152_a_3_trade_secret", tools: ADMT_ONLY,
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "");
      if (s.includes("7152(a)(3)")) return { passed: false, evidence: "§ 7152(a)(3) cited as ADMT trade-secret exception — incorrect" };
      return { passed: true };
    },
  },
  {
    id: "no_prompt_artifacts",
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "").toLowerCase();
      const hits = ["provided authority block", "provided subset", "regulations typically require",
        "while not explicitly covered", "based on the provided", "authority block only includes",
        "note: the provided"].filter((a) => s.includes(a));
      if (hits.length) return { passed: false, evidence: `Prompt artifact: ${hits[0]}` };
      return { passed: true };
    },
  },
  {
    id: "no_double_numbering",
    run: (_intake, report) => {
      const actions: string[] = (report?.priority_actions as string[]) ?? [];
      const bad = actions.filter((a) => /^\s*\d+[.)]\s*\d+[.)]/.test(a));
      if (bad.length) return { passed: false, evidence: `Double-numbered: "${bad[0].slice(0, 80)}"` };
      return { passed: true };
    },
  },
  {
    id: "notice_gaps_when_inscope", tools: ADMT_ONLY,
    run: (_intake, report) => {
      const triggers = readAdmtScope(report, { context: "notice_gaps_when_inscope" }).triggers_significant_decision;
      if (triggers !== true) return { passed: true };
      if ((report as Bag)?._meta && ((report._meta as Bag)?.internal as Bag)?.scope_state) return { passed: true };
      if (!(report?.notice_gaps as unknown[])?.length) return { passed: false, evidence: "notice_gaps empty despite triggers_significant_decision=true" };
      return { passed: true };
    },
  },
  {
    id: "overall_status_present", tools: ADMT_ONLY,
    run: (_intake, report) => {
      const v2Label = ((report as Bag)?._meta as Bag | undefined)?.internal && (((report as Bag)._meta as Bag).internal as Bag).overall_posture_label;
      if (typeof v2Label === "string" && v2Label.length > 0) return { passed: true };
      if (!report?.overall_status) return { passed: false, evidence: "overall_status field missing or empty" };
      return { passed: true };
    },
  },
  {
    id: "no_hallucinated_section_numbers", tools: ADMT_ONLY,
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "");
      const bad = [...s.matchAll(/§\s*(\d{4,5})(?:\([a-z0-9]+\))*/gi)]
        .map((m) => parseInt(m[1]))
        .filter((n) => n > 100 && n < 7000 && n !== 1798 && n !== 3426);
      if (bad.length) return { passed: false, evidence: `Suspicious section numbers outside known range: ${[...new Set(bad)].slice(0, 3).map((n) => `§ ${n}`).join(", ")}` };
      return { passed: true };
    },
  },
  {
    id: "qc_r1_1_no_asks_on_resolved_tests", tools: CPPA_RISK_ONLY,
    run: (intake, report) => {
      let states: Record<string, Bag>;
      try {
        const r = resolveForChecks(intake);
        states = computeRiskTestStates(r.fiveStage, r.rawForStates) as unknown as Record<string, Bag>;
      } catch (e) { return { passed: false, evidence: `computeTestStates threw: ${(e as Error).message?.slice(0, 80)}` }; }

      const resolvedFields = new Set<string>();
      const resolvedIds: string[] = [];
      const resolvedFieldsById: Record<string, string[]> = {};
      for (const [id, st] of Object.entries(states)) {
        if (isResolved(String(st.state))) {
          resolvedIds.push(id);
          const src = (st.source_fields as string[]) ?? [];
          resolvedFieldsById[id] = src;
          src.forEach((f) => resolvedFields.add(f));
        }
      }
      const infoNeeded = collectInfoNeeded(report);
      for (const entry of infoNeeded) {
        const fields = [
          ...(Array.isArray(entry?.source_fields) ? (entry.source_fields as string[]) : []),
          entry?.field, entry?.source_field, entry?.field_id,
        ].filter(Boolean).map((s) => String(s));
        const hit = fields.find((f) => resolvedFields.has(f));
        if (hit) return { passed: false, evidence: `information_needed asks for resolved field "${hit}"` };
      }
      const entries = collectRationaleEntries(report);
      const perField = evaluateResolvedHedgePerField(entries, resolvedIds, resolvedFieldsById, HEDGE);
      if (!perField.passed) return perField;
      return { passed: true };
    },
  },
  {
    id: "qc_r1_2_spi_prong_utilization", tools: CPPA_RISK_ONLY,
    run: (intake, report) => {
      const r = resolveForChecks(intake);
      const q15 = String(r.rawForStates.q15_sensitive_pi ?? "").trim();
      const q15c = String(r.rawForStates.q15c_spi_volume ?? "").trim();
      if (!q15c && q15 !== "No") return { passed: true };
      const states = computeRiskTestStates(r.fiveStage, r.rawForStates);
      const m4 = (states as Bag).M4 as Bag | undefined;
      if (!m4 || !isResolved(String(m4.state))) return { passed: true };
      const ss = (report as Bag)?.submission_and_retention ?? (report as Bag)?.submission_summary ?? {};
      const s = JSON.stringify(ss ?? "").toLowerCase();
      if (!/7120\s*\(b\)\s*\(2\)\s*\(b\)/.test(s)) return { passed: false, evidence: `§ 7120(b)(2)(B) not referenced in submission_summary despite resolved M4 (${m4.state})` };
      const expected =
        m4.state === "resolved_met" ? /(met|threshold\s+met|exceeds|50,?000\s+or\s+more)/
        : m4.state === "resolved_not_met" ? /(not\s+met|below|fewer than 50,?000)/
        : /(not\s+applicable|inapplicable|n\/?a|no\s+spi)/;
      if (!expected.test(s)) return { passed: false, evidence: `§ 7120(b)(2)(B) resolution in submission_summary does not match computed M4=${m4.state}` };
      return { passed: true };
    },
  },
  {
    id: "qc_r1_3_50pct_prong_utilization", tools: CPPA_RISK_ONLY,
    run: (intake, report) => {
      const r = resolveForChecks(intake);
      const q5 = String(r.rawForStates.q5_sell_share ?? "").trim();
      const q5c = String(r.rawForStates.q5c_share_revenue_50pct ?? "").trim();
      if (!q5c && q5 !== "No") return { passed: true };
      const states = computeRiskTestStates(r.fiveStage, r.rawForStates);
      const m5 = (states as Bag).M5 as Bag | undefined;
      if (!m5 || !isResolved(String(m5.state))) return { passed: true };
      const ss = (report as Bag)?.submission_and_retention ?? (report as Bag)?.submission_summary ?? {};
      const s = JSON.stringify(ss ?? "").toLowerCase();
      if (!/7120\s*\(b\)\s*\(1\)/.test(s)) return { passed: false, evidence: `§ 7120(b)(1) not referenced in submission_summary despite resolved M5 (${m5.state})` };
      const insufficientBasis = /(does not confirm|not\s+confirmed|insufficient\s+(?:basis|information|evidence)|cannot\s+(?:be\s+)?(?:confirmed|determined|resolved|verified)|no\s+basis\s+to\s+(?:confirm|assess|determine)|pending\s+confirmation|to\s+be\s+confirmed|record\s+does\s+not\s+(?:establish|indicate|state)|indeterminate)/i;
      const met = /(threshold\s+met|is\s+met|meets\s+the\s+threshold|derives\s+50%|50%\s+or\s+more|fifty\s+percent\s+or\s+more|exceeds\s+50%|\bmet\b)/i;
      const notMet = /(not\s+met|does\s+not\s+meet|below\s+(?:the\s+)?(?:50%|threshold)|no\s+sale|does\s+not\s+sell|inapplicable|less\s+than\s+50%|under\s+50%)/i;
      const na = /(not\s+applicable|inapplicable|n\/?a\b|does\s+not\s+apply)/i;
      const ok =
        m5.state === "resolved_met" ? (met.test(s) || insufficientBasis.test(s))
        : m5.state === "resolved_not_met" ? (notMet.test(s) || insufficientBasis.test(s))
        : (na.test(s) || insufficientBasis.test(s));
      if (!ok) return { passed: false, evidence: `§ 7120(b)(1) resolution in submission_summary does not match computed M5=${m5.state} (no met/not-met/insufficient-basis phrasing found)` };
      return { passed: true };
    },
  },
  {
    id: "qc_r1_4_cohort_determinism", tools: CPPA_RISK_ONLY,
    run: (intake, report) => {
      const r = resolveForChecks(intake);
      const band = classifyRevenueBand(r.rawForStates.q1_revenue as string);
      const ss = (report as Bag)?.submission_and_retention ?? (report as Bag)?.submission_summary ?? {};
      const s = JSON.stringify(ss ?? "").toLowerCase();
      const cohortDateRegex = (year: string) => new RegExp(`(?:${year}-04-01|april\\s+1,?\\s+${year})`, "i");
      const has2029 = cohortDateRegex("2029").test(s);
      const has2030 = cohortDateRegex("2030").test(s);
      const has2028 = cohortDateRegex("2028").test(s);

      if (band.audit_cohort === "indeterminate") {
        if (!(has2029 && has2030)) return { passed: false, evidence: `legacy/absent revenue band requires both April 1, 2029 and April 1, 2030 cohort dates (ISO or long form) in submission_summary; found 2029=${has2029} 2030=${has2030}` };
        const conditional = /(if\s+\d{4}\s+(?:annual\s+)?(?:gross\s+)?revenue|depend(?:s|ing)\s+on|conditional|straddles|cannot\s+resolve|indeterminate|two[- ]cohort|either\s+2029|2029\s+or\s+2030|cohort\s+table)/i;
        if (!conditional.test(s)) return { passed: false, evidence: `both cohort dates present in submission_summary but no conditional/period-dependent framing found` };
        return { passed: true };
      }
      const year = band.audit_cohort.slice(0, 4);
      const present = year === "2028" ? has2028 : year === "2029" ? has2029 : year === "2030" ? has2030 : s.includes(band.audit_cohort);
      if (!present) return { passed: false, evidence: `resolved band ${band.label} requires § 7121(a) cohort April 1, ${year} (ISO or long form) in submission_summary; not stated` };
      const longForm = `april 1, ${year}`;
      const iso = `${year}-04-01`;
      const idx = s.includes(iso) ? s.indexOf(iso) : s.indexOf(longForm);
      if (idx >= 0) {
        const window = s.slice(Math.max(0, idx - 200), idx + 200);
        if (/(cannot be determined|indeterminate|unable to (?:confirm|resolve))/i.test(window)) {
          return { passed: false, evidence: `resolved cohort April 1, ${year} is hedged near the cite window in submission_summary` };
        }
      }
      return { passed: true };
    },
  },
  {
    id: "qc_r1_5_exception_fields_consumed", tools: CPPA_RISK_ONLY,
    run: (intake, report) => {
      const r = resolveForChecks(intake);
      const exceptions = (r.fiveStage.exceptions ?? {}) as Record<string, Bag>;
      const targets: { key: string; ab?: string; rp?: string }[] = [];
      for (const [k, v] of Object.entries(exceptions)) {
        if (!v?.claimed) continue;
        const ab = String(v?.authority_basis ?? "").trim();
        const rp = String(v?.retention_period ?? "").trim();
        if (ab || rp) targets.push({ key: k, ab: ab || undefined, rp: rp || undefined });
      }
      if (targets.length === 0) return { passed: true };
      const s = JSON.stringify(report ?? "").toLowerCase();
      for (const t of targets) {
        const keyLc = t.key.toLowerCase();
        if (t.ab && !s.includes(t.ab.toLowerCase())) return { passed: false, evidence: `exception "${t.key}" authority_basis ("${t.ab.slice(0, 40)}") not referenced` };
        if (t.rp && !s.includes(t.rp.toLowerCase())) return { passed: false, evidence: `exception "${t.key}" retention_period ("${t.rp.slice(0, 40)}") not referenced` };
        const idx = s.indexOf(keyLc);
        if (idx >= 0) {
          const win = s.slice(Math.max(0, idx - 300), idx + 300);
          const framedAsClaim = /(claim|asserted|under test|as claimed|intake states|per the intake|claimed authority|to be substantiated)/i.test(win);
          const framedAsEstablished = /(establishes|is established|compliant retention|authoritative basis|substantiated authority)/i.test(win);
          if (framedAsEstablished && !framedAsClaim) return { passed: false, evidence: `exception "${t.key}" fields adopted as established without claimed-vs-substantiated framing` };
        }
      }
      return { passed: true };
    },
  },
  {
    id: "qc_r1_7_enhancement_placement_det",
    run: (_intake, report) => {
      const infoNeeded = collectInfoNeeded(report);
      for (const entry of infoNeeded) {
        const dims = String(entry?.dimensions ?? entry?.dimension ?? entry?.reason ?? entry?.rationale ?? "");
        if (!dims) continue;
        if (OPTIONAL_TONE.test(dims) && !STAT_ANCHOR.test(dims)) return { passed: false, evidence: `information_needed uses optional-depth tone without statutory anchor: "${dims.slice(0, 100)}"` };
      }
      return { passed: true };
    },
  },
  {
    id: "qc_r1_8_governance_additional_context", tools: GOVERNANCE_ONLY,
    run: (intake, report) => {
      const ac = String(((intake?.org_context as Bag)?.additional_context) ?? intake?.additional_context ?? "").trim();
      if (!ac) return { passed: true };
      const s = JSON.stringify(report ?? "").toLowerCase();
      const token = ac.slice(0, 40).toLowerCase();
      const referenced = s.includes(token) || /additional context|as noted by (?:the )?(?:organisation|organization|client)|per the intake context/i.test(s);
      if (!referenced) return { passed: false, evidence: `additional_context present but not referenced/credited in any finding` };
      const findings: Bag[] = [];
      const walk = (n: unknown): void => {
        if (!n) return;
        if (Array.isArray(n)) { (n as unknown[]).forEach(walk); return; }
        if (typeof n === "object") {
          const b = n as Bag;
          if (b.domain && b.status && (b.basis || b.rationale || b.reasoning)) findings.push(b);
          for (const k of Object.keys(b)) walk(b[k]);
        }
      };
      walk(report);
      for (const f of findings) {
        const basis = String(f.basis ?? f.rationale ?? f.reasoning ?? "").toLowerCase();
        if (!basis) continue;
        if (basis.includes(token) && !STAT_ANCHOR.test(basis) && basis.length < ac.length + 80) {
          return { passed: false, evidence: `domain "${f.domain}" status "${f.status}" justified solely by additional_context` };
        }
      }
      return { passed: true };
    },
  },
  {
    id: "qc_ws6_1_supplemental_consumption", tools: ALL_QC_WS6_TOOLS,
    run: (intake, report) => {
      const supp: Bag[] = Array.isArray(intake?.supplemental_responses) ? (intake.supplemental_responses as Bag[]) : [];
      const suppCtx = typeof intake?.supplemental_context === "string" ? (intake.supplemental_context as string).trim() : "";
      if (supp.length === 0 && !suppCtx) return { passed: true };
      const answeredRefs = new Set<string>();
      for (const e of supp) {
        if (!e || typeof e !== "object") continue;
        const resp = typeof e.response === "string" ? (e.response as string).trim() : "";
        const ref = typeof e.ref_field === "string" ? (e.ref_field as string).trim() : "";
        if (resp && ref) answeredRefs.add(ref);
      }
      const asks: Bag[] = Array.isArray(report?.information_needed) ? (report.information_needed as Bag[]) : [];
      for (const a of asks) {
        const f = typeof a?.field === "string" ? (a.field as string) : "";
        if (f && answeredRefs.has(f)) return { passed: false, evidence: `information_needed re-asks answered supplemental ref_field "${f}"` };
      }
      if (answeredRefs.size > 0) {
        const text = JSON.stringify(report ?? "").toLowerCase();
        const marker = /(insufficient information|cannot be determined without|without further information|not possible to (?:assess|determine) without)/i;
        if (marker.test(text)) {
          for (const ref of answeredRefs) {
            const needle = ref.toLowerCase();
            if (text.includes(needle)) return { passed: false, evidence: `insufficient-basis phrasing persists near answered supplemental ref "${ref}"` };
          }
        }
      }
      return { passed: true };
    },
  },
];

/** Run every CPPA_CHECKS row scoped to `tool` (undefined `tools` = all tools),
 *  producing our Check shape. Severity is fixed to "high" per the brief. */
export function runCppaChecks(tool: ProductTestTool, intake: Bag, report: Bag): Check[] {
  const out: Check[] = [];
  for (const c of CPPA_CHECKS) {
    if (c.tools && !c.tools.includes(tool)) continue;
    let result: RawCheckResult;
    try {
      result = c.run(intake ?? {}, report ?? {});
    } catch (e) {
      result = { passed: false, evidence: `check threw: ${(e as Error).message?.slice(0, 160)}` };
    }
    out.push({
      check_id: `legal.cppa.${c.id}`,
      family: "legal",
      severity: "high",
      passed: result.passed,
      actual: result.evidence,
      rule_ref: c.id,
    });
  }
  return out;
}
