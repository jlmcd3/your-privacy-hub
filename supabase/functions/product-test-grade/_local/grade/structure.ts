// product-test-grade — structure family (doc 272 §6.1).
//
// Pure function over (tool, intake, output). No lint import here — L-ENUM
// (raw intake keys, undefined/NaN/null, unfilled slots, UUIDs) is
// implemented directly in this family per the brief; cross-block.ts runs the
// OTHER lint rules (L-XREF, L-PROMISE, L-LABEL, L-DUP, L-CITE, L-QUOTE,
// L-LEADIN, L-CELL, L-DATE) and explicitly excludes L-ENUM hits so the two
// families never double-report the same defect under two check_ids.

import type { Check, ProductTestTool } from "../types.ts";
import { SKELETON_TOOLS } from "../variants/contracts-registry.ts";
import { customerTextOf } from "./text-extract.ts";

// Explicit floors lifted from the frontend battery (src/lib/tests/
// assertionTests.ts): "dpa-document-length" (:317, >2000) and
// "ir-length-adequate" (:367, >3000). No other tool carries an authored
// floor in that file; DEFAULT_TEXT_LENGTH_FLOOR is this module's own
// conservative default for the rest, and is intentionally low so it never
// fails a legitimately short document (e.g. a thin/blank-required variant)
// on length alone — the record-fidelity checks are what should catch a
// thinned record, not this floor.
const TEXT_LENGTH_FLOOR: Partial<Record<ProductTestTool, number>> = {
  "dpa": 2000,
  "ir-playbook": 3000,
};
const DEFAULT_TEXT_LENGTH_FLOOR = 800;

const LEAK_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bundefined\b/g, "undefined_leak"],
  [/\bNaN\b/g, "nan_leak"],
  [/\bnull\b(?![a-z-])/gi, "null_leak"],
  [/\[object Object\]/g, "object_leak"],
  [/\{\{[^}]*\}\}|\$\{[^}]*\}|\{[a-z_]+\}/g, "unfilled_slot"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "uuid_leak"],
];

function firstMatch(re: RegExp, text: string): string | null {
  re.lastIndex = 0;
  const m = re.exec(text);
  return m ? m[0] : null;
}

/** A raw intake key (snake_case, length > 3) appearing verbatim as a token
 *  in the customer text — the leak L-ENUM calls "raw enum / intake key". */
function intakeKeyLeak(intake: Record<string, unknown>, text: string): string | null {
  const keys = Object.keys(intake ?? {}).filter((k) => k.includes("_") && k.length > 3);
  for (const k of keys) {
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(text)) return k;
  }
  return null;
}

interface SkeletonSectionLike {
  readonly id?: string;
  readonly paragraphs?: readonly unknown[];
}

export function checkStructure(
  tool: ProductTestTool,
  intake: Record<string, unknown>,
  output: Record<string, unknown>,
): Check[] {
  const checks: Check[] = [];
  const { text } = customerTextOf(tool, output);

  if (SKELETON_TOOLS.has(tool)) {
    const doc = output?.skeleton_document as { sections?: readonly SkeletonSectionLike[] } | undefined;
    const sections = Array.isArray(doc?.sections) ? doc!.sections! : [];

    checks.push({
      check_id: "structure.skeleton_present",
      family: "structure",
      severity: "editorial",
      passed: sections.length >= 1,
      expected: ">=1 section",
      actual: `${sections.length} section(s)`,
    });

    const emptySections = sections.filter(
      (s) => !Array.isArray(s.paragraphs) || s.paragraphs.length === 0,
    );
    checks.push({
      check_id: "structure.no_empty_section",
      family: "structure",
      severity: "high",
      passed: emptySections.length === 0,
      block_key: emptySections[0]?.id,
      expected: "no section renders zero paragraphs",
      actual: emptySections.length
        ? `${emptySections.length} empty section(s); first "${emptySections[0]?.id ?? "?"}"`
        : "none",
    });
  }

  for (const [re, id] of LEAK_PATTERNS) {
    const hit = firstMatch(re, text);
    checks.push({
      check_id: `structure.leak.${id}`,
      family: "structure",
      severity: "critical",
      passed: !hit,
      quote: hit ?? undefined,
      expected: "absent from customer text",
      actual: hit ?? "absent",
    });
  }

  const keyHit = intakeKeyLeak(intake, text);
  checks.push({
    check_id: "structure.leak.raw_intake_key",
    family: "structure",
    severity: "critical",
    passed: !keyHit,
    quote: keyHit ?? undefined,
    expected: "no raw intake key token in customer text",
    actual: keyHit ?? "absent",
  });

  const openCurly = (text.match(/“/g) ?? []).length;
  const closeCurly = (text.match(/”/g) ?? []).length;
  checks.push({
    check_id: "structure.balanced_quotes",
    family: "structure",
    severity: "editorial",
    passed: openCurly === closeCurly,
    expected: `${openCurly} opening curly quotes`,
    actual: `${closeCurly} closing curly quotes`,
  });

  const floor = TEXT_LENGTH_FLOOR[tool] ?? DEFAULT_TEXT_LENGTH_FLOOR;
  checks.push({
    check_id: "structure.text_length_floor",
    family: "structure",
    severity: "editorial",
    passed: text.length > floor,
    expected: `> ${floor} chars`,
    actual: `${text.length} chars`,
  });

  return checks;
}
