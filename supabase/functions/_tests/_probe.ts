import { buildSystemContent } from "../_shared/prompt-core.ts";
import { CPPA_RISK_TOOL_MODULE } from "../run-cppa-risk-assessment/index.ts";
import { ADMT_TOOL_MODULE } from "../run-admt-checker/index.ts";
import { CPPA_CYBER_TOOL_MODULE } from "../run-cppa-cybersecurity/index.ts";
const injected = "ENFORCEMENT CONTEXT:\n(none)";
for (const [name, tm] of [["risk",CPPA_RISK_TOOL_MODULE],["admt",ADMT_TOOL_MODULE],["cyber",CPPA_CYBER_TOOL_MODULE]] as any) {
  const b = buildSystemContent({ toolModule: tm, currentDate: "2026-06-26", injected: name==="cyber"?undefined:injected });
  console.log(name, "N=", b.length);
  b.forEach((x,i)=>console.log("  b"+i, "cache="+x.cache_control?.type, "amEN="+x.text.includes("American English"), "USEN="+x.text.includes("US English"), "NOADAPT="+x.text.includes("NO ADAPTIVE GUIDANCE"), "7152="+x.text.includes("§ 7152 MAPPING"), "SIGDEC="+x.text.includes("SIGNIFICANT-DECISION"), "PHASEIN="+x.text.includes("PHASE-IN")));
}
