// CYBER CORPUS ATTACHMENT — Conversion C1.3 (doc 67 §2 "Corpus wiring").
//
// Pure function: the CAM + the set of components whose finding section
// renders in this document -> one S4 commentary entry per rendered
// component, using the CAM's own ratified frame constants
// (CYBER_S4_FRAMES). No text similarity, no model call, no runtime DB
// query — `attachCorpusRows`' set-inclusion mechanism (doc 48 §II.2a law 2,
// the determinism law) is the only selection logic. This is the function
// doc 24a §7.3 named as "the one genuinely new corpus-attachment function
// C1 must write."
//
// RENDER_WHEN NOTE (doc 67 §2, C1.3): all 18 components always render in
// spine section 4 ("The eighteen components, one at a time"), so S4
// commentary attaches whenever its component's finding section does —
// deliberately no narrower gate to mis-gate on (the class of near-miss the
// ADMT C1 landing found, where a real in-scope case routed through
// OUT_OF_SCOPE and made its own S4 content unreachable).
//
// FACTOR_ID NOTE: the CAM's factor_id values were curated (Wave C3,
// 2026-08-23) against components.ts's PRE-Item-315 `prior_label`, not the
// current statute-derived `label`, for 4 of the 15 populated components
// (c2, c6, c9, c14 — confirmed by direct cross-check against every S4 row;
// zero orphans either way). Both fields are accepted as valid keys below
// so this map is not blocked on a re-curation pass just to catch up with
// the rekey — confirm at the C2 redline per doc 67 §3's non-blocking list.
//
// FRAME COMPOSITION: CYBER_S4_FRAMES's three constants are ratified clause
// FRAGMENTS (byte-identical to the shipped prompt-law sentences, per the
// CAM file's own header), not complete sentences — F_INTRO ends without a
// period (a label expecting ": <excerpt>" to follow) and F_BRIDGE opens
// lowercase (a clause expecting to append to a preceding sentence). The
// splice points below follow directly from that shape; only F_GEN is a
// complete standalone sentence, used verbatim for a component with zero
// attached rows.

import { attachCorpusRows } from "../../../_shared/corpus/cam-attach.ts";
import { CYBER_CORPUS_MAP, CYBER_S4_FRAMES } from "../corpus/maps/cyber-corpus-map.ts";
import { CYBER_7123_COMPONENTS } from "./cppa-cyber-deliverables/components.ts";

export interface CyberS4CommentaryEntry {
  readonly slug: string;
  readonly citation: string;
  /** One or more fully composed sentences. Never empty — a component with
   * no attached FC row gets exactly the F_GEN sentence, so every rendered
   * component has exactly one entry, always with ≥1 commentary string. */
  readonly commentary: readonly string[];
}

const ALL_SLUGS: readonly string[] = CYBER_7123_COMPONENTS.map((c) => c.slug);

function isBridged(row: { curation_note: string }): boolean {
  return row.curation_note.includes("F-BRIDGE");
}

/** F_INTRO's "§ [n]" placeholder -> the component's own citation, which
 * already carries its own "§" (e.g. "11 CCR § 7123(c)(1)"). */
function composeIntro(citation: string): string {
  return CYBER_S4_FRAMES.F_INTRO.replace("§ [n]", citation);
}

/** F_BRIDGE's "[the control's fsor_citation]" placeholder -> the
 * component's citation; capitalized and closed as a parenthetical, since
 * it appends to the excerpt sentence it qualifies. */
function composeBridgeCaveat(citation: string): string {
  const clause = CYBER_S4_FRAMES.F_BRIDGE.replace(
    "[the control's fsor_citation]",
    citation,
  );
  return ` (${clause.charAt(0).toUpperCase()}${clause.slice(1)}.)`;
}

/**
 * All rendered components, one entry each, in `CYBER_7123_COMPONENTS`
 * order (c1..c18). `renderedSlugs` names the slugs whose finding section
 * is actually assembled in THIS document — pass all 18 in production
 * (the render_when note above: no narrower gate exists yet); a partial
 * set is accepted so unit tests can exercise a single component.
 */
export function attachCyberCorpus(
  renderedSlugs: ReadonlySet<string> = new Set(ALL_SLUGS),
): readonly CyberS4CommentaryEntry[] {
  const out: CyberS4CommentaryEntry[] = [];
  for (const comp of CYBER_7123_COMPONENTS) {
    if (!renderedSlugs.has(comp.slug)) continue;
    // Token is "c{number}_component_rendered" — the component's ENUMERATION
    // NUMBER, not its slug (the slug carries a descriptive suffix, e.g.
    // "c1_auth", that the CAM's render_when tokens never include).
    const fired = new Set([`c${comp.number}_component_rendered`]);
    const rows = attachCorpusRows(CYBER_CORPUS_MAP, "S4", fired)
      .filter((r) => r.role === "FC");
    if (rows.length === 0) {
      out.push({ slug: comp.slug, citation: comp.citation, commentary: [CYBER_S4_FRAMES.F_GEN] });
      continue;
    }
    const commentary = rows.map((row) => {
      const text = `${composeIntro(comp.citation)}: ${row.pinned_excerpt}`;
      return isBridged(row) ? text + composeBridgeCaveat(comp.citation) : text;
    });
    out.push({ slug: comp.slug, citation: comp.citation, commentary });
  }
  return out;
}
