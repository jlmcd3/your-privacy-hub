import { it } from "vitest";
import { buildQuestionSet } from "@/data/us-notice-questions";
import { US_PREFILL_RULES } from "@/data/notice-prefill";
it("dbg", () => {
  const keys = new Set(buildQuestionSet(["US_CA","US_VA","US_CO","US_CT","US_TX","US_MD","US_FL","US_OR","US_MT","US_UT"]).map((q:any)=>q.key));
  for (const r of US_PREFILL_RULES) {
    if (!keys.has(r.target)) console.log("MISSING TARGET", r.target);
    for (const s of r.sources) if (!keys.has(s)) console.log("MISSING SOURCE", s);
  }
});
