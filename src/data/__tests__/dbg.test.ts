import { it } from "vitest";
import { buildQuestionSet } from "@/data/us-notice-questions";
import { US_PREFILL_RULES } from "@/data/notice-prefill";
it("dbg", () => {
  const keys = new Set(buildQuestionSet(["CA","VA","CO","CT","TX","MD","FL","OR","MT","UT"]).map((q:any)=>q.key));
  for (const r of US_PREFILL_RULES) {
    if (!keys.has(r.target)) console.log("MISSING TARGET", r.target);
    for (const s of r.sources) if (!keys.has(s)) console.log("MISSING SOURCE", s);
  }
});
