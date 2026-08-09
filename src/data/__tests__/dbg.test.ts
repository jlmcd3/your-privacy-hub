import { it } from "vitest";
import { buildEuQuestionSections } from "@/data/eu-notice-questions";
import { EU_PREFILL_RULES } from "@/data/notice-prefill";
it("dbg", () => {
  const keys = new Set(buildEuQuestionSections(["GDPR","UK_GDPR","LGPD","APPI","DPDPA","POPIA","PIPEDA"] as never).flatMap((s:any)=>s.questions).map((q:any)=>q.key));
  for (const r of EU_PREFILL_RULES) {
    if (!keys.has(r.target)) console.log("MISSING TARGET", r.target);
    for (const s of r.sources) if (!keys.has(s)) console.log("MISSING SOURCE", s);
  }
});
