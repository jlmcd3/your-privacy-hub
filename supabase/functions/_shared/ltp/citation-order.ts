// FLEET ToA CITATION ORDERING (CEO-ratified 2026-08-26, resolving the
// fleet-standing "ToA numeric pinpoint ordering" item filed from the DPIA
// batch-2 PDFs: the 35-group rendered "Art. 35(11), (7), (7)(a), (7)(b),
// (7)(c), (7)(d), (9)" because a lexicographic `.sort()` compares "(11)"
// before "(7)" character-wise).
//
// THE RATIFIED RULE: within a Table of Authorities group, citations order
// NUMERIC-ASCENDING on every embedded number (7 before 11), with letters
// after numbers inside the same paragraph ("(7)" before "(7)(a)" before
// "(7)(b)"). Text runs compare lexicographically; digit runs compare as
// numbers. Pure presentation — no citation text is altered.
//
// Consumers: dpiaToa (dpia-skeleton-assemble.ts) and renderLiaToa
// (lia-skeleton-assemble.ts) — the two sites confirmed carrying the
// lexicographic defect. Any future ToA builder that sorts citation strings
// uses this comparator, not `.sort()`.

/** Split a citation into alternating text/number segments ("Art. 35(7)(a)"
 * → ["Art. ", 35, "(", 7, ")(a)"]). */
function citationSegments(s: string): (string | number)[] {
  const out: (string | number)[] = [];
  for (const m of String(s).matchAll(/(\d+)|(\D+)/g)) {
    out.push(m[1] !== undefined ? Number(m[1]) : m[2]);
  }
  return out;
}

/** Natural-order comparator for citation strings: digit runs compare
 * numerically, text runs lexicographically, a prefix sorts before its
 * extensions. Deterministic and total. */
export function naturalCitationCompare(a: string, b: string): number {
  const ax = citationSegments(a);
  const bx = citationSegments(b);
  const n = Math.max(ax.length, bx.length);
  for (let i = 0; i < n; i++) {
    const s = ax[i];
    const t = bx[i];
    if (s === undefined) return -1;
    if (t === undefined) return 1;
    if (typeof s === "number" && typeof t === "number") {
      if (s !== t) return s - t;
    } else if (typeof s === "number") {
      // A number where the other side has text: the numbered form sorts
      // first ("Art. 9" before "Art. 9A" resolves via prefix rule above;
      // this branch covers mixed shapes deterministically).
      return -1;
    } else if (typeof t === "number") {
      return 1;
    } else {
      const c = s < t ? -1 : s > t ? 1 : 0;
      if (c !== 0) return c;
    }
  }
  return 0;
}
