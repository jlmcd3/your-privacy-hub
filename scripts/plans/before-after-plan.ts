#!/usr/bin/env -S deno run --allow-read --allow-run
// ITEM 339 — BEFORE/AFTER DOCUMENT-PLAN PAIR for CEO sign-off.
//
//   deno run --allow-read --allow-run scripts/plans/before-after-plan.ts <product> <sample_report_id>
//
// BEFORE = the donor report walked in its own key order, one fact per sentence
//          (this is what an intake walk reads like).
// AFTER  = the SAME donor values re-planned: determination first, facts grouped
//          by the engine's themes, deterministic connectives, mention rule.
//
// The plan is marked approved IN MEMORY ONLY. The on-disk plans stay
// `approved: false` until the ledger records the sign-off.

import { CPPA_RISK_PLAN } from "../../supabase/functions/_shared/prose/plans/cppa-risk.plan.ts";
import { DPIA_PLAN } from "../../supabase/functions/_shared/prose/plans/dpia.plan.ts";
import { GOVERNANCE_PLAN } from "../../supabase/functions/_shared/prose/plans/governance.plan.ts";
import { REGISTRATION_PLAN } from "../../supabase/functions/_shared/prose/plans/registration.plan.ts";
import type { DocumentPlan } from "../../supabase/functions/_shared/prose/plan.ts";
import {
  renderDocumentFromPlan,
  type SectionInput,
  type SupportingStatement,
} from "../../supabase/functions/_shared/prose/plan-render.ts";
import type { Relation } from "../../supabase/functions/_shared/prose/connectives.ts";

const PLANS: Record<string, DocumentPlan> = {
  "cppa-risk": CPPA_RISK_PLAN,
  dpia: DPIA_PLAN,
  governance: GOVERNANCE_PLAN,
  registration: REGISTRATION_PLAN,
};

const [product, id] = Deno.args;
const plan = PLANS[product];
if (!plan) throw new Error(`no reviewed plan for ${product}`);

const sql =
  `select json_build_object('report',report_data,'fixture',fixture)::text from sample_reports where id = '${id}'`;
const raw = new TextDecoder().decode(
  (await new Deno.Command("psql", { args: ["-t", "-A", "-c", sql] }).output()).stdout,
).trim();
const row = JSON.parse(raw);
const report = (row.report ?? {}) as Record<string, unknown>;
const fixture = (row.fixture ?? {}) as Record<string, unknown>;

const entity = String(
  fixture["company_name"] ?? fixture["entity_name"] ??
    (report["assessment_summary"] as Record<string, unknown>)?.["company_name"] ?? "The company",
);

// --- shared helpers ---------------------------------------------------------
const label = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const flat = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(flat).filter(Boolean).join("; ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${label(k)}: ${flat(x)}`)
      .filter((s) => !s.endsWith(": "))
      .join("; ");
  }
  return String(v);
};
const trunc = (s: string, n = 220) => (s.length > n ? s.slice(0, n).trimEnd() + " …" : s);

// --- BEFORE: the intake walk ------------------------------------------------
function before(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(report)) {
    if (/^(generated_at|portals|annotations|lint_warnings|enforcement_meta)$/.test(k)) continue;
    const body = flat(v);
    if (!body) continue;
    lines.push(`### ${label(k)}\n\n${trunc(body, 700)}`);
  }
  return lines.join("\n\n");
}

// --- AFTER: the planned document -------------------------------------------
// Facts are tagged with the plan's own themes, in the order the section
// declares them. Relations come from a fixed table, never from a model.
// Facts after the lead are additive unless the donor field is an outcome or a
// safeguard. Nothing here is inferred at render time by a model.
const MAX_STATEMENTS = 4;
function relationFor(key: string, index: number): Relation {
  if (index === 0) return "trigger_duty";
  if (/safeguard|mitigat|control|exception/i.test(key)) return "contrast";
  if (/recommend|action|next|remed/i.test(key)) return "consequence";
  return "addition";
}
const DETERMINATION_KEY =
  /^(overall_risk_level|status|outcome|conclusion|determination|required|result|verdict|.*_required|.*_status)$/i;

function inputsFromDonor(): Record<string, SectionInput> {
  const out: Record<string, SectionInput> = {};
  for (const s of plan.sections) {
    const value = report[s.source_key];
    if (value === undefined || value === null) continue;

    let determination: string | undefined;
    const statements: SupportingStatement[] = [];

    if (typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => [k, flat(v)] as const)
        .filter(([, v]) => v);
      // The determination is the donor's own outcome-bearing field where one
      // exists; otherwise the section degrades honestly.
      // Prefer the section's headline outcome field where the donor has one.
      const dIdx = (() => {
        const priority = entries.findIndex(([k]) =>
          /^(overall_risk_level|determination|conclusion|outcome)$/i.test(k)
        );
        return priority >= 0 ? priority : entries.findIndex(([k]) => DETERMINATION_KEY.test(k));
      })();
      if (dIdx >= 0 && s.lead === "determination") {
        determination = `${entity} records ${label(entries[dIdx][0]).toLowerCase()} of ${
          trunc(entries[dIdx][1], 200)
        }`;
      }
      entries.forEach(([k, v], i) => {
        if (i === dIdx || statements.length >= MAX_STATEMENTS) return;
        if (/guidance_note|completion_guidance|version|company_name|entity_name/i.test(k)) return;
        statements.push({
          theme: s.themes[Math.min(statements.length, s.themes.length - 1)],
          topic: k,
          sentence: `${label(k).toLowerCase()} on the record is ${trunc(v, 160)}`,
          relation: relationFor(k, statements.length),
        });
      });
    } else {
      const body = flat(value);
      if (!body) continue;
      if (s.lead === "determination") determination = trunc(body, 200);
      else {
        statements.push({
          theme: s.themes[0],
          sentence: `the record states ${trunc(body, 160)}`,
          relation: "addition",
        });
      }
    }
    out[s.id] = { section_id: s.id, determination, statements };
  }
  return out;
}

const approvedInMemory: DocumentPlan = {
  ...plan,
  approved: true,
  sections: plan.sections.map((s) => ({ ...s, status: "approved" as const })),
};

const doc = renderDocumentFromPlan(approvedInMemory, inputsFromDonor(), {
  mentions: { primary: entity, shortForm: product === "dpia" ? "the organisation" : "the company" },
});

const after = doc.sections
  .map((s) => `### ${s.title}${s.degraded ? " *(degraded — no determination on the record)*" : ""}\n\n${s.text}`)
  .join("\n\n");

console.log(`## BEFORE — donor report, walked in key order\n\n${before()}`);
console.log(`\n\n## AFTER — planned document (${doc.arc.join(" → ")})\n\n${after}`);
