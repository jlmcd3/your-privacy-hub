// CPPA-HF6R — tests covering:
//   1) ADMT full-report fallback consumption on prose surfaces outside
//      the four gap arrays (scope_analysis, priority_actions, etc.).
//   2) Risk conflicting-inputs render layer (label mapping, both sides,
//      fail-closed catch-all).
//   3) Cyber count-vs-list reconciliation.

import { assert, assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";

// ── (1) ADMT fallback-consumption pipeline (mirrors main path) ─────────
const PRE_INJECT_PHRASE_RULES: Array<[RegExp, string]> = [
  [/\bthe\s+applicable\s+definitional\s+provision\b/gi, "the cited provision"],
  [/\bthe\s+applicable\s+regulation\s+section\b/gi, "the cited provision"],
  [/\bthe\s+the\s+cited\s+provision\b/gi, "the cited provision"],
  [/\bthe\s+((?:full|four|three|two|entire|all|many|few|several)\s+)the\s+cited\s+provision\b/gi, "$1the cited provision"],
];
const TOKEN_RE = /\bthe\s+cited\s+provision(?:\s+(?:governing|above|below|referenced))?\b/gi;
const UNDER_RE = /\bunder\s+the\s+cited\s+provision\b/gi;
const PURSUANT_RE = /\bpursuant\s+to\s+the\s+cited\s+provision\b/gi;
const SUBCH = "11 CCR §§ 7220–7222 (the ADMT subchapter)";

function pipeline(root: any): any {
  const consumeStr = (v: string): string => {
    let next = v;
    next = next.replace(/\bthe\s+applicable\s+definitional\s+provision\b/gi, SUBCH);
    next = next.replace(/\bthe\s+applicable\s+regulation\s+section\b/gi, SUBCH);
    next = next.replace(/\bthe\s+the\s+cited\s+provision\b/gi, "the cited provision");
    next = next.replace(/\bthe\s+((?:full|four|three|two|entire|all|many|few|several)\s+)the\s+cited\s+provision\b/gi, "$1the cited provision");
    next = next.replace(UNDER_RE, `under ${SUBCH}`);
    next = next.replace(PURSUANT_RE, `pursuant to ${SUBCH}`);
    next = next.replace(TOKEN_RE, SUBCH);
    // Post: doubled-article collapse + whitespace tidy.
    next = next.replace(/\bthe\s+the\b/gi, "the").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1");
    return next;
  };
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === "string") node[i] = consumeStr(v);
        else if (v && typeof v === "object") walk(v);
      }
      return;
    }
    if (typeof node !== "object") return;
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string") node[k] = consumeStr(v);
      else if (v && typeof v === "object") walk(v);
    }
  };
  walk(root);
  return root;
}

Deno.test("HF6R B-EXT — scope_analysis + priority_actions artifacts fully consumed", () => {
  const report = {
    scope_analysis: {
      summary: "The response must satisfy the applicable definitional provision.",
      significant_decision_reasoning: "Under the applicable regulation section, the business must respond.",
      is_admt_reasoning: "Triggering the full the cited provision ADMT obligations.",
    },
    priority_actions: [
      "None of the four the cited provision consolidation scenarios apply.",
      "Pursuant to the applicable definitional provision the business owes disclosure.",
    ],
    consolidated_notice_analysis: {
      basis: "All the the cited provision requirements must be met.",
    },
  };
  const out = pipeline(report);
  const flat = JSON.stringify(out);
  const stragglers = flat.match(/the cited provision/gi) ?? [];
  if (stragglers.length) console.log("STRAGGLERS:", flat);
  assertEquals(stragglers.length, 0, flat);
  assert(!/\bthe\s+the\b/i.test(flat), `doubled article survived: ${flat}`);
  assert(flat.includes(SUBCH), "fallback anchor not injected");
});

// ── (2) Risk conflicting-inputs label map ─────────────────────────────
const RISK_INTAKE_FIELD_LABELS: Array<[RegExp, string]> = [
  [/^i5_admt_logic$/i, "the ADMT logic description"],
  [/^q19_admt_description$/i, "the ADMT-system description"],
  [/^q20_admt_opt_out$/i, "the ADMT opt-out description"],
  [/^i5_admt_training_source$/i, "the ADMT-training source"],
  [/^q18b?_admt_training$/i, "the ADMT-training answer"],
  [/^q18[a-c]?_admt(?:_[a-z_]+)?$/i, "the ADMT trigger response"],
  [/^i7_internal_contributors$/i, "the internal-contributors roster"],
  [/^i1b_min_pi$/i, "the minimum-PI justification"],
  [/^q15c_spi_volume$/i, "the sensitive-PI volume figure"],
];
const RAW_FIELD_ID_RE = /^([a-z]{1,3}\d{1,3}[a-z]?_[a-z][a-z0-9_]{2,}|intake_field_\d+)$/i;
function labelForIntakeFieldId(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  for (const [re, label] of RISK_INTAKE_FIELD_LABELS) if (re.test(s)) return label;
  if (RAW_FIELD_ID_RE.test(s)) return "the corresponding intake field";
  return s;
}
function renderPair(a: string, b: string): string {
  return `${labelForIntakeFieldId(a)} ↔ ${labelForIntakeFieldId(b)}`;
}

Deno.test("HF6R A — conflicting-inputs raw ids are labeled, both sides", () => {
  const line = renderPair("q18b_admt_training", "i5_admt_training_source");
  assert(!/\bi\d+_[a-z_]+\b/.test(line), `raw id survived: ${line}`);
  assert(!/intake_field_\d+/.test(line), `intake_field survived: ${line}`);
  assert(line.includes("the ADMT-training answer"));
  assert(line.includes("the ADMT-training source"));
});

Deno.test("HF6R A — unmapped raw ids fall closed to generic descriptor", () => {
  const line = renderPair("i99_unknown_field", "intake_field_2");
  assert(!/i99_unknown_field/.test(line), `unmapped raw id leaked: ${line}`);
  assert(!/intake_field_\d+/.test(line), `intake_field leaked: ${line}`);
  assertEquals(line, "the corresponding intake field ↔ the corresponding intake field");
});

Deno.test("HF6R A — mapped + unmapped mix both sides labeled", () => {
  const line = renderPair("q19_admt_description", "i44_zzz_thing");
  assert(!/\bi\d+_[a-z_]+\b/.test(line), line);
  assert(line.includes("the ADMT-system description"));
  assert(line.includes("the corresponding intake field"));
});

// ── (3) Cyber count-vs-list reconciliation ────────────────────────────
const NUM_WORDS: Record<string, number> = {
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
  seventeen:17,eighteen:18,nineteen:19,twenty:20,
};
const WORD_BY_NUM: Record<number, string> = Object.fromEntries(
  Object.entries(NUM_WORDS).map(([w, n]) => [n, w]),
);
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
function reconcile(prose: string): string {
  const RE = /\b(?:([A-Z]?[a-z]+)|(\d{1,2}))\b(\s+(?:of\s+the\s+18\s+(?:components|controls|required[^\n:]{0,40})[^:\n\u2013\u2014-]{0,80}|additional[^:\n\u2014\u2013-]{0,80}))([:\u2014\u2013-])\s*([^.\n]+?)(?=\.\s|\.$|$)/g;
  return prose.replace(RE, (m, wRaw, nRaw, mid, sep, tail) => {
    const wLower = typeof wRaw === "string" ? wRaw.toLowerCase() : "";
    const asWord = wLower && wLower in NUM_WORDS;
    const asDigit = typeof nRaw === "string" && nRaw.length > 0;
    if (!asWord && !asDigit) return m;
    const stated = asWord ? NUM_WORDS[wLower] : Number(nRaw);
    if (!Number.isFinite(stated) || stated <= 0 || stated > 20) return m;
    let items: string[] = tail.split(/;\s*/).map((s: string) => s.trim()).filter(Boolean);
    if (items.length < 2) {
      const alt = tail.split(/,\s*(?:and\s+)?/).map((s: string) => s.trim()).filter(Boolean);
      if (alt.length >= 2) items = alt;
    }
    const actual = items.length;
    if (!Number.isFinite(actual) || actual <= 0 || actual > 20) return m;
    if (actual === stated) return m;
    if (asWord) {
      const replacement = WORD_BY_NUM[actual] ?? String(actual);
      const wasCap = wRaw.charAt(0) === wRaw.charAt(0).toUpperCase();
      return `${wasCap ? cap(replacement) : replacement}${mid}${sep} ${tail}`;
    }
    return `${String(actual)}${mid}${sep} ${tail}`;
  });
}

Deno.test("HF6R C — 'Nine of the 18 components' with 8 items rewritten to Eight", () => {
  const p = "Nine of the 18 components are recorded: A; B; C; D; E; F; G; H. That drives the risk posture.";
  const out = reconcile(p);
  assert(out.startsWith("Eight of the 18 components"), out);
});

Deno.test("HF6R C — 'Five additional' with 6 items rewritten to Six", () => {
  const p = "Five additional gaps span: alpha; bravo; charlie; delta; echo; foxtrot. Priority actions follow.";
  const out = reconcile(p);
  assert(out.startsWith("Six additional"), out);
});

Deno.test("HF6R C — matching count is left untouched", () => {
  const p = "Three of the 18 components are gaps: X; Y; Z.";
  assertEquals(reconcile(p), p);
});
