import { readFileSync, writeFileSync } from "node:fs";
import { loadCyberProvisionRows } from "../../src/registry/__tests__/corpus-client";
import { derive7123Components, normalizeCorpusText } from "../../supabase/functions/run-cppa-cybersecurity/_local/registry/cyber-verified-authorities";

const coaching = JSON.parse(readFileSync("scripts/item371/coaching.json", "utf8"));

function sub(text: string, path: string): string {
  // extract "(x)" top-level subsection body from a normalized excerpt
  const t = normalizeCorpusText(text);
  const re = new RegExp(`\\(${path}\\)\\s`);
  const m = re.exec(t);
  if (!m) throw new Error("subsection not found: " + path);
  const start = m.index + m[0].length;
  const rest = t.slice(start);
  const nextLetter = String.fromCharCode(path.charCodeAt(0) + 1);
  const next = new RegExp(`\\s\\(${nextLetter}\\)\\s`).exec(rest);
  let body = next ? rest.slice(0, next.index) : rest;
  body = body.replace(/\s*Note:\s*Authority cited:.*$/s, "").trim();
  return body;
}
function firstSentence(s: string): string {
  const i = s.indexOf("Standardization.");
  return i >= 0 ? s.slice(0, i + "Standardization.".length) : s;
}
function nested(text: string, top: string, n: number): string {
  const body = sub(text, top);
  const re = new RegExp(`\\(${n}\\)\\s`);
  const m = re.exec(body);
  if (!m) throw new Error("nested not found " + top + n);
  const start = m.index + m[0].length;
  const rest = body.slice(start);
  const next = new RegExp(`\\s\\(${n + 1}\\)\\s`).exec(rest);
  return (next ? rest.slice(0, next.index) : rest).replace(/;?\s*and$/, "").trim();
}

const CONTROL_META: Array<{ key: string; label: string; plain: string; note?: string }> = JSON.parse(
  readFileSync("scripts/item371/control-meta.json", "utf8"),
);

const PROFILE: Array<Record<string, any>> = JSON.parse(
  readFileSync("scripts/item371/profile-entries.json", "utf8"),
);

function q(s: string): string {
  return JSON.stringify(s);
}

function emit(key: string, e: Record<string, any>): string {
  const order = ["fieldLabel","citation","citationUrl","plainSummary","regulationText","enforcementNote","coachLead","coachBody","goodAnswer","commonMistake"];
  const lines = order.filter((k) => e[k] != null).map((k) => `    ${k}: ${k === "citationUrl" ? "CPPA_URL" : q(e[k])},`);
  return `  ${key}: {\n${lines.join("\n")}\n  },`;
}

async function main() {
  const rows = await loadCyberProvisionRows();
  if (!rows) throw new Error("corpus unreachable");
  const t7122 = String(rows["cppa-7122"].verbatim_excerpt ?? "");
  const t7123 = String(rows["cppa-7123"].verbatim_excerpt ?? "");
  const t7124 = String(rows["cppa-7124"].verbatim_excerpt ?? "");

  const comps = derive7123Components(t7123);
  if (comps.length !== 18) throw new Error("expected 18 components, got " + comps.length);

  const TEXTS: Record<string, string> = {
    "7122a_chapeau": firstSentence(sub(t7122, "a")),
    "7122a2": nested(t7122, "a", 2),
    "7122g": sub(t7122, "g"),
    "7123b": sub(t7123, "b"),
    "7123b1": nested(t7123, "b", 1),
    "7123f": sub(t7123, "f"),
    "7124a": sub(t7124, "a"),
    "7124c": sub(t7124, "c"),
    "7124d1": nested(t7124, "d", 1),
    "7123c17": comps[16].verbatim,
  };

  const out: string[] = [];
  for (const p of PROFILE) {
    const { key, textRef, ...rest } = p as any;
    out.push(emit(key, { ...rest, citationUrl: true, regulationText: TEXTS[textRef] }));
  }
  CONTROL_META.forEach((c, i) => {
    const co = coaching[c.key];
    if (!co) throw new Error("no coaching for " + c.key);
    out.push(
      emit(c.key, {
        fieldLabel: c.label,
        citation: `11 CCR § 7123(c)(${i + 1})`,
        citationUrl: true,
        plainSummary: c.plain,
        regulationText: comps[i].verbatim,
        enforcementNote: c.note,
        ...co,
      }),
    );
  });

  const TAIL: Array<Record<string, any>> = JSON.parse(readFileSync("scripts/item371/tail-entries.json", "utf8"));
  for (const p of TAIL) {
    const { key, textRef, ...rest } = p as any;
    out.push(emit(key, { ...rest, citationUrl: true, regulationText: TEXTS[textRef] }));
  }

  const header = readFileSync("scripts/item371/header.txt", "utf8");
  writeFileSync(
    "src/components/cppa/CPPACyberRailEntries.ts",
    header + "\nexport const CPPA_CYBER_RAIL: Record<string, RailEntry> = {\n" + out.join("\n") + "\n};\n",
  );
  console.log("wrote", out.length, "entries");
}
main();
