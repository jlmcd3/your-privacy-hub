import { derivePlan } from "./derive.ts";
import { renderTemplate } from "./pass2-render.ts";
const plan = derivePlan({ intake: { q1_revenue: "1000000" }, report_data: {}, buildStamp: "x" });
console.log("bindings:", JSON.stringify(plan.citation_bindings));
const r = renderTemplate("T.risk.applicability.engaged", plan);
console.log("result:", JSON.stringify(r));
