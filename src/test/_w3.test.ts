import { describe, it } from "vitest";
import { coachEmptyAskedKeys } from "@/lib/intakeCoach/askedKeys";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import { CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk";
describe("t",()=>{it("d",()=>{for(const fx of CPPA_RISK_GOLDEN as any[])console.log("@@",fx.id,coachEmptyAskedKeys(COACH_CONTRACTS.cppa_risk as any, fx.intake).join(","));});});
