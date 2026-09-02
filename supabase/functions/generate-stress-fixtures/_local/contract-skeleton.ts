// PANEL HARNESS — COMPLETE-RECORD CHECKLIST (2026-09-02).
//
// The hand-written JSON skeletons in the fixture prompts only ever named a
// SUBSET of each product's intake contract (e.g. the DPIA block asked for 18
// keys where dpia-framework.ts declares 55, and the CPPA Risk block asked for
// ~50 of 178). Everything omitted arrived at the product as an unanswered
// field, so the deterministic builders routed to record_insufficient /
// generic paths and the batch measured fixture sparseness rather than product
// quality.
//
// This module renders the contract's OWN required field list — dotted paths,
// array-of-record item keys, closed lists, conditional triggers and their
// hidden values — straight into the prompt. Derived, never hand-maintained:
// when a contract gains a field, the prompt gains it on the next deploy.

import type { IntakeContract, IntakeField } from "../../_shared/intake-contracts/types.ts";
import { governanceContract } from "../../_shared/intake-contracts/governance-assessment.ts";
import { dpaGeneratorContract } from "../../_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract } from "../../_shared/intake-contracts/ir-playbook.ts";
import { biometricContract } from "../../_shared/intake-contracts/biometric.ts";
import { registrationContract } from "../../_shared/intake-contracts/registration-assessment.ts";
import { liAssessmentStageBContract } from "../../_shared/intake-contracts/li-assessment.ts";
import { dpiaFrameworkContract } from "../../_shared/intake-contracts/dpia-framework.ts";
import { cppaAdmtContract } from "../../_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract } from "../../_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "../../_shared/intake-contracts/cppa-cybersecurity.ts";

const CHECKLIST_CONTRACTS: Record<string, IntakeContract> = {
  governance: governanceContract,
  dpa: dpaGeneratorContract,
  irPlaybook: irPlaybookContract,
  biometric: biometricContract,
  registration: registrationContract,
  lia: liAssessmentStageBContract,
  dpia: dpiaFrameworkContract,
  cppaAdmt: cppaAdmtContract,
  cppaRisk: cppaRiskContract,
  cppaCyber: cppaCybersecurityContract,
};

function typeHint(f: IntakeField): string {
  if (f.options?.length) {
    const many = f.kind !== "enum";
    return `${many ? "array — choose 1+" : "choose exactly 1"} VERBATIM from: ${
      f.options.map((o) => JSON.stringify(o)).join(" | ")
    }`;
  }
  switch (f.kind) {
    case "boolean": return "true or false";
    case "date": return "ISO date YYYY-MM-DD";
    case "string-array": return "array of 2-4 short strings";
    case "narrative": return "1-2 scenario-specific sentences";
    case "structured": return "array of records (see the [] keys under it)";
    default: return "short specific string";
  }
}

function line(f: IntakeField): string {
  const cond = f.required === "conditional"
    ? ` [conditional: ${f.requiredWhen ?? "see form logic"}; when not triggered emit ${
      JSON.stringify(f.hiddenValue ?? "")
    }]`
    : "";
  const item = f.itemKeys?.length
    ? ` [each record: ${f.itemKeys.map((k) => k.key + (k.note ? ` (${k.note})` : "")).join(", ")}]`
    : "";
  const note = f.shapeNote ? ` [${f.shapeNote}]` : "";
  return `  - ${f.key}: ${typeHint(f)}${item}${note}${cond}`;
}

/**
 * Render a per-object "COMPLETE RECORD" checklist for the given prompt object
 * names. Objects with no contract (usNotice, euNotice, ropa) are skipped —
 * their hand-written skeletons remain the spec.
 */
export function contractChecklist(objectNames: string[]): string {
  const blocks: string[] = [];
  for (const name of objectNames) {
    const contract = CHECKLIST_CONTRACTS[name];
    if (!contract) continue;
    const fields = contract.fields.filter((f) => f.required !== "optional");
    if (!fields.length) continue;
    blocks.push(`${name} — ${fields.length} keys:\n${fields.map(line).join("\n")}`);
  }
  if (!blocks.length) return "";
  return `

COMPLETE RECORD — EMIT EVERY KEY BELOW.
The JSON skeletons above show the SHAPE. The lists below are the FULL field set
each object must contain; a fixture that omits keys is a defective fixture and
the product under test then reports an incomplete record instead of exercising
its real logic. Rules:
- Emit every key listed for the object, in the object it is listed under.
- A dotted key ("profile.industry") means a nested object: {"profile": {"industry": ...}}.
- A key containing "[]" ("controls[].maturity") means an array of records; emit
  2-3 records (or one per listed control key) each carrying every "[]" sub-key
  listed for that array.
- Never emit null. Where a conditional field is not triggered by the scenario,
  emit the stated not-triggered value (usually an empty string).
- Closed lists are verbatim: copy the option string character for character.
- Keep every free-text value short, specific and consistent with the same
  company's other answers.

${blocks.join("\n\n")}`;
}
