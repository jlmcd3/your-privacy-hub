import { derivePlan } from "../../supabase/functions/run-cppa-risk-assessment/_local/ltp/derive.ts";
import { composePriorityActionsForTest } from "../../supabase/functions/run-cppa-risk-assessment/_local/ltp/section-composers/cppa-risk.ts";
const plan = derivePlan({ intake: { q1_revenue: "10000000", q2_consumers: "50000", q18_admt_use: "no" }, report_data: {}, buildStamp: "d" });
const actions = composePriorityActionsForTest(plan);
for (const a of actions) {
  const s = String(a.ctx.element_short_label);
  if (/admt|automat|profil/i.test(s)) console.log("LEAK:", s);
}
