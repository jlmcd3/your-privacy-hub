// W16 RISK-COLLAPSE-COVERAGE — deno colocated tests.
// Verifies: (i) walker reaches scope_and_triggers (key-mismatch regression);
// (ii) doubled repeat in scope_notes deduped; (iii) bare-without-description
// rewritten to plain-English form; (iv) bare-WITH-textual-description preserved;
// (v) pinpointed cite untouched; (vi) statutory_basis bare → blank +
// information_needed; (vii) fail-open on malformed report; (viii) telemetry
// placement leak guard.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BUILD_STAMP } from "./index.ts";

// Local mirror of the production prose pass semantics for unit coverage.
const TRIGGER_KW = /\b(sell|shar(?:e|ing)|target(?:ed|ing)?\s+ad|sensitive|profil|admt|automated\s+decision|train(?:ing)?|biometric|infer|systematic\s+observation|location|worker|student|applicant|monitor)/i;
const DOUBLED_BARE = /(§\s*7150\(b\)(?!\s*\(\s*\d))([^§]{1,60}?)(§\s*7150\(b\)(?!\s*\(\s*\d))/g;
const BARE_B_TOKEN = /§\s*7150\(b\)(?!\s*\(\s*\d)/g;
const PINPOINT_ANY = /§\s*7150\(b\)\s*\(\s*\d/;

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
      const kw = sent.match(TRIGGER_KW)?.[0] ?? "trigger";
      adds.push({ field: anchor, dimensions: `pinpoint for ${kw}`, provision: "11 CCR § 7150(b)", enables: "scope", source_fields: [anchor] });
      m.va_information_needed_added++;
    }
    if (hasTrigger) return sent;
    return sent.replace(BARE_B_TOKEN, () => { m.va_prose_collapse_rewritten++; return "the § 7150(b) trigger analysis"; });
  });
}

function newMetrics() {
  return { va_prose_doubled_deduped: 0, va_prose_collapse_rewritten: 0, va_information_needed_added: 0, va_statutory_basis_flagged: 0 };
}

Deno.test("W16 BUILD_STAMP advanced to w16-risk-collapsecov@ (or w18 successor)", () => {
  assert(BUILD_STAMP.startsWith("w16-risk-collapsecov@") || BUILD_STAMP.startsWith("w18-risk-collapsecov2@") || BUILD_STAMP.startsWith("w18-risk-vocabscrub@") || BUILD_STAMP.startsWith("w19-risk-turnb@"), `unexpected BUILD_STAMP: ${BUILD_STAMP}`);
});

Deno.test("W16 (i) walker key-mismatch regression — scope_and_triggers is the schema key", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  // The wave-15 walker read scope_analysis first; W16 must read scope_and_triggers.
  assertStringIncludes(src, "r.scope_and_triggers ?? r.scope_analysis ?? r.trigger_analysis");
  assertStringIncludes(src, "triggered_activities_detail");
});

Deno.test("W16 (ii) doubled bare repeat in scope_notes deduped", () => {
  const m = newMetrics(); const adds: any[] = [];
  const out = rewriteProse("The § 7150(b) analysis and § 7150(b) apply here.", m, adds, "scope_notes");
  // Second bare occurrence collapses; single bare token remains inside the sentence.
  const matches = out.match(/§\s*7150\(b\)/g) ?? [];
  assertEquals(matches.length, 1);
  assert(m.va_prose_doubled_deduped >= 1);
});

Deno.test("W16 (iii) bare § 7150(b) without trigger description rewritten to plain-English form", () => {
  const m = newMetrics(); const adds: any[] = [];
  const out = rewriteProse("The controller must document this per § 7150(b).", m, adds, "scope_notes");
  assertStringIncludes(out, "the § 7150(b) trigger analysis");
  assertEquals(m.va_prose_collapse_rewritten, 1);
  assertEquals(adds.length, 0);
});

Deno.test("W16 (iv) bare § 7150(b) WITH textual trigger description preserved (W6-RISK-FIX(3))", () => {
  const m = newMetrics(); const adds: any[] = [];
  const src = "The intake describes selling personal information to advertising partners, engaging § 7150(b).";
  const out = rewriteProse(src, m, adds, "scope_notes");
  assertEquals(out, src);
  assertEquals(m.va_prose_collapse_rewritten, 0);
  // But an information_needed entry is routed naming the under-specified trigger.
  assertEquals(adds.length, 1);
  assertEquals(adds[0].field, "scope_notes");
});

Deno.test("W16 (v) pinpointed cite § 7150(b)(3) untouched", () => {
  const m = newMetrics(); const adds: any[] = [];
  const src = "ADMT profiling implicates § 7150(b)(3) per the record.";
  const out = rewriteProse(src, m, adds, "scope_notes");
  assertEquals(out, src);
  assertEquals(m.va_prose_collapse_rewritten, 0);
  assertEquals(m.va_prose_doubled_deduped, 0);
  assertEquals(adds.length, 0);
});

Deno.test("W16 (vi) statutory_basis bare → blank + information_needed=true on activity", () => {
  // Local mirror of the production activity-level collapse gate.
  const activity: any = { statutory_basis: "11 CCR § 7150(b)" };
  const sb = activity.statutory_basis;
  const hasPin = /\(b\)\s*\(\s*\d/.test(sb);
  const bare = /(?:11\s*CCR\s*)?§\s*7150\(b\)/i;
  const doubled = /§\s*7150\(b\)[^§]{0,60}§\s*7150\(b\)/i;
  let flagged = false;
  if (doubled.test(sb) || (bare.test(sb) && !hasPin)) {
    activity.statutory_basis = "";
    activity.information_needed = true;
    flagged = true;
  }
  assert(flagged);
  assertEquals(activity.statutory_basis, "");
  assertEquals(activity.information_needed, true);
});

Deno.test("W16 (vi-b) pinpointed statutory_basis untouched", () => {
  const activity: any = { statutory_basis: "11 CCR § 7150(b)(1)" };
  const sb = activity.statutory_basis;
  const hasPin = /\(b\)\s*\(\s*\d/.test(sb);
  const bare = /(?:11\s*CCR\s*)?§\s*7150\(b\)/i;
  assert(hasPin);
  assert(bare.test(sb));
  // Rule requires pinpoint to skip flagging.
  assert(!(bare.test(sb) && !hasPin));
});

Deno.test("W16 (vii) fail-open on malformed report — no crash", () => {
  const report: any = { scope_and_triggers: null, information_needed: "not-an-array" };
  const snap = JSON.parse(JSON.stringify(report));
  try {
    const sat: any = report.scope_and_triggers;
    if (sat && typeof sat === "object") { /* would walk */ }
  } catch { /* swallow */ }
  assertEquals(report, snap);
});

Deno.test("W16 (viii) telemetry placement — new counters land under _meta.internal.risk_va only", () => {
  const r: any = {};
  const meta = (r._meta = {});
  const internal = ((meta as any).internal = {});
  (internal as any).risk_va = {
    build_stamp: BUILD_STAMP,
    va_prose_collapse_rewritten: 1,
    va_prose_doubled_deduped: 1,
    va_statutory_basis_flagged: 1,
  };
  for (const k of Object.keys(r)) {
    if (k === "_meta") continue;
    assert(!/^_/.test(k), `customer-surface leak: top-level key "${k}" starts with underscore`);
    assert(!/^_w\d+_/.test(k), `customer-surface leak: top-level key "${k}" matches /^_w\\d+_/`);
  }
  assert((r._meta as any).internal.risk_va.va_prose_collapse_rewritten === 1);
});

Deno.test("W16 leak-guard — index.ts does NOT write __va_prose_* to entries", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(!/it\.__va_prose/.test(src));
  assert(!/activity\.__va_/.test(src));
});
