import { loadCyberProvisionRows } from "/dev-server/src/registry/__tests__/corpus-client";
import { derive7123Components, normalizeCorpusText, textAtPath } from "/dev-server/supabase/functions/run-cppa-cybersecurity/_local/registry/cyber-verified-authorities";
import { readFileSync } from "node:fs";

const old = readFileSync("/tmp/old-registry.ts","utf8");
const OLDQ: Record<number,string> = {};
const re = /subsection: "11 CCR \\u00a7 7123\(c\)\((\d+)\)",\s*\n\s*verbatim_quote: "((?:\\.|[^"\\])*)"/g;
let m; while ((m = re.exec(old))) OLDQ[Number(m[1])] = JSON.parse('"'+m[2]+'"');

(async () => {
  const rows = await loadCyberProvisionRows();
  if (!rows) { console.log("NO CORPUS"); return; }
  const comps = derive7123Components(String(rows["cppa-7123"].verbatim_excerpt));
  console.log("derived count:", comps.length);
  for (const c of comps) {
    const oldq = normalizeCorpusText(OLDQ[c.number] ?? "");
    const status = !oldq ? "MISSING-OLD" : c.verbatim === oldq ? "IDENTICAL" : c.verbatim.startsWith(oldq) ? "OLD-IS-PREFIX" : c.verbatim.includes(oldq) ? "OLD-IS-SUBSTRING" : "DIVERGENT";
    console.log(`\n(${c.number}) ${status}`);
    console.log("  OLD: " + oldq);
    console.log("  NEW: " + c.verbatim);
  }
  console.log("\n=== 7124 ===");
  for (const p of ["a","b","c","d"]) console.log(p+": "+textAtPath(String(rows["cppa-7124"].verbatim_excerpt), p));
  console.log("\n7124 reqs:", JSON.stringify(rows["cppa-7124"].plain_requirements, null, 1));
  console.log("\n=== 7122 a,g ===");
  for (const p of ["a","g"]) console.log(p+": "+textAtPath(String(rows["cppa-7122"].verbatim_excerpt), p));
  console.log("\n=== 7123 b,f ===");
  for (const p of ["b","f"]) console.log(p+": "+textAtPath(String(rows["cppa-7123"].verbatim_excerpt), p));
})();
