// Absence-language recognition shared by every product's consistency checker
// (CSC): the literal sentences the machinery emits for a missing answer, the
// authored "not identified on the present record" class, the frame-body
// needles, and the views/transparency partial-discharge class.
//
// Extracted verbatim from dpia-csc.ts on 2026-09-16 (doc 266 INV-5): the
// non-DPIA checkers (LIA, Governance, ADMT, Cyber, IR, Biometric) imported
// these five names from dpia-csc.ts, which also imports the DPIA attestation
// deliverable and, through it, the whole DPIA deliverables build — over half
// a megabyte of DPIA-only source in every other product's deploy bundle.
// dpia-csc.ts re-exports the same names, so no importer changes behaviour.
//
// LAWS: deterministic, no model calls, no I/O.

import {
  ABSENCE_SCAFFOLDS,
  CAP_POOL_SENTENCES,
  GENERIC_ABSENCE,
  INFO_NEEDED_LITERAL,
  NEUTRAL_DOWNGRADE_LITERAL,
} from "../prose/frame-substitution.ts";
import type { FrameSet } from "../prose/frames.ts";

/**
 * Literal sentences produced by the machinery: emit-gate fallbacks, the cap
 * pools, and the neutral absence scaffolds. Their presence on a surface whose
 * record is complete is, by construction, a false statement about the record.
 */
export const MACHINE_ABSENCE_SENTENCES: readonly string[] = [
  INFO_NEEDED_LITERAL,
  NEUTRAL_DOWNGRADE_LITERAL,
  ...CAP_POOL_SENTENCES,
  ...ABSENCE_SCAFFOLDS,
  ...GENERIC_ABSENCE,
];

/**
 * "not identified on the present record"-class prose. Authored absence
 * language, whatever produced it.
 */
export const ABSENCE_CLASS_RE =
  /(not identified on the present record|does not name who prepared|nobody is recorded as|no one has signed this|is not formally validated on the present record|has not said who drafted|the record does not name|the approval date is blank|has not stated what a sign-off)/i;

/**
 * Fixed fragments of the product's frame bodies, so a rendered gap atom is
 * recognisable after placeholder substitution. A fragment must be long enough
 * that it cannot collide with ordinary prose.
 */
export function frameBodyNeedles(frameSet: FrameSet | null | undefined): string[] {
  const out: string[] = [];
  for (const f of frameSet?.frames ?? []) {
    const body = typeof f?.body === "string" ? f.body : "";
    if (!body) continue;
    for (const piece of body.split(/\{\{[^}]*\}\}/g)) {
      const frag = piece.replace(/\s+/g, " ").trim();
      if (frag.length >= 40) out.push(frag);
    }
  }
  return out;
}

/** True when `text` carries a machine-absence sentence or a gap-frame body. */
export function carriesAbsenceLanguage(text: string, needles: readonly string[]): string | null {
  const t = text.replace(/\s+/g, " ");
  for (const s of MACHINE_ABSENCE_SENTENCES) {
    if (t.includes(s)) return s;
  }
  for (const n of needles) {
    if (t.includes(n)) return n;
  }
  const m = ABSENCE_CLASS_RE.exec(t);
  return m ? m[0] : null;
}

/** ITEM 380 §4 — absence/partial-discharge language specific to the views and
 * transparency surfaces. */
export const PARTIAL_DISCHARGE_RE =
  /(partially discharged|partly discharged|only partially|not (?:been )?(?:fully )?discharged|no views (?:were )?(?:sought|recorded)|views were not sought|were not consulted|the record does not (?:record|state) (?:the )?views|not (?:been )?told|individuals are not informed)/i;
