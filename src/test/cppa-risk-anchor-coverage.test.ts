/**
 * Doc 261-review (2026-09-15, EX 01 / CL-T01 / CL-T02) — every validation
 * failure on the CPPA Risk intake must be able to highlight, scroll to and
 * focus the question it names; every responsive grid row must let each of
 * its controls shrink.
 *
 * Source-level test. src/lib/intakeValidation.ts states the contract: the
 * keys a step check returns "are matched against the data-field attribute
 * rendered by FieldShell, which is what gets the red outline and the
 * scroll/focus treatment." Before this review 36 of 71 keys had no such
 * attribute and none of the six repeatable blocks anchored its rows, so the
 * message appeared at the bottom of the step and nothing else happened.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync("src/pages/CPPARiskAssessment.tsx", "utf8");

/** The text of the first argument of a call whose "(" sits at `open`. */
function firstArgument(src: string, open: number): string {
  let depth = 0;
  let out = "";
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "(") { depth++; if (depth === 1) continue; }
    else if (c === ")") { depth--; if (depth === 0) break; }
    else if (c === "," && depth === 1) break;
    out += c;
  }
  return out.trim();
}

const ROW_KEY = /rowKey\(\s*"([^"]+)"\s*,\s*\w+\s*(?:,\s*"([^"]+)")?\s*\)/;

/** Every key that can reach fail() as a focus key. */
function failKeys(): { literals: Set<string>; rows: Set<string> } {
  const literals = new Set<string>();
  const rows = new Set<string>();
  const re = /\bfail\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(SOURCE))) {
    const arg = firstArgument(SOURCE, m.index + m[0].length - 1);
    const rk = arg.match(ROW_KEY);
    if (rk) { rows.add(rk[2] ? `${rk[1]}.${rk[2]}` : rk[1]); continue; }
    let found = false;
    for (const lit of arg.matchAll(/"([^"]+)"/g)) { literals.add(lit[1]); found = true; }
    if (found) continue;
    // a bare identifier: resolve `const x = … ? "a" : "b";`
    const v = arg.match(/^([A-Za-z_]\w*)$/);
    if (v) {
      const decl = new RegExp("\\b(?:const|let)\\s+" + v[1] + "\\s*=\\s*([^;]+);", "g");
      for (const dm of SOURCE.matchAll(decl)) {
        for (const lit of dm[1].matchAll(/"([^"]+)"/g)) literals.add(lit[1]);
      }
    }
  }
  return { literals, rows };
}

function anchors(): { literals: Set<string>; rows: Set<string>; templates: Set<string> } {
  const literals = new Set<string>();
  const rows = new Set<string>();
  const templates = new Set<string>();
  for (const m of SOURCE.matchAll(/errAnchor\(\s*"([^"]+)"\s*\)/g)) literals.add(m[1]);
  for (const m of SOURCE.matchAll(/data-field="([^"]+)"/g)) literals.add(m[1]);
  for (const m of SOURCE.matchAll(/errAnchor\(\s*rowKey\(\s*"([^"]+)"\s*,\s*\w+\s*(?:,\s*"([^"]+)")?\s*\)\s*\)/g)) {
    rows.add(m[2] ? `${m[1]}.${m[2]}` : m[1]);
  }
  for (const m of SOURCE.matchAll(/errAnchor\(\s*`([^`]+)`\s*\)/g)) templates.add(m[1]);
  return { literals, rows, templates };
}

describe("CPPA Risk intake — every validation key has a data-field anchor", () => {
  const f = failKeys();
  const a = anchors();

  it("finds the validator keys (guards against the parser silently matching nothing)", () => {
    expect(f.literals.size).toBeGreaterThan(60);
    // Doc 262 §9.5 policy (2026-09-15): the three section_participants row
    // gates became notices, so the row-key floor drops from 15 to 14.
    expect(f.rows.size).toBeGreaterThanOrEqual(14);
  });

  it("every literal failure key is anchored", () => {
    const missing = [...f.literals].filter((k) => !a.literals.has(k)).sort();
    expect(missing, `fail() keys with no errAnchor/data-field: ${missing.join(", ")}`).toEqual([]);
  });

  it("every row-precise failure key has a row-level anchor", () => {
    const missing = [...f.rows].filter((k) => !a.rows.has(k)).sort();
    expect(missing, `rowKey() failures with no matching errAnchor(rowKey(...)): ${missing.join(", ")}`).toEqual([]);
  });

  it("the benefit template keys have template anchors", () => {
    for (const t of ["benefit_${g.slug}_identified", "a4_benefit_${g.slug}", "a4_benefit_${g.slug}_fact"]) {
      expect([...a.templates].some((x) => x === t), `no template anchor for ${t}`).toBe(true);
    }
    // the basis key is anchored through the group's basisKey variable
    expect(SOURCE.includes("errAnchor(g.basisKey)")).toBe(true);
  });
});

describe("CPPA Risk intake — grid rows let every control shrink", () => {
  it("no bracket grid with an fr track has a child control without min-w-0", () => {
    const lines = SOURCE.split("\n");
    const offenders: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/grid-cols-\[([^\]]+)\]/);
      if (!m || !m[1].includes("fr")) continue;
      let controls = 0;
      let shrinkable = 0;
      for (let j = i; j < Math.min(lines.length, i + 45); j++) {
        if (j > i && /grid-cols-\[/.test(lines[j])) break;
        if (/<(input|select|textarea|Input|Textarea|Select)\b/.test(lines[j])) controls++;
        if (/min-w-0/.test(lines[j])) shrinkable++;
      }
      if (controls > 0 && shrinkable < controls) offenders.push(`line ${i + 1} (${m[1]}): ${shrinkable}/${controls} controls can shrink`);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
