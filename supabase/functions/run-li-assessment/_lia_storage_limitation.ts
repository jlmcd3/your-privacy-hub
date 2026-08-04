// LIA STORAGE-LIMITATION CROSS-READ (CEO defect 1, run 33e79a31 / doc 4d610d79).
//
// The necessity/storage-limitation analysis predates the upgrade-4 retention
// field and could assert that "no retention period or deletion trigger is
// stated" while the record carried balancing_details.duration. The prompt now
// cross-reads that field; this module is the deterministic backstop that runs
// after generation so a model lapse cannot ship the false absence.
//
// Behaviour:
//   - retention absent from the record  -> no change (existing degradation stands)
//   - retention present on the record   -> absence claims in the necessity test
//     are replaced with a sentence that engages with what the record states.

export function retentionOnRecord(intake: unknown): string {
  const rec = (intake ?? {}) as Record<string, any>;
  const bal = (rec.balancing_details ?? {}) as Record<string, any>;
  const nec = (rec.necessity_details ?? {}) as Record<string, any>;
  const candidates = [
    bal.duration,
    bal.retention_period,
    nec.retention_period,
    nec.retention,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

/** Sentence-level claim that retention / storage limitation is undocumented. */
export const RETENTION_ABSENCE_RE =
  /(?:no|not?\b[^.]{0,40}\b)?(?:specific\s+)?(?:retention period|retention periods|deletion trigger|deletion triggers|storage[- ]limitation|storage limitation)[^.]{0,200}?(?:is|are|was|were)?\s*(?:not\s+(?:stated|specified|documented|recorded|given|present)|undocumented|unstated|not\s+on\s+the\s+record)|(?:no\s+(?:specific\s+)?retention period[^.]{0,200})/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z\[(])/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function engagedSentence(retention: string): string {
  return `The record states the retention applied to this processing — ${retention} — so storage limitation under Article 5(1)(e) is addressed by the record rather than absent from it; where a category's deletion trigger is not separately stated, that trigger, and not the period, is what remains to be written down.`;
}

export type StorageLimitationResult = {
  changed: boolean;
  retention: string;
  replacements: number;
};

/**
 * Rewrites false storage-limitation absence claims in the necessity test when
 * the record carries a retention statement. Mutates `report` in place.
 */
export function enforceStorageLimitationCrossRead(
  report: unknown,
  intake: unknown,
): StorageLimitationResult {
  const retention = retentionOnRecord(intake);
  const rd = (report ?? {}) as Record<string, any>;
  const nt = rd?.necessity_test as Record<string, any> | undefined;
  if (!retention || !nt || typeof nt !== "object") {
    return { changed: false, retention, replacements: 0 };
  }

  let replacements = 0;
  const engaged = engagedSentence(retention);

  if (typeof nt.analysis === "string" && nt.analysis.trim()) {
    const sentences = splitSentences(nt.analysis);
    let injected = false;
    const out: string[] = [];
    for (const s of sentences) {
      if (RETENTION_ABSENCE_RE.test(s)) {
        replacements++;
        if (!injected) {
          out.push(engaged);
          injected = true;
        }
        continue;
      }
      out.push(s);
    }
    if (replacements > 0) nt.analysis = out.join(" ");
  }

  for (const key of ["risk_factors", "open_questions"]) {
    const arr = nt[key];
    if (!Array.isArray(arr)) continue;
    const kept = arr.filter(
      (x: unknown) => !(typeof x === "string" && RETENTION_ABSENCE_RE.test(x)),
    );
    if (kept.length !== arr.length) {
      replacements += arr.length - kept.length;
      nt[key] = kept;
    }
  }

  return { changed: replacements > 0, retention, replacements };
}
