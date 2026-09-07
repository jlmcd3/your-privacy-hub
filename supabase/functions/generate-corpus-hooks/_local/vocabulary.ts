// DOC 213 §2 — the CLOSED atom vocabulary a hook may be expressed in.
//
// Pure. No I/O. `parseAtom` (the canonical grammar) is the only parser; this
// module decides membership only. An atom outside this vocabulary is never
// written to a hook row — it fails `vocabulary_checks_passed`.

import { parseAtom } from "./hooks-gate.ts";
import type { HookProductVocabulary } from "./product-registry.ts";

/** Closed option sets for the `state:intake.` paths doc 213 admits. */
export const STATE_ATOM_ENUMS: Readonly<Record<string, readonly string[]>> = {
  "intake.balancing_details.opt_out_available": [
    "Yes — unconditional, on request, with no consequence",
    "Yes — but conditional or subject to review",
    "No opt-out is available",
  ],
  "intake.balancing_details.special_category_data": ["true", "false"],
  "intake.balancing_details.children_data_subjects": ["true", "false"],
  "intake.balancing_details.art9_condition": [
    "Explicit consent (Art. 9(2)(a))",
    "Employment, social security or social protection law (Art. 9(2)(b))",
    "Vital interests (Art. 9(2)(c))",
    "Not-for-profit body's legitimate activities (Art. 9(2)(d))",
    "Data manifestly made public by the individual (Art. 9(2)(e))",
    "Legal claims or judicial acts (Art. 9(2)(f))",
    "Substantial public interest (Art. 9(2)(g))",
    "Health or social care (Art. 9(2)(h))",
    "Public health (Art. 9(2)(i))",
    "Archiving, research or statistics (Art. 9(2)(j))",
    "None identified",
    "Not yet assessed",
  ],
  "intake.purpose_details.marketing_channels.automated_calls": ["true", "false"],
  "intake.purpose_details.marketing_channels.live_calls": ["true", "false"],
  "intake.purpose_details.marketing_channels.email_sms": ["true", "false"],
  "intake.purpose_details.marketing_channels.post": ["true", "false"],
  "intake.purpose_details.marketing_channels.online_advertising": ["true", "false"],
  "intake.purpose_details.marketing_channels.none": ["true", "false"],
  "intake.necessity_details.achievable_without_personal_data": [
    "Yes — the purpose could be achieved without personal data, or with anonymised or synthetic data",
    "No — personal data is required (explain why below)",
    "Not assessed",
  ],
};

/** `state:` paths admitted with an open value (no closed option set). */
export const OPEN_STATE_PATHS: readonly string[] = [
  "intake.purpose_details.interest_type",
];

export interface AtomCheck {
  readonly ok: boolean;
  readonly error?: string;
}

/**
 * A hook atom is one of: flag / class / relationship / data_category /
 * instrument / state. `verdict:` atoms are REFUSED — a hook never sees, and
 * never speaks about, the engine's verdict on a customer record.
 */
export function checkAtom(atom: string, registry: HookProductVocabulary): AtomCheck {
  let parsed;
  try {
    parsed = parseAtom(atom);
  } catch (e) {
    return { ok: false, error: `atom "${atom}" does not parse: ${(e as Error).message}` };
  }
  const vocabulary = registry.typed_state_vocabulary;
  const inSet = (list: readonly string[]) => list.includes(parsed.key);
  switch (parsed.kind) {
    case "flag":
      return inSet(vocabulary.flags) ? { ok: true } : { ok: false, error: `atom "${atom}": unknown flag` };
    case "class":
      return inSet(vocabulary.classes) ? { ok: true } : { ok: false, error: `atom "${atom}": unknown class` };
    case "relationship":
      return inSet(vocabulary.relationships)
        ? { ok: true }
        : { ok: false, error: `atom "${atom}": unknown relationship` };
    case "data_category":
      return inSet(vocabulary.data_categories)
        ? { ok: true }
        : { ok: false, error: `atom "${atom}": unknown data category` };
    case "instrument":
      return registry.instrument_scope.includes(parsed.key)
        ? { ok: true }
        : { ok: false, error: `atom "${atom}": instrument is not in scope for this product` };
    case "verdict":
      return { ok: false, error: `atom "${atom}": verdict atoms are never admitted in a hook` };
    case "state": {
      const options = STATE_ATOM_ENUMS[parsed.key];
      if (options) {
        return options.includes(parsed.value ?? "")
          ? { ok: true }
          : { ok: false, error: `atom "${atom}": value is not one of the closed options for this path` };
      }
      if (OPEN_STATE_PATHS.includes(parsed.key)) return { ok: true };
      return { ok: false, error: `atom "${atom}": state path is not in the hook vocabulary` };
    }
    default:
      return { ok: false, error: `atom "${atom}": unsupported atom kind` };
  }
}

export function checkAtoms(atoms: readonly string[], registry: HookProductVocabulary): string[] {
  const errors: string[] = [];
  for (const atom of atoms) {
    const check = checkAtom(atom, registry);
    if (!check.ok) errors.push(check.error!);
  }
  return errors;
}

/** The vocabulary, rendered for a prompt. Closed lists, verbatim. */
export function vocabularyBlock(registry: HookProductVocabulary): string {
  const v = registry.typed_state_vocabulary;
  const lines: string[] = [];
  lines.push("CLOSED ATOM VOCABULARY — an atom outside this list is rejected by code.");
  lines.push(`flag:<x> where x ∈ ${JSON.stringify(v.flags)}`);
  lines.push(`class:<x> where x ∈ ${JSON.stringify(v.classes)}`);
  lines.push(`relationship:<x> where x ∈ ${JSON.stringify(v.relationships)}`);
  lines.push(`data_category:<x> where x ∈ ${JSON.stringify(v.data_categories)}`);
  lines.push(`instrument:<x> where x ∈ ${JSON.stringify(registry.instrument_scope)}`);
  lines.push("state:<path>=<value> where path and value are exactly one of:");
  for (const [path, options] of Object.entries(STATE_ATOM_ENUMS)) {
    lines.push(`  state:${path}= one of ${JSON.stringify(options)}`);
  }
  for (const path of OPEN_STATE_PATHS) {
    lines.push(`  state:${path}=<free value taken from the source>`);
  }
  lines.push("verdict: atoms are FORBIDDEN. No customer record and no engine verdict is ever shown to you or written by you.");
  return lines.join("\n");
}
