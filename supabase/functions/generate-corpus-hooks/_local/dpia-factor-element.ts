// DOC 213 §2 pattern / DOC 232 — FACTOR → DPIA HOOK ELEMENT.
//
// A verbatim copy of `DPIA_FACTOR_ELEMENT` from the canonical
// run-dpia-framework/_local/corpus/maps/dpia-hooks.ts. Copied, not imported:
// doc 213 §2 forbids cross-function imports.
// tests/edge/corpus/doc232-dpia-factor-element-pin.test.ts pins this copy to
// the canonical map in both directions.
//
// A hook whose factor has no element here is EXCLUDED by name at
// generation — never emitted with a blank `bears_on_element`.

const F_OBLIGATION = "the Article 35 obligation to conduct this assessment";
const F_EMPLOYEE_MONITORING = "the employee-monitoring trigger";
const F_ALGORITHMIC = "the automated-decision trigger";
const F_ADEQUACY = "the necessity and proportionality analysis";
const F_BIOMETRIC_ADEQUACY = "the adequacy of the biometric-processing analysis";

export const DPIA_FACTOR_ELEMENT: Readonly<Record<string, "obligation" | "adequacy">> = {
  [F_OBLIGATION]: "obligation",
  [F_EMPLOYEE_MONITORING]: "obligation",
  [F_ALGORITHMIC]: "obligation",
  [F_ADEQUACY]: "adequacy",
  [F_BIOMETRIC_ADEQUACY]: "adequacy",
};

export function dpiaElementOf(factorId: string): "obligation" | "adequacy" | null {
  return DPIA_FACTOR_ELEMENT[factorId] ?? null;
}
