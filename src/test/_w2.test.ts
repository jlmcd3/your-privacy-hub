import { describe, it } from "vitest";
import { spotText } from "@/lib/intakeCoach/buildCoach";
import { THIN_SPOTS } from "@/lib/intakeCoach/thinSpots";
import { DPIA_PERFECT } from "../../supabase/functions/_shared/golden/dpia";
import { CPPA_RISK_PERFECT, CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk";
describe("t", () => { it("d", () => {
  const uk:any = (DPIA_PERFECT as any)[1], eu:any=(DPIA_PERFECT as any)[0];
  for (const k of ["supporting_assets","retention_period","necessity_proportionality"]) {
    const s = THIN_SPOTS.dpia.find(x=>x.key===k)!;
    console.log("###EU",k,"::",spotText(eu.intake,s));
    console.log("###UK",k,"::",spotText(uk.intake,s));
  }
  const rp:any=(CPPA_RISK_PERFECT as any)[0];
  for (const k of ["a4_benefit_business","a4_benefit_consumer","a4_benefit_other_stakeholders","a4_benefit_public","a6_safeguards","exceptions_intake"]) {
    const s = THIN_SPOTS.cppa_risk.find(x=>x.key===k)!;
    console.log("###RP",k,"::",JSON.stringify(spotText(rp.intake,s)));
    console.log("###RG",k,"::",JSON.stringify(spotText((CPPA_RISK_GOLDEN as any)[0].intake,s)));
  }
  console.log("###FACTS", JSON.stringify({b:(rp.intake as any).a4_benefit_business_fact,c:(rp.intake as any).a4_benefit_consumer_fact,o:(rp.intake as any).a4_benefit_other_stakeholders_fact,p:(rp.intake as any).a4_benefit_public_fact}));
}); });
