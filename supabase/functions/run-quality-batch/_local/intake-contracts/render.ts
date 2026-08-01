// RC-REM-P2 — renderContractPrompt.
//
// Serializes an IntakeContract into a deterministic generator-prompt block
// used by run-quality-batch's Claude intake generator. The output is
// contract-derived (never hand-typed prose) so QL2 can never drift from the
// form again — every enum option is verbatim, every required/conditional
// gate is stated, and array-shape ("[]") is explicit.
//
// Scenario coaching (sector mix, posture mix) is NOT emitted here — that
// lives in a per-tool scenario_guidance map alongside the caller. This
// function emits ONLY the schema contract.

import type { IntakeContract, IntakeField } from "./types.ts";

function fmtOptions(opts: readonly string[]): string {
  // JSON.stringify keeps quotes verbatim → the LLM cannot subtly re-word
  // an option like "1000+" ↔ "1001+".
  return JSON.stringify(opts);
}

function renderField(f: IntakeField): string {
  const bits: string[] = [];
  bits.push(`- \`${f.key}\``);
  bits.push(`kind=${f.kind}`);
  bits.push(`required=${f.required}`);
  if (f.options && (f.kind === "enum" || f.kind === "multi-enum")) {
    bits.push(`options=${fmtOptions(f.options)}`);
  }
  if (f.requiredWhen) {
    bits.push(`requiredWhen: ${f.requiredWhen}`);
  }
  if (f.hiddenValue !== undefined) {
    bits.push(`hiddenValue when gated off: ${JSON.stringify(f.hiddenValue)}`);
  }
  return bits.join("  ");
}

export function renderContractPrompt(contract: IntakeContract): string {
  const lines: string[] = [];
  lines.push(
    `Return intake objects matching the "${contract.tool_type}" contract EXACTLY. ` +
      `The contract is derived directly from the form code — do NOT invent, rename, or omit keys, ` +
      `and do NOT substitute paraphrased option strings. Unknown top-level keys are rejected.`,
  );
  lines.push("");
  lines.push("Fields (each line is one field):");
  for (const f of contract.fields) {
    lines.push(renderField(f));
  }
  lines.push("");
  lines.push(
    'Key syntax: dotted paths address nested objects (e.g. "profile.entity_name"); ' +
      'a segment ending in "[]" is an array of records where the fields nested below the "[]" ' +
      "apply to every element.",
  );
  lines.push(
    "kind semantics: " +
      '"enum" → a single string that is one of options VERBATIM. ' +
      '"multi-enum" → an array of strings, each one of options VERBATIM (no free text). ' +
      '"text" → a short string. ' +
      '"narrative" → a longer descriptive string (≥ 40 chars where meaningful). ' +
      '"boolean" → true or false. ' +
      '"date" → an ISO date string. ' +
      '"string-array" → a JSON array of strings (never an object); each element is a non-empty string. If options are listed, each element must be one of options VERBATIM or begin with "Other: " followed by free text. ' +
      '"structured" → an object or array whose internal shape the contract does not further constrain here.',
  );
  lines.push(
    "required semantics: " +
      '"always" → must be present and non-empty. ' +
      '"conditional" → required iff requiredWhen holds; when gated off, emit hiddenValue (typically "" or null). ' +
      '"optional" → may be omitted or empty.',
  );
  return lines.join("\n");
}
