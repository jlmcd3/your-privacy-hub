import { describe, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveCyberAuthorities, normalizeCorpusText } from "/dev-server/supabase/functions/run-cppa-cybersecurity/_local/registry/cyber-verified-authorities.ts";
import { makeCorpusProvisionClient, loadCyberProvisionRows } from "/dev-server/src/registry/__tests__/corpus-client";
describe("parity", () => {
  it("old vs new", async () => {
    const old = readFileSync("/tmp/cyber/old-registry.ts", "utf8");
    const rows = await loadCyberProvisionRows();
    const src = await resolveCyberAuthorities(makeCorpusProvisionClient(rows!) as never);
    const oldQuotes: Record<string,string> = {};
    const re = /proposition_key:\s*"([a-z0-9_]+)"[\s\S]*?verbatim_quote:\s*([`"])([\s\S]*?)\2/g;
    let m; while ((m = re.exec(old))) oldQuotes[m[1]] = normalizeCorpusText(m[3].replace(/\\n/g," ").replace(/\\"/g,'"'));
    let same=0; const diff:string[]=[]; const missing:string[]=[];
    for (const [k,row] of Object.entries(src.registry)) {
      const o = oldQuotes[k];
      if (!o) { missing.push(k); continue; }
      if (o === row.verbatim_quote) same++; else diff.push(`${k}\n  OLD: ${o}\n  NEW: ${row.verbatim_quote}`);
    }
    console.log("OLD KEYS", Object.keys(oldQuotes).length, "IDENTICAL", same, "DIFFERENT", diff.length, "NOT-IN-OLD", missing);
    console.log(diff.slice(0,20).join("\n"));
  }, 60000);
});
