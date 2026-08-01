// CPPA-HF6C — regression tests reproducing the exact 25fa7105 leaks:
//   (1) scope_analysis / priority_actions / consolidated_notice_analysis
//       carrying "the cited provision" or "the cited definition" tokens
//       when the main-try walkers were skipped by an upstream throw.
//       Defense-in-depth pass (hf6cWalk) must consume them.
//   (2) §7001(e)(1) sitting inside a §7222(b)(3) operative chain in the
//       aggregate_access_response and in access_gaps[i].finding prose.

import { assert, assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";

// ── (1) Defense-in-depth walker — inline copy mirroring run-admt-checker
const HF6C_SUBCH_FALLBACK = "11 CCR §§ 7220–7222 (the ADMT subchapter)";
const HF6C_SUBCH_TOKEN_RE = /\bthe\s+cited\s+(?:provision|definition)(?:\s+(?:governing|above|below|referenced))?\b/gi;
const HF6C_SUBCH_UNDER_RE = /\bunder\s+the\s+cited\s+(?:provision|definition)\b/gi;
const HF6C_SUBCH_PURSUANT_RE = /\bpursuant\s+to\s+the\s+cited\s+(?:provision|definition)\b/gi;
const HF6C_SYN: Array<[RegExp, string]> = [
  [/\bthe\s+applicable\s+definitional\s+provision\b/gi, HF6C_SUBCH_FALLBACK],
  [/\bthe\s+applicable\s+regulation\s+section\b/gi, HF6C_SUBCH_FALLBACK],
];
function hf6cConsume(v: string): string {
  let n = v;
  for (const [re, sub] of HF6C_SYN) n = n.replace(re, sub);
  n = n.replace(/\bthe\s+the\s+cited\s+(?:provision|definition)\b/gi, "the cited provision");
  n = n.replace(/\bthe\s+((?:full|four|three|two|entire|all|many|few|several)\s+)the\s+cited\s+(?:provision|definition)\b/gi, "$1the cited provision");
  n = n.replace(HF6C_SUBCH_UNDER_RE, `under ${HF6C_SUBCH_FALLBACK}`);
  n = n.replace(HF6C_SUBCH_PURSUANT_RE, `pursuant to ${HF6C_SUBCH_FALLBACK}`);
  n = n.replace(HF6C_SUBCH_TOKEN_RE, HF6C_SUBCH_FALLBACK);
  n = n.replace(/\bthe\s+the\b/gi, "the").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1");
  return n;
}
function hf6cWalk(node: any) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (typeof v === "string") node[i] = hf6cConsume(v);
      else if (v && typeof v === "object") hf6cWalk(v);
    }
    return;
  }
  if (typeof node !== "object") return;
  for (const k of Object.keys(node)) {
    const v = (node as any)[k];
    if (typeof v === "string") (node as any)[k] = hf6cConsume(v);
    else if (v && typeof v === "object") hf6cWalk(v);
  }
}

Deno.test("HF6C Task A — 25fa7105 scope_analysis.summary leaks fully consumed", () => {
  // Reproduces the EXACT prose from cppa_assessments 25fa7105.
  const report: any = {
    scope_analysis: {
      summary: "This assessment proceeds on the established determination that the CreditIQ Underwriting Engine is ADMT under the cited definition and that its credit approval, denial, and pricing decisions constitute significant decisions. The human review described does not qualify because the reviewer cannot override the output, so the full the cited provision ADMT obligations apply. Multiple risk-assessment triggers under the cited provision are independently established.",
    },
    priority_actions: [
      "Pursuant to the cited provision, publish the Pre-use Notice before further ADMT processing.",
      "Under the cited definition, complete a risk assessment now.",
    ],
    consolidated_notice_analysis: {
      basis: "All the the cited provision requirements must be met before processing resumes.",
    },
  };
  hf6cWalk(report);
  const flat = JSON.stringify(report);
  assert(!/the cited provision/i.test(flat), `token leaked: ${flat}`);
  assert(!/the cited definition/i.test(flat), `definition-variant leaked: ${flat}`);
  assert(!/\bthe\s+the\b/i.test(flat), `doubled article survived: ${flat}`);
  assert(flat.includes("11 CCR §§ 7220–7222"), "subchapter fallback not injected");
});

Deno.test("HF6C Task A — walker is idempotent (second pass no-op)", () => {
  const r: any = { s: "Under the cited provision, complete a risk assessment." };
  hf6cWalk(r);
  const once = r.s;
  hf6cWalk(r);
  assertEquals(r.s, once, "second pass mutated already-clean prose");
});

// ── (2) HF6C Task B — §7001 removed from operative chain in prose and
//        in aggregate_access_response
function stripDefFrom7222Chain(s: unknown): unknown {
  if (typeof s !== "string") return s;
  if (!/§\s*7222\(b\)\((?:3|4)\)/.test(s)) return s;
  if (!/§\s*7001/.test(s)) return s;
  let out = s
    .replace(/\s*\+\s*(?:11\s*CCR\s*)?§\s*7001(?:\([a-z0-9]+\))*/gi, "")
    .replace(/(?:11\s*CCR\s*)?§\s*7001(?:\([a-z0-9]+\))*\s*\+\s*/gi, "")
    .replace(/,\s*(?:11\s*CCR\s*)?§\s*7001(?:\([a-z0-9]+\))*/gi, "")
    .replace(/\s{2,}/g, " ").trim();
  return out;
}

Deno.test("HF6C Task B — 25fa7105 access_gaps.finding §7001 excised from §7222 chain", () => {
  const finding = "The intake states that the ADMT output is a 'material factor — heavily weighted alongside others,' meaning the system is not the sole factor. 11 CCR § 7222(b)(3) + 11 CCR § 7001(e)(1) + 11 CCR § 7222(b)(3)(A) requires the access response to disclose whether the ADMT output was the sole factor.";
  const out = stripDefFrom7222Chain(finding) as string;
  assert(!/§\s*7001/.test(out), `§7001 survived in operative chain: ${out}`);
  assert(/§\s*7222\(b\)\(3\)/.test(out), "canonical §7222(b)(3) anchor missing");
  assert(/§\s*7222\(b\)\(3\)\(A\)/.test(out), "canonical §7222(b)(3)(A) anchor missing");
});

Deno.test("HF6C Task B — aggregate_access_response §7001 excised", () => {
  const aar: any = {
    citation_chain: "11 CCR § 7222(b)(3) + 11 CCR § 7001(e)(1) + 11 CCR § 7222(b)(3)(A)",
    explanation: "Under 11 CCR § 7222(b)(3) + 11 CCR § 7001(e)(1) + 11 CCR § 7222(b)(3)(A) the access response must include the disclosure.",
  };
  for (const k of Object.keys(aar)) aar[k] = stripDefFrom7222Chain(aar[k]);
  const flat = JSON.stringify(aar);
  assert(!/§\s*7001/.test(flat), `§7001 survived in aggregate_access_response: ${flat}`);
  assert(/§\s*7222\(b\)\(3\)/.test(flat));
});
