import { governanceContract } from "./_shared/intake-contracts/governance-assessment.ts";
import { dpaGeneratorContract } from "./_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract } from "./_shared/intake-contracts/ir-playbook.ts";
import { biometricContract } from "./_shared/intake-contracts/biometric.ts";
import { registrationContract } from "./_shared/intake-contracts/registration-assessment.ts";
import { liAssessmentStageBContract } from "./_shared/intake-contracts/li-assessment.ts";
import { dpiaFrameworkContract } from "./_shared/intake-contracts/dpia-framework.ts";
import { cppaAdmtContract } from "./_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract } from "./_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "./_shared/intake-contracts/cppa-cybersecurity.ts";
const all:any = {governance:governanceContract,dpa:dpaGeneratorContract,irPlaybook:irPlaybookContract,biometric:biometricContract,registration:registrationContract,lia:liAssessmentStageBContract,dpia:dpiaFrameworkContract,cppaAdmt:cppaAdmtContract,cppaRisk:cppaRiskContract,cppaCyber:cppaCybersecurityContract};
for (const [n,c] of Object.entries<any>(all)) {
  console.log("=== "+n+" fields="+c.fields.length);
  for (const f of c.fields) {
    console.log(`  ${f.key} [${f.kind}/${f.required}]${f.options? " OPTIONS: "+f.options.map((o:string)=>JSON.stringify(o)).join(" | "):""}`);
  }
}
