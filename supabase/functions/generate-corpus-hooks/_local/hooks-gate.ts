// Validation door into the canonical atom grammar for the doc 213 hook
// pipeline. `_shared/corpus/rule-types.ts` may only be imported by
// rule-pass.ts, *-gate.ts / *-gates.ts, or tests (doc 206/207 boundary) —
// this is the hook generator's *-gate.ts. The generator validates candidate
// atoms against the CANONICAL grammar here rather than pattern-matching atom
// strings itself (rule-types.ts: "parseAtom is the only parser").
export { parseAtom } from "../../_shared/corpus/rule-types.ts";
export type { ParsedAtom } from "../../_shared/corpus/rule-types.ts";
