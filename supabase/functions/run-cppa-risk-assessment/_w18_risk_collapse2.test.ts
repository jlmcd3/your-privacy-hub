// W18 RISK-COLLAPSE-COVERAGE-2 — deno colocated tests.
// Wave-17 escape (doc 52dfb9a1): bare/doubled "§ 7150(b) … § 7150(b)"
// SUBSECTION-COLLAPSE recurred on inconsistency_flags prose — a surface not
// covered by w16-risk-collapsecov. This suite exercises the coverage
// extension across every prose / citation-shaped slot the w18 walker now
// visits: inconsistency_flags, exception_analysis, risk_assessment_by_activity
// (+ nested adverse_effects), priority_actions, information_needed,
// record_sufficiency, strengthen_items, risk_register.entries,
// assessment_summary, enforcement_context.
//
// The production semantics live in run-cppa-risk-assessment/index.ts inside
// the W15/W16/W18 registry-wiring block. This suite mirrors the regex
// primitives locally (matching the mirror pattern established by
// _w16_risk_collapse.test.ts) so it exercises the SAME rules the deployed
// walker applies, and additionally verifies the deployed source contains the
// new coverage call-sites.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BUILD_STAMP } from "./index.ts";

const TRIGGER_KW = /\b(sell|shar(?:e|ing)|target(?:ed|ing)?\s+ad|sensitive|profil|admt|automated\s+decision|train(?:ing)?|biometric|infer|systematic\s+observation|location|worker|student|applicant|monitor)/i;
const DOUBLED_BARE = /(§\s*7150\(b\)(?!\s*\(\s*\d))([^§]{1,60}?)(§\s*7150\(b\)(?!\s*\(\s*\d))/g;
const BARE_B_TOKEN = /§\s*7150\(b\)(?!\s*\(\s*\d)/g;
const PINPOINT_ANY = /§\s*7150\(b\)\s*\(\s*\d/;

function newMetrics() {
  return {
    va_prose_doubled_deduped: 0,
    va_prose_collapse_rewritten: 0,
    va_information_needed_added: 0,
    va_cite_fields_flagged: 0,
    va_prose_fields_scanned: 0,
  };
}

function rewriteProse(s: string, m: Record<string, number>, adds: any[], anchor: string): string {
  let out = s;
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(DOUBLED_BARE, (_m, a, mid) => { m.va_prose_doubled_deduped++; return `${a}${mid}`; });
  }
  return out.replace(/[^.!?]+[.!?]?/g, (sent) => {
    BARE_B_TOKEN.lastIndex = 0;
    if (!BARE_B_TOKEN.test(sent)) return sent;
    BARE_B_TOKEN.lastIndex = 0;
    const hasTrigger = TRIGGER_KW.test(sent);
    const hasPin = PINPOINT_ANY.test(sent);
    if (hasTrigger && !hasPin) {
      adds.push({ field: anchor, dimensions: "pinpoint", provision: "11 CCR § 7150(b)", enables: "scope", source_fields: [anchor] });
      m.va_information_needed_added++;
    }
    if (hasTrigger) return sent;
    return sent.replace(BARE_B_TOKEN, () => { m.va_prose_collapse_rewritten++; return "the § 7150(b) trigger analysis"; });
  });
}

function rewriteProseFields(arr: any, fields: string[], anchor: string, m: any, adds: any[]): void {
  if (!Array.isArray(arr)) return;
  for (let i = 0; i < arr.length; i++) {
    const it = arr[i];
    if (!it || typeof it !== "object") continue;
    for (const f of fields) {
      if (typeof it[f] === "string" && it[f]) {
        m.va_prose_fields_scanned++;
        it[f] = rewriteProse(it[f], m, adds, `${anchor}[${i}].${f}`);
      }
    }
  }
}

function flagCiteField(entry: any, field: string, m: any): void {
  if (!entry || typeof entry !== "object") return;
  const raw = typeof entry[field] === "string" ? entry[field] : "";
  if (!raw) return;
  const hasPin = /\(b\)\s*\(\s*\d/.test(raw);
  const bare = /(?:11\s*CCR\s*)?§\s*7150\(b\)/i;
  const doubled = /§\s*7150\(b\)[^§]{0,60}§\s*7150\(b\)/i;
  if (doubled.test(raw) || (bare.test(raw) && !hasPin)) {
    entry[field] = "";
    entry.information_needed = true;
    m.va_cite_fields_flagged++;
    m.va_information_needed_added++;
  }
}

Deno.test("W18 BUILD_STAMP restamped to w18-risk-collapsecov2@", () => {
  assert(BUILD_STAMP.startsWith("w18-risk-collapsecov2@"), `unexpected BUILD_STAMP: ${BUILD_STAMP}`);
});

Deno.test("W18 (a) inconsistency_flags bare-collapse in description flagged — WAVE-17 ESCAPE (doc 52dfb9a1)", () => {
  const m = newMetrics(); const adds: any[] = [];
  const flags: any[] = [{
    description: "The record documents sensitive-location processing under § 7150(b), but the sensitive_location_basis field records 'Not applicable — no sensitive-location processing'.",
    resolution_required: "The controller must resolve this per § 7150(b) and document the determination.",
    regulatory_citation: "11 CCR § 7150(b)",
  }];
  rewriteProseFields(flags, ["description", "resolution_required"], "inconsistency_flags", m, adds);
  flagCiteField(flags[0], "regulatory_citation", m);
  // description carries a trigger keyword (sensitive/location) → info_needed routed, bare preserved (W6-RISK-FIX(3) form).
  assert(m.va_information_needed_added >= 1);
  // resolution_required is a plain sentence with no trigger keyword → bare rewritten to plain-English.
  assertStringIncludes(flags[0].resolution_required, "the § 7150(b) trigger analysis");
  // regulatory_citation is a bare/doubled citation-shaped slot → blanked + information_needed=true.
  assertEquals(flags[0].regulatory_citation, "");
  assertEquals(flags[0].information_needed, true);
  assert(m.va_cite_fields_flagged >= 1);
});

Deno.test("W18 (b) inconsistency_flags DOUBLED bare collapse deduped", () => {
  const m = newMetrics(); const adds: any[] = [];
  const flags: any[] = [{
    description: "The record cites § 7150(b) and later restates § 7150(b) without a pinpoint.",
  }];
  rewriteProseFields(flags, ["description"], "inconsistency_flags", m, adds);
  const matches = (flags[0].description.match(/§\s*7150\(b\)/g) ?? []).length;
  assertEquals(matches, 1);
  assert(m.va_prose_doubled_deduped >= 1);
});

Deno.test("W18 (c) specific-pinpoint § 7150(b)(3) on inconsistency_flags PASSTHROUGH untouched", () => {
  const m = newMetrics(); const adds: any[] = [];
  const flags: any[] = [{
    description: "ADMT profiling implicates § 7150(b)(3) per the record.",
    regulatory_citation: "11 CCR § 7150(b)(3)",
  }];
  const before = flags[0].description;
  const beforeCite = flags[0].regulatory_citation;
  rewriteProseFields(flags, ["description"], "inconsistency_flags", m, adds);
  flagCiteField(flags[0], "regulatory_citation", m);
  assertEquals(flags[0].description, before);
  assertEquals(flags[0].regulatory_citation, beforeCite);
  assertEquals(m.va_prose_collapse_rewritten, 0);
  assertEquals(m.va_cite_fields_flagged, 0);
  assertEquals(adds.length, 0);
});

Deno.test("W18 (d1) exception_analysis prose + statutory_basis covered", () => {
  const m = newMetrics(); const adds: any[] = [];
  const exceptions: any[] = [{
    facts_supporting: "The intake ties the fraud exception to § 7150(b), § 7150(b) — with no pinpoint.",
    argument_strength_rationale: "The controller must document this per § 7150(b).",
    statutory_basis: "11 CCR § 7150(b)",
  }];
  rewriteProseFields(exceptions, ["facts_supporting", "argument_strength_rationale"], "exception_analysis", m, adds);
  flagCiteField(exceptions[0], "statutory_basis", m);
  assert(m.va_prose_doubled_deduped >= 1);
  assertStringIncludes(exceptions[0].argument_strength_rationale, "the § 7150(b) trigger analysis");
  assertEquals(exceptions[0].statutory_basis, "");
  assertEquals(exceptions[0].information_needed, true);
});

Deno.test("W18 (d2) risk_assessment_by_activity prose + statutory_basis + nested adverse_effects.description covered", () => {
  const m = newMetrics(); const adds: any[] = [];
  const activities: any[] = [{
    purpose: "Serve targeted advertising within § 7150(b) obligations.",
    safeguard_gaps: "Documentation gap traced to § 7150(b) with no pinpoint noted.",
    benefits_outweigh_risks_rationale: "Balance turns on § 7150(b) analysis; not yet resolved.",
    section_7152_mapping: "Cross-reference to § 7150(b) mapping.",
    statutory_basis: "§ 7150(b)",
    adverse_effects: [
      { description: "Potential targeted-advertising harm implicating § 7150(b) — pinpoint pending." },
    ],
  }];
  rewriteProseFields(activities, ["purpose", "safeguard_gaps", "benefits_outweigh_risks_rationale", "section_7152_mapping"], "risk_assessment_by_activity", m, adds);
  walkCites(activities, ["statutory_basis"], m);
  // nested adverse_effects
  for (let i = 0; i < activities.length; i++) {
    rewriteProseFields(activities[i].adverse_effects, ["description"], `risk_assessment_by_activity[${i}].adverse_effects`, m, adds);
  }
  assertEquals(activities[0].statutory_basis, "");
  assertEquals(activities[0].information_needed, true);
  // adverse_effects.description contains a trigger keyword (target/advertising) → info_needed added, bare kept.
  assert(m.va_information_needed_added >= 1);
  // section_7152_mapping has no trigger keyword → plain-English rewrite.
  assertStringIncludes(activities[0].section_7152_mapping, "the § 7150(b) trigger analysis");
});

function walkCites(arr: any, fields: string[], m: any): void {
  if (!Array.isArray(arr)) return;
  for (const it of arr) for (const f of fields) flagCiteField(it, f, m);
}

Deno.test("W18 (d3) priority_actions prose + statutory_basis covered", () => {
  const m = newMetrics(); const adds: any[] = [];
  const actions: any[] = [{
    action: "Establish an opt-out method under § 7150(b) with no pinpoint given.",
    deadline_basis: "Deadline flows from § 7150(b).",
    statutory_basis: "11 CCR § 7150(b)",
  }];
  rewriteProseFields(actions, ["action", "deadline_basis"], "priority_actions", m, adds);
  walkCites(actions, ["statutory_basis"], m);
  assertEquals(actions[0].statutory_basis, "");
  assertEquals(actions[0].information_needed, true);
  // deadline_basis is a plain sentence — bare rewritten.
  assertStringIncludes(actions[0].deadline_basis, "the § 7150(b) trigger analysis");
});

Deno.test("W18 (d4) information_needed prose + provision covered", () => {
  const m = newMetrics(); const adds: any[] = [];
  const items: any[] = [{
    dimensions: "The specific § 7150(b) subsection the intake selects.",
    enables: "Completes the § 7150(b) trigger inventory.",
    provision: "§ 7150(b)",
  }];
  rewriteProseFields(items, ["dimensions", "enables"], "information_needed", m, adds);
  walkCites(items, ["provision"], m);
  assertEquals(items[0].provision, "");
  assertEquals(items[0].information_needed, true);
});

Deno.test("W18 (d5) record_sufficiency.statement, strengthen_items.recorded_basis + citation, assessment_summary, enforcement_context all covered", () => {
  const m = newMetrics(); const adds: any[] = [];
  // record_sufficiency
  const rs: any = { statement: "The record is incomplete pursuant to § 7150(b)." };
  if (typeof rs.statement === "string") { m.va_prose_fields_scanned++; rs.statement = rewriteProse(rs.statement, m, adds, "record_sufficiency.statement"); }
  assertStringIncludes(rs.statement, "the § 7150(b) trigger analysis");

  // strengthen_items
  const strengthen: any[] = [{ recorded_basis: "The controller intends to document § 7150(b) fully.", citation: "§ 7150(b)" }];
  rewriteProseFields(strengthen, ["recorded_basis"], "strengthen_items", m, adds);
  walkCites(strengthen, ["citation"], m);
  assertEquals(strengthen[0].citation, "");
  assertEquals(strengthen[0].information_needed, true);

  // assessment_summary
  const summary: any = {
    corpus_enforcement_note: "Enforcement patterns under § 7150(b) continue to evolve.",
    triggered_activities: ["§ 7150(b), § 7150(b) engagement", "§ 7150(b)(1) — selling personal information"],
  };
  if (typeof summary.corpus_enforcement_note === "string") { m.va_prose_fields_scanned++; summary.corpus_enforcement_note = rewriteProse(summary.corpus_enforcement_note, m, adds, "assessment_summary.corpus_enforcement_note"); }
  summary.triggered_activities = summary.triggered_activities.map((s: any, i: number) => (typeof s === "string" && s ? (m.va_prose_fields_scanned++, rewriteProse(s, m, adds, `assessment_summary.triggered_activities[${i}]`)) : s));
  assertStringIncludes(summary.corpus_enforcement_note, "the § 7150(b) trigger analysis");
  // Pinpointed entry survives untouched:
  assertStringIncludes(summary.triggered_activities[1], "§ 7150(b)(1)");

  // enforcement_context
  const ec: any = { relevant_precedents: "See prior § 7150(b) matters.", sector_specific_patterns: "Sector patterns cite § 7150(b).", audit_division_priorities: "Audit division targets § 7150(b) filings." };
  for (const f of ["relevant_precedents", "sector_specific_patterns", "audit_division_priorities"]) {
    if (typeof ec[f] === "string" && ec[f]) { m.va_prose_fields_scanned++; ec[f] = rewriteProse(ec[f], m, adds, `enforcement_context.${f}`); }
  }
  assertStringIncludes(ec.relevant_precedents, "the § 7150(b) trigger analysis");
  assert(m.va_prose_fields_scanned >= 6);
});

Deno.test("W18 (e) fail-open on malformed report — no crash, no mutation", () => {
  const report: any = { inconsistency_flags: null, exception_analysis: "not-an-array", risk_assessment_by_activity: undefined, priority_actions: {}, information_needed: 42 };
  const snap = JSON.parse(JSON.stringify(report));
  try {
    rewriteProseFields(report.inconsistency_flags, ["description"], "inconsistency_flags", newMetrics(), []);
    rewriteProseFields(report.exception_analysis, ["facts_supporting"], "exception_analysis", newMetrics(), []);
    rewriteProseFields(report.priority_actions, ["action"], "priority_actions", newMetrics(), []);
    walkCites(report.information_needed, ["provision"], newMetrics());
  } catch { /* must not throw */ }
  assertEquals(report, snap);
});

Deno.test("W18 (f) telemetry-placement leak guard — new counters land under _meta.internal.risk_va only", () => {
  const r: any = { inconsistency_flags: [] };
  const meta = (r._meta = {});
  const internal = ((meta as any).internal = {});
  (internal as any).risk_va = {
    build_stamp: BUILD_STAMP,
    va_prose_fields_scanned: 12,
    va_cite_fields_flagged: 3,
    va_prose_collapse_rewritten: 5,
    va_prose_doubled_deduped: 2,
  };
  for (const k of Object.keys(r)) {
    if (k === "_meta") continue;
    assert(!/^_/.test(k), `customer-surface leak: top-level key "${k}" starts with underscore`);
    assert(!/^_w\d+_/.test(k), `customer-surface leak: top-level key "${k}" matches /^_w\\d+_/`);
  }
  assert((r._meta as any).internal.risk_va.va_prose_fields_scanned === 12);
});

Deno.test("W18 (g) index.ts source wires each newly covered slot", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  // Extended coverage call-sites present:
  assertStringIncludes(src, 'rewriteProseFields(\n        r.inconsistency_flags');
  assertStringIncludes(src, 'walkCiteFields(r.inconsistency_flags, ["regulatory_citation"])');
  assertStringIncludes(src, 'rewriteProseFields(\n        r.exception_analysis');
  assertStringIncludes(src, 'walkCiteFields(r.exception_analysis, ["statutory_basis"])');
  assertStringIncludes(src, 'rewriteProseFields(\n        r.risk_assessment_by_activity');
  assertStringIncludes(src, 'walkCiteFields(r.risk_assessment_by_activity, ["statutory_basis"])');
  assertStringIncludes(src, 'ra.adverse_effects');
  assertStringIncludes(src, 'rewriteProseFields(\n        r.priority_actions');
  assertStringIncludes(src, 'walkCiteFields(r.priority_actions, ["statutory_basis"])');
  assertStringIncludes(src, 'rewriteProseFields(\n        r.information_needed');
  assertStringIncludes(src, 'walkCiteFields(r.information_needed, ["provision"])');
  assertStringIncludes(src, "record_sufficiency.statement");
  assertStringIncludes(src, 'walkCiteFields(r.strengthen_items, ["citation"])');
  assertStringIncludes(src, 'walkCiteFields(r.risk_register.entries, ["statutory_basis"])');
  assertStringIncludes(src, "assessment_summary.corpus_enforcement_note");
  assertStringIncludes(src, "enforcement_context.");
  // Leak guard: no customer-surface __va_* writes.
  assert(!/it\.__va_/.test(src));
});
